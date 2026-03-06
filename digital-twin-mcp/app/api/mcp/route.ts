import { queryVectors } from "@/lib/vector";
import { generateResponse } from "@/lib/groq";

export const runtime = 'nodejs';
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, per Vercel function instance)
// Public limit: 30 requests / minute per IP.
// Trusted clients (claude-desktop header or valid MCP_SHARED_SECRET) are exempt.
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

function isTrustedClient(request: Request): boolean {
  // Allow any client that self-identifies as claude-desktop.
  if (request.headers.get('x-mcp-client') === 'claude-desktop') return true;

  // Allow if the caller presents the shared secret (primary bypass mechanism).
  const sharedSecret = process.env.MCP_SHARED_SECRET;
  if (sharedSecret && request.headers.get('x-mcp-secret') === sharedSecret) return true;

  return false;
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true, retryAfter: 0 };
}

function rateLimitedResponse(retryAfter: number, id: unknown = null): Response {
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id,
    error: {
      code: -32000,
      message: `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
    },
  });
  return new Response(body, {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Retry-After': String(retryAfter),
      'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
      'X-RateLimit-Remaining': '0',
    },
  });
}
// ---------------------------------------------------------------------------

// Store SSE connections keyed by session ID
const sessions = new Map<string, (data: string) => void>();

// Handle JSON-RPC request and return a response object
async function handleJsonRpc(body: { jsonrpc: string; id: number | string; method: string; params?: Record<string, unknown> }) {
  if (body.method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id: body.id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'digital-twin-mcp', version: '1.0.0' },
      },
    };
  }

  if (body.method === 'notifications/initialized') {
    return null; // Notification, no response needed
  }

  if (body.method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id: body.id,
      result: {
        tools: [
          {
            name: 'query_digital_twin',
            description: 'Query the digital twin\'s professional profile using RAG. Searches the vector database and generates an AI response.',
            inputSchema: {
              type: 'object',
              properties: {
                question: { type: 'string', description: 'The question to ask about the professional profile' },
              },
              required: ['question'],
            },
          },
          {
            name: 'search_profile',
            description: 'Search the professional profile using semantic search. Returns raw matching chunks without AI generation.',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'The search query' },
                topK: { type: 'number', description: 'Number of results to return (1-10, default 3)' },
              },
              required: ['query'],
            },
          },
        ],
      },
    };
  }

  if (body.method === 'tools/call') {
    const params = body.params as { name: string; arguments: Record<string, unknown> };
    const { name, arguments: args } = params;

    try {
      if (name === 'query_digital_twin') {
        const { question } = args as { question: string };
        if (!question || typeof question !== 'string') {
          throw new Error('Invalid question parameter');
        }

        const results = await queryVectors(question, 5);

        if (!results || results.length === 0) {
          return {
            jsonrpc: '2.0', id: body.id,
            result: { content: [{ type: 'text', text: "I couldn't find relevant information to answer that question." }] },
          };
        }

        const context = results
          .map((result) => {
            const metadata = result.metadata as { title?: string; content?: string };
            return `[${metadata.title || 'Profile Section'}]\n${metadata.content || ''}`;
          })
          .join('\n\n');

        const response = await generateResponse({
          prompt: `Context from profile:\n\n${context}\n\nQuestion: ${question}\n\nProvide a clear, professional answer based on the context above.`,
          systemPrompt: 'You are a professional assistant representing the individual in their digital twin profile. Answer questions accurately based on the provided context.',
        });

        return {
          jsonrpc: '2.0', id: body.id,
          result: { content: [{ type: 'text', text: response }] },
        };
      } else if (name === 'search_profile') {
        const { query, topK = 3 } = args as { query: string; topK?: number };
        if (!query || typeof query !== 'string') {
          throw new Error('Invalid query parameter');
        }

        const limitedTopK = Math.min(Math.max(topK, 1), 10);
        const results = await queryVectors(query, limitedTopK);

        if (!results || results.length === 0) {
          return {
            jsonrpc: '2.0', id: body.id,
            result: { content: [{ type: 'text', text: `No results found for query: "${query}"` }] },
          };
        }

        const formattedResults = results
          .map((result, index) => {
            const metadata = result.metadata as { title?: string; content?: string; type?: string };
            return `Result ${index + 1} (relevance: ${(result.score * 100).toFixed(1)}%):\nTitle: ${metadata.title || 'Unknown'}\nType: ${metadata.type || 'N/A'}\n${metadata.content || 'No content available'}`;
          })
          .join('\n\n---\n\n');

        return {
          jsonrpc: '2.0', id: body.id,
          result: { content: [{ type: 'text', text: `Found ${results.length} relevant results:\n\n${formattedResults}` }] },
        };
      } else {
        throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        jsonrpc: '2.0', id: body.id,
        error: { code: -32000, message: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  return {
    jsonrpc: '2.0', id: body.id,
    error: { code: -32601, message: 'Method not found' },
  };
}

// GET: Establish SSE connection for mcp-remote
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = crypto.randomUUID();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send the endpoint URL as the first SSE event
      const endpointUrl = `${url.origin}${url.pathname}?sessionId=${sessionId}`;
      controller.enqueue(encoder.encode(`event: endpoint\ndata: ${endpointUrl}\n\n`));

      // Store the send function for this session
      sessions.set(sessionId, (data: string) => {
        try {
          controller.enqueue(encoder.encode(`event: message\ndata: ${data}\n\n`));
        } catch {
          sessions.delete(sessionId);
        }
      });

      // Clean up on abort
      request.signal.addEventListener('abort', () => {
        sessions.delete(sessionId);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
    cancel() {
      sessions.delete(sessionId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// POST: Handle JSON-RPC messages
export async function POST(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');

  // Apply rate limiting to untrusted clients.
  if (!isTrustedClient(request)) {
    const { allowed, retryAfter } = checkRateLimit(getClientIp(request));
    if (!allowed) {
      return rateLimitedResponse(retryAfter);
    }
  }

  try {
    const body = await request.json();
    const response = await handleJsonRpc(body);

    // If there's an active SSE session, send via SSE
    if (sessionId && sessions.has(sessionId)) {
      if (response) {
        const sendSSE = sessions.get(sessionId)!;
        sendSSE(JSON.stringify(response));
      }
      return new Response(null, {
        status: 202,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Fallback: direct JSON response (for testing)
    if (!response) {
      return new Response(null, {
        status: 204,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('MCP API Error:', error);
    const errorResponse = {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: error instanceof Error ? error.message : 'Parse error' },
    };

    if (sessionId && sessions.has(sessionId)) {
      sessions.get(sessionId)!(JSON.stringify(errorResponse));
      return new Response(null, { status: 202, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-mcp-client, x-mcp-secret',
    },
  });
}

import { queryVectors } from "@/lib/vector";
import { generateResponse } from "@/lib/groq";

// Simplified HTTP endpoint for querying the digital twin
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Handle MCP JSON-RPC format
    if (body.method === 'tools/list') {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            tools: [
              {
                name: 'query_digital_twin',
                description: 'Query the digital twin\'s professional profile',
                inputSchema: {
                  type: 'object',
                  properties: {
                    question: { type: 'string' },
                  },
                  required: ['question'],
                },
              },
              {
                name: 'search_profile',
                description: 'Search the profile using semantic search',
                inputSchema: {
                  type: 'object',
                  properties: {
                    query: { type: 'string' },
                    topK: { type: 'number', default: 3 },
                  },
                  required: ['query'],
                },
              },
            ],
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
    
    if (body.method === 'tools/call') {
      const { name, arguments: args } = body.params;
      
      try {
        if (name === 'query_digital_twin') {
          const { question } = args as { question: string };

          console.log('[MCP] Received question:', question);

          if (!question || typeof question !== 'string') {
            throw new Error('Invalid question parameter');
          }

          // Search vector database
          console.log('[MCP] Querying vector database...');
          const results = await queryVectors(question, 5);
          console.log('[MCP] Vector results:', results?.length || 0);

          if (!results || results.length === 0) {
            return new Response(
              JSON.stringify({
                jsonrpc: '2.0',
                id: body.id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: "I couldn't find relevant information to answer that question.",
                    },
                  ],
                },
              }),
              {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
                },
              }
            );
          }

          // Extract context
          const context = results
            .map((result) => {
              const metadata = result.metadata as { text?: string; section?: string };
              return `[${metadata.section || 'Profile'}]\n${metadata.text || ''}`;
            })
            .join('\n\n');

          // Generate AI response
          const response = await generateResponse({
            prompt: `Context from profile:\n\n${context}\n\nQuestion: ${question}\n\nProvide a clear, professional answer based on the context above.`,
            systemPrompt: `You are a professional assistant representing the individual in their digital twin profile. Answer questions accurately based on the provided context.`,
          });

          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: body.id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: response,
                  },
                ],
              },
            }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
        } else if (name === 'search_profile') {
          const { query, topK = 3 } = args as { query: string; topK?: number };

          if (!query || typeof query !== 'string') {
            throw new Error('Invalid query parameter');
          }

          const limitedTopK = Math.min(Math.max(topK, 1), 10);
          const results = await queryVectors(query, limitedTopK);

          if (!results || results.length === 0) {
            return new Response(
              JSON.stringify({
                jsonrpc: '2.0',
                id: body.id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: `No results found for query: "${query}"`,
                    },
                  ],
                },
              }),
              {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
                },
              }
            );
          }

          const formattedResults = results
            .map((result, index) => {
              const metadata = result.metadata as { text?: string; section?: string };
              return `Result ${index + 1} (relevance: ${(result.score * 100).toFixed(1)}%):\nSection: ${metadata.section || 'Unknown'}\n${metadata.text || 'No text available'}`;
            })
            .join('\n\n---\n\n');

          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: body.id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: `Found ${results.length} relevant results:\n\n${formattedResults}`,
                  },
                ],
              },
            }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
        } else {
          throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: body.id,
            error: {
              code: -32000,
              message: errorMessage,
            },
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
    }

    // Unknown method
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        error: {
          code: -32601,
          message: 'Method not found',
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('MCP API Error:', error);
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: error instanceof Error ? error.message : 'Parse error',
        },
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

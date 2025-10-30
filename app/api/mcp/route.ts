/**
 * MCP API Endpoint
 * Exposes Model Context Protocol server over HTTP
 * Handles JSON-RPC 2.0 requests for tool listing and execution
 */

import { NextRequest, NextResponse } from "next/server";
import { Index } from "@upstash/vector";
import Groq from "groq-sdk";
import { z } from "zod";

// Environment variable validation
const UPSTASH_VECTOR_REST_URL = process.env.UPSTASH_VECTOR_REST_URL;
const UPSTASH_VECTOR_REST_TOKEN = process.env.UPSTASH_VECTOR_REST_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Initialize clients
let vectorIndex: Index | null = null;
let groqClient: Groq | null = null;

function initializeClients() {
  if (!UPSTASH_VECTOR_REST_URL || !UPSTASH_VECTOR_REST_TOKEN || !GROQ_API_KEY) {
    const missing = [];
    if (!UPSTASH_VECTOR_REST_URL) missing.push("UPSTASH_VECTOR_REST_URL");
    if (!UPSTASH_VECTOR_REST_TOKEN) missing.push("UPSTASH_VECTOR_REST_TOKEN");
    if (!GROQ_API_KEY) missing.push("GROQ_API_KEY");
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  if (!vectorIndex) {
    vectorIndex = new Index({
      url: UPSTASH_VECTOR_REST_URL,
      token: UPSTASH_VECTOR_REST_TOKEN,
    });
    console.log("✓ Upstash Vector client initialized");
  }

  if (!groqClient) {
    groqClient = new Groq({
      apiKey: GROQ_API_KEY,
    });
    console.log("✓ Groq client initialized");
  }

  return { vectorIndex, groqClient };
}

// Zod schemas for input validation
const QueryDigitalTwinSchema = z.object({
  question: z.string().min(1, "Question cannot be empty"),
  topK: z.number().int().min(1).max(20).optional().default(3),
});

const SearchProfileSchema = z.object({
  query: z.string().min(1, "Query cannot be empty"),
  category: z.string().optional(),
  topK: z.number().int().min(1).max(20).optional().default(3),
});

// Define available tools
const TOOLS = [
  {
    name: "query_digital_twin",
    description: "Ask questions about the person's professional background, skills, experience, and career goals. Uses RAG to provide accurate, context-aware responses.",
    inputSchema: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "The question to ask about the professional profile",
        },
        topK: {
          type: "number",
          description: "Number of relevant results to retrieve (default: 3, max: 20)",
          default: 3,
        },
      },
      required: ["question"],
    },
  },
  {
    name: "search_profile",
    description: "Search specific sections of the professional profile. Returns raw results without AI generation.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query",
        },
        category: {
          type: "string",
          description: "Filter by category (optional)",
        },
        topK: {
          type: "number",
          description: "Number of results to return (default: 3, max: 20)",
          default: 3,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_database_info",
    description: "Get information about the vector database including vector count and dimension.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

/**
 * Handle tool execution
 */
async function executeTool(name: string, args: unknown) {
  const { vectorIndex, groqClient } = initializeClients();
  const requestId = Date.now();

  console.log(`\n🔧 [${requestId}] Tool call: ${name}`);
  console.log(`📝 [${requestId}] Arguments:`, JSON.stringify(args));

  switch (name) {
    case "query_digital_twin": {
      const startTime = Date.now();

      // Validate input
      const parsed = QueryDigitalTwinSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid input: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
      }

      const { question, topK } = parsed.data;
      console.log(`🔍 [${requestId}] Querying digital twin: "${question}" (topK: ${topK})`);

      // Query vector database
      const vectorSearchStart = Date.now();
      const results = await vectorIndex.query({
        data: question,
        topK,
        includeMetadata: true,
      });
      const vectorSearchTime = Date.now() - vectorSearchStart;
      console.log(`✓ [${requestId}] Vector search completed in ${vectorSearchTime}ms (${results.length} results)`);

      if (!results || results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "I don't have specific information about that topic. The profile may need to be uploaded to the vector database first.",
            },
          ],
        };
      }

      // Extract and deduplicate context
      const seenContents = new Set<string>();
      const sources = results
        .map((result) => ({
          title: (result.metadata?.title as string) || "Information",
          content: (result.metadata?.content as string) || "",
          score: result.score || 0,
        }))
        .filter((source) => {
          if (!source.content || seenContents.has(source.content)) {
            return false;
          }
          seenContents.add(source.content);
          return true;
        });

      console.log(`✓ [${requestId}] Extracted ${sources.length} unique sources`);

      if (sources.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "I found some information but couldn't extract details. Please try rephrasing your question.",
            },
          ],
        };
      }

      const context = sources.map((source) => `${source.title}: ${source.content}`).join("\n\n");

      // Generate response with Groq
      console.log(`🤖 [${requestId}] Generating AI response...`);
      const llmStart = Date.now();

      const prompt = `Based on the following information about yourself, answer the question.
Speak in first person as if you are describing your own background.

Your Information:
${context}

Question: ${question}

Provide a helpful, professional response:`;

      const completion = await groqClient.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "You are an AI digital twin. Answer questions as if you are the person, speaking in first person about your background, skills, and experience.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const llmTime = Date.now() - llmStart;
      const answer = completion.choices[0]?.message?.content?.trim() || "No response generated.";

      const totalTime = Date.now() - startTime;
      console.log(`✓ [${requestId}] Response generated in ${llmTime}ms (total: ${totalTime}ms)`);

      return {
        content: [
          {
            type: "text",
            text: answer,
          },
        ],
      };
    }

    case "search_profile": {
      const startTime = Date.now();

      // Validate input
      const parsed = SearchProfileSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid input: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
      }

      const { query, topK } = parsed.data;
      console.log(`🔍 [${requestId}] Searching profile: "${query}" (topK: ${topK})`);

      const results = await vectorIndex.query({
        data: query,
        topK,
        includeMetadata: true,
      });

      const duration = Date.now() - startTime;
      console.log(`✓ [${requestId}] Search completed in ${duration}ms (${results.length} results)`);

      const formattedResults = results.map((result) => ({
        title: result.metadata?.title || "Information",
        content: result.metadata?.content || "",
        category: result.metadata?.category || "",
        score: result.score || 0,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(formattedResults, null, 2),
          },
        ],
      };
    }

    case "get_database_info": {
      console.log(`📊 [${requestId}] Fetching database info...`);
      const startTime = Date.now();

      const info = await vectorIndex.info();
      const duration = Date.now() - startTime;

      const dbInfo = {
        vectorCount: info.vectorCount || 0,
        dimension: info.dimension || 0,
        similarityFunction: info.similarityFunction || "unknown",
      };

      console.log(`✓ [${requestId}] Database info retrieved in ${duration}ms:`, dbInfo);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(dbInfo, null, 2),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * POST handler for JSON-RPC 2.0 requests
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jsonrpc, method, params, id } = body;

    console.log(`\n📨 Incoming MCP request: ${method}`);

    // Validate JSON-RPC 2.0 format
    if (jsonrpc !== "2.0") {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Invalid Request: jsonrpc must be '2.0'",
          },
          id: id || null,
        },
        { status: 400 }
      );
    }

    // Handle different methods
    switch (method) {
      case "tools/list": {
        console.log("📋 Listing available tools");
        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            tools: TOOLS,
          },
          id,
        });
      }

      case "tools/call": {
        const { name, arguments: args } = params;
        
        try {
          const result = await executeTool(name, args);
          
          return NextResponse.json({
            jsonrpc: "2.0",
            result,
            id,
          });
        } catch (error) {
          console.error(`❌ Tool execution failed:`, error);
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          
          return NextResponse.json({
            jsonrpc: "2.0",
            error: {
              code: -32603,
              message: `Tool execution failed: ${errorMessage}`,
            },
            id,
          });
        }
      }

      case "initialize": {
        console.log("🔄 Initializing MCP server");
        
        try {
          initializeClients();
          
          return NextResponse.json({
            jsonrpc: "2.0",
            result: {
              protocolVersion: "2024-11-05",
              capabilities: {
                tools: {},
              },
              serverInfo: {
                name: "digital-twin-mcp-server",
                version: "1.0.0",
              },
            },
            id,
          });
        } catch (error) {
          console.error(`❌ Initialization failed:`, error);
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          
          return NextResponse.json({
            jsonrpc: "2.0",
            error: {
              code: -32603,
              message: `Initialization failed: ${errorMessage}`,
            },
            id,
          });
        }
      }

      default:
        return NextResponse.json({
          jsonrpc: "2.0",
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
          id,
        });
    }
  } catch (error) {
    console.error("❌ Request processing failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32700,
          message: `Parse error: ${errorMessage}`,
        },
        id: null,
      },
      { status: 400 }
    );
  }
}

/**
 * GET handler for health check
 */
export async function GET() {
  try {
    initializeClients();
    
    return NextResponse.json({
      status: "healthy",
      server: "digital-twin-mcp-server",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      environment: {
        upstashConfigured: !!UPSTASH_VECTOR_REST_URL && !!UPSTASH_VECTOR_REST_TOKEN,
        groqConfigured: !!GROQ_API_KEY,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      {
        status: "unhealthy",
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Digital Twin MCP Server
 * Model Context Protocol server exposing digital twin tools via stdio
 * Provides RAG-powered queries about professional profile with vector search and LLM generation
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Index } from "@upstash/vector";
import Groq from "groq-sdk";

// Environment variable validation
const UPSTASH_VECTOR_REST_URL = process.env.UPSTASH_VECTOR_REST_URL;
const UPSTASH_VECTOR_REST_TOKEN = process.env.UPSTASH_VECTOR_REST_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!UPSTASH_VECTOR_REST_URL || !UPSTASH_VECTOR_REST_TOKEN || !GROQ_API_KEY) {
  console.error("❌ Missing required environment variables:");
  if (!UPSTASH_VECTOR_REST_URL) console.error("  - UPSTASH_VECTOR_REST_URL");
  if (!UPSTASH_VECTOR_REST_TOKEN) console.error("  - UPSTASH_VECTOR_REST_TOKEN");
  if (!GROQ_API_KEY) console.error("  - GROQ_API_KEY");
  throw new Error("Missing required environment variables");
}

// Initialize clients with error handling
let vectorIndex: Index;
let groqClient: Groq;

try {
  vectorIndex = new Index({
    url: UPSTASH_VECTOR_REST_URL,
    token: UPSTASH_VECTOR_REST_TOKEN,
  });
  console.error("✓ Upstash Vector client initialized");
} catch (error) {
  console.error("❌ Failed to initialize Upstash Vector client:", error);
  throw error;
}

try {
  groqClient = new Groq({
    apiKey: GROQ_API_KEY,
  });
  console.error("✓ Groq client initialized");
} catch (error) {
  console.error("❌ Failed to initialize Groq client:", error);
  throw error;
}

// Zod schemas for input validation
const QueryDigitalTwinSchema = z.object({
  question: z.string().min(1, "Question cannot be empty").describe("The question to ask about the person's professional profile"),
  topK: z.number().int().min(1).max(20).optional().default(3).describe("Number of relevant results to retrieve"),
});

const SearchProfileSchema = z.object({
  query: z.string().min(1, "Query cannot be empty").describe("Search query for the professional profile"),
  category: z.string().optional().describe("Filter by category (e.g., 'experience', 'skills', 'education')"),
  topK: z.number().int().min(1).max(20).optional().default(3).describe("Number of results to return"),
});

// Define available tools
const TOOLS: Tool[] = [
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

// Create MCP server
const server = new Server(
  {
    name: "digital-twin-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

console.error("✓ MCP Server initialized");

/**
 * Handler for listing available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error("📋 Listing available tools");
  return {
    tools: TOOLS,
  };
});

/**
 * Handler for tool execution with comprehensive error handling
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const requestId = Date.now();
  
  console.error(`\n🔧 [${requestId}] Tool call: ${name}`);
  console.error(`📝 [${requestId}] Arguments:`, JSON.stringify(args));

  try {
    switch (name) {
      case "query_digital_twin": {
        const startTime = Date.now();
        
        // Validate input
        const parsed = QueryDigitalTwinSchema.safeParse(args);
        if (!parsed.success) {
          console.error(`❌ [${requestId}] Validation failed:`, parsed.error.issues);
          throw new Error(`Invalid input: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
        }
        
        const { question, topK } = parsed.data;
        console.error(`🔍 [${requestId}] Querying digital twin: "${question}" (topK: ${topK})`);
        
        // Query vector database
        const vectorSearchStart = Date.now();
        const results = await vectorIndex.query({
          data: question,
          topK,
          includeMetadata: true,
        });
        const vectorSearchTime = Date.now() - vectorSearchStart;
        console.error(`✓ [${requestId}] Vector search completed in ${vectorSearchTime}ms (${results.length} results)`);

        if (!results || results.length === 0) {
          console.error(`⚠️ [${requestId}] No results found`);
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
            title: result.metadata?.title as string || "Information",
            content: result.metadata?.content as string || "",
            score: result.score || 0,
          }))
          .filter(source => {
            if (!source.content || seenContents.has(source.content)) {
              return false;
            }
            seenContents.add(source.content);
            return true;
          });

        console.error(`✓ [${requestId}] Extracted ${sources.length} unique sources`);

        if (sources.length === 0) {
          console.error(`⚠️ [${requestId}] No valid content extracted`);
          return {
            content: [
              {
                type: "text",
                text: "I found some information but couldn't extract details. Please try rephrasing your question.",
              },
            ],
          };
        }

        const context = sources
          .map(source => `${source.title}: ${source.content}`)
          .join("\n\n");

        // Generate response with Groq
        console.error(`🤖 [${requestId}] Generating AI response...`);
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
        console.error(`✓ [${requestId}] Response generated in ${llmTime}ms (total: ${totalTime}ms)`);

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
          console.error(`❌ [${requestId}] Validation failed:`, parsed.error.issues);
          throw new Error(`Invalid input: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
        }
        
        const { query, topK } = parsed.data;
        console.error(`🔍 [${requestId}] Searching profile: "${query}" (topK: ${topK})`);
        
        const results = await vectorIndex.query({
          data: query,
          topK,
          includeMetadata: true,
        });

        const duration = Date.now() - startTime;
        console.error(`✓ [${requestId}] Search completed in ${duration}ms (${results.length} results)`);

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
        console.error(`📊 [${requestId}] Fetching database info...`);
        const startTime = Date.now();
        
        const info = await vectorIndex.info();
        const duration = Date.now() - startTime;
        
        const dbInfo = {
          vectorCount: info.vectorCount || 0,
          dimension: info.dimension || 0,
          similarityFunction: info.similarityFunction || "unknown",
        };
        
        console.error(`✓ [${requestId}] Database info retrieved in ${duration}ms:`, dbInfo);
        
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
        console.error(`❌ [${requestId}] Unknown tool: ${name}`);
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`❌ [${requestId}] Tool execution failed:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Main function - Start the MCP server
 */
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("✓ Digital Twin MCP Server running on stdio");
    console.error("✓ Ready to accept tool calls\n");
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    throw error;
  }
}

main().catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});


import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { queryVectors } from "@/lib/vector";
import { generateResponse } from "@/lib/groq";

// Initialize MCP Server
const server = new Server(
  {
    name: "digital-twin-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "query_digital_twin",
      description: "Query the digital twin's professional profile to answer questions about experience, skills, projects, education, and career goals. Returns AI-generated responses based on relevant profile data.",
      inputSchema: {
        type: "object",
        properties: {
          question: {
            type: "string",
            description: "The question to ask about the professional profile (e.g., 'What programming languages do you know?', 'Tell me about your work experience', 'What are your career goals?')",
          },
        },
        required: ["question"],
      },
    },
    {
      name: "search_profile",
      description: "Search the digital twin's profile for specific information using semantic search. Returns raw relevant chunks from the profile without AI interpretation.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query to find relevant information in the profile (e.g., 'cybersecurity', 'education', 'certifications')",
          },
          topK: {
            type: "number",
            description: "Number of results to return (default: 3, max: 10)",
            default: 3,
          },
        },
        required: ["query"],
      },
    },
  ],
}));

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "query_digital_twin") {
      const { question } = args as { question: string };

      if (!question || typeof question !== "string") {
        throw new Error("Invalid question parameter");
      }

      // Search vector database for relevant context
      const results = await queryVectors(question, 5);

      if (!results || results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "I couldn't find relevant information in the profile to answer that question. Please try rephrasing or ask about different aspects of the professional background.",
            },
          ],
        };
      }

      // Extract context from search results
      const context = results
        .map((result) => {
          const metadata = result.metadata as { text?: string; section?: string };
          return `[${metadata.section || "Profile"}]\n${metadata.text || ""}`;
        })
        .join("\n\n");

      // Generate AI response using Groq
      const systemPrompt = `You are a professional assistant representing the individual in their digital twin profile. 
Answer questions accurately based on the provided context from their profile. 
Be concise, professional, and helpful. If the context doesn't contain enough information, say so.`;

      const userPrompt = `Context from profile:\n\n${context}\n\nQuestion: ${question}\n\nProvide a clear, professional answer based on the context above.`;

      const response = await generateResponse(systemPrompt, userPrompt);

      return {
        content: [
          {
            type: "text",
            text: response,
          },
        ],
      };
    } else if (name === "search_profile") {
      const { query, topK = 3 } = args as { query: string; topK?: number };

      if (!query || typeof query !== "string") {
        throw new Error("Invalid query parameter");
      }

      const limitedTopK = Math.min(Math.max(topK, 1), 10);
      const results = await queryVectors(query, limitedTopK);

      if (!results || results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No results found for query: "${query}"`,
            },
          ],
        };
      }

      const formattedResults = results
        .map((result, index) => {
          const metadata = result.metadata as { text?: string; section?: string };
          return `Result ${index + 1} (relevance: ${(result.score * 100).toFixed(1)}%):\nSection: ${metadata.section || "Unknown"}\n${metadata.text || "No text available"}`;
        })
        .join("\n\n---\n\n");

      return {
        content: [
          {
            type: "text",
            text: `Found ${results.length} relevant results:\n\n${formattedResults}`,
          },
        ],
      };
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
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

// HTTP handler for Next.js API route
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Handle MCP JSON-RPC request
    const response = await server.handleRequest(body);
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('MCP API Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
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

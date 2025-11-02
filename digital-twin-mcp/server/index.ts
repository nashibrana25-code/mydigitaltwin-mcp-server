import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { queryVectors } from "../lib/vector";
import { generateResponse } from "../lib/groq";

// Create MCP server instance
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
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "query_digital_twin",
        description:
          "Query the digital twin's professional profile using RAG (Retrieval-Augmented Generation). Returns a personalized response about experience, skills, projects, or career goals.",
        inputSchema: {
          type: "object",
          properties: {
            question: {
              type: "string",
              description: "The question to ask about the person's professional background",
            },
            top_k: {
              type: "number",
              description: "Number of relevant context chunks to retrieve (default: 3)",
              default: 3,
            },
          },
          required: ["question"],
        },
      },
      {
        name: "search_profile",
        description:
          "Search the digital twin's profile for specific information. Returns raw context chunks without AI generation.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query to find relevant profile information",
            },
            top_k: {
              type: "number",
              description: "Number of results to return (default: 5)",
              default: 5,
            },
          },
          required: ["query"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Missing arguments",
        },
      ],
      isError: true,
    };
  }

  try {
    if (name === "query_digital_twin") {
      const question = args.question as string;
      const topK = (args.top_k as number) || 3;

      if (!question) {
        throw new Error("Question is required");
      }

      // Step 1: Query vector database
      const results = await queryVectors(question, topK);

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

      // Step 2: Extract context
      const contextDocs = results
        .map((result) => {
          const metadata = result.metadata;
          if (!metadata?.content) return null;
          return `${metadata.title || "Information"}: ${metadata.content}`;
        })
        .filter(Boolean);

      if (contextDocs.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "I found some information but couldn't extract details. Please try rephrasing your question.",
            },
          ],
        };
      }

      // Step 3: Generate response
      const context = contextDocs.join("\n\n");
      const prompt = `Based on the following information about yourself, answer the question.
Speak in first person as if you are describing your own background.

Your Information:
${context}

Question: ${question}

Provide a helpful, professional response:`;

      const answer = await generateResponse({
        prompt,
        temperature: 0.7,
        maxTokens: 500,
      });

      return {
        content: [
          {
            type: "text",
            text: answer,
          },
        ],
      };
    } else if (name === "search_profile") {
      const query = args.query as string;
      const topK = (args.top_k as number) || 5;

      if (!query) {
        throw new Error("Query is required");
      }

      // Query vector database
      const results = await queryVectors(query, topK);

      if (!results || results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No matching information found in the profile.",
            },
          ],
        };
      }

      // Format results
      const formattedResults = results
        .map((result, index) => {
          const metadata = result.metadata;
          return `Result ${index + 1} (Score: ${result.score.toFixed(3)}):
Title: ${metadata?.title || "N/A"}
Type: ${metadata?.type || "N/A"}
Content: ${metadata?.content || "N/A"}`;
        })
        .join("\n\n---\n\n");

      return {
        content: [
          {
            type: "text",
            text: `Found ${results.length} matching results:\n\n${formattedResults}`,
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
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

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Digital Twin MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

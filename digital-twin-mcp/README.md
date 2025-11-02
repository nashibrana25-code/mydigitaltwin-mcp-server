# Digital Twin MCP Server

A Model Context Protocol (MCP) server that provides RAG-powered access to a professional profile using Upstash Vector and Groq LLM.

## Features

- 🤖 **RAG-Powered Responses**: Retrieval-Augmented Generation for accurate, context-aware answers
- 🔍 **Vector Search**: Semantic search using Upstash Vector with automatic embeddings
- ⚡ **Fast LLM**: Groq API with LLaMA 3.1 for ultra-fast response generation
- 🔌 **MCP Protocol**: Standard Model Context Protocol for easy integration
- 🎯 **Two Tools**: `query_digital_twin` and `search_profile`

## Prerequisites

- Node.js 18+
- pnpm
- Upstash Vector database account
- Groq API key

## Quick Start

### 1. Install Dependencies

```powershell
cd digital-twin-mcp
pnpm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local`:

```powershell
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
UPSTASH_VECTOR_REST_URL=https://your-endpoint.upstash.io
UPSTASH_VECTOR_REST_TOKEN=your-token-here
GROQ_API_KEY=gsk_your-api-key-here
```

### 3. Build the Server

```powershell
pnpm build
```

### 4. Run the MCP Server

```powershell
node server/index.js
```

## Available Tools

### query_digital_twin

Query the professional profile with AI-generated responses.

**Input:**
- `question` (string, required): Question about the person's background
- `top_k` (number, optional): Number of context chunks to retrieve (default: 3)

**Output:** AI-generated first-person response

### search_profile

Search for specific information without AI generation.

**Input:**
- `query` (string, required): Search query
- `top_k` (number, optional): Number of results (default: 5)

**Output:** Raw context chunks with relevance scores

## MCP Client Configuration

Add to your MCP client config (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "digital-twin": {
      "command": "node",
      "args": ["C:/Users/nashi/Week 5/digital-twin-mcp/server/index.js"],
      "env": {
        "UPSTASH_VECTOR_REST_URL": "https://...",
        "UPSTASH_VECTOR_REST_TOKEN": "...",
        "GROQ_API_KEY": "gsk_..."
      }
    }
  }
}
```

## Development

### Run Next.js Dev Server (UI)

```powershell
pnpm dev
```

Visit http://localhost:3000 to see the server documentation.

### Type Check

```powershell
pnpm type-check
```

### Lint

```powershell
pnpm lint
```

## Project Structure

```
digital-twin-mcp/
├── app/                    # Next.js app (UI documentation)
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── lib/                    # Core libraries
│   ├── vector.ts          # Upstash Vector client
│   ├── groq.ts            # Groq LLM client
│   └── utils.ts           # Utilities
├── server/                 # MCP server
│   └── index.ts           # Main server implementation
├── .env.local             # Environment variables (create from .env.example)
├── package.json
├── tsconfig.json
└── next.config.ts
```

## How It Works

1. **Question Received**: MCP client sends question via `query_digital_twin` tool
2. **Vector Search**: Query is embedded and searched in Upstash Vector
3. **Context Retrieval**: Top K most relevant profile chunks retrieved
4. **LLM Generation**: Groq generates personalized response using context
5. **Response Returned**: First-person answer sent back to client

## Troubleshooting

**Error: "UPSTASH_VECTOR_REST_URL is not defined"**
- Ensure `.env.local` exists with all required variables
- Check variable names match exactly

**Error: "Failed to query vector database"**
- Verify Upstash credentials are correct
- Check Upstash dashboard for database status
- Ensure database has been populated with profile data

**Error: "Failed to generate response from Groq"**
- Verify `GROQ_API_KEY` is valid
- Check Groq API status
- Ensure you have API credits remaining

## License

MIT

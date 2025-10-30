# Digital Twin MCP Server

An MCP (Model Context Protocol) server that provides RAG (Retrieval-Augmented Generation) functionality for querying professional profile information using Upstash Vector and Groq.

## Features

- 🤖 **MCP Server** - Exposes tools via Model Context Protocol
- 🔍 **RAG System** - Semantic search with Upstash Vector + AI generation with Groq
- ⚡ **Fast Inference** - Powered by Groq's LLaMA 3.1 model
- 🎨 **Modern UI** - Next.js 16 with dark mode support
- 🔒 **Type-Safe** - Full TypeScript implementation

## MCP Tools Available

1. **`query_digital_twin`** - Ask questions about professional background
2. **`search_profile`** - Search specific profile sections  
3. **`get_database_info`** - Get vector database statistics

## Quick Start

```bash
# Install dependencies
pnpm install

# Run development server (UI)
pnpm dev

# Run MCP server
pnpm mcp
```

Open [http://localhost:3000](http://localhost:3000) to test the Digital Twin.

## Environment Variables

Create `.env.local` file:

```env
UPSTASH_VECTOR_REST_URL=your_url
UPSTASH_VECTOR_REST_TOKEN=your_token
GROQ_API_KEY=your_key
```

## Tech Stack

- **Framework**: Next.js 16.0 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 + ShadCN UI
- **Vector DB**: Upstash Vector
- **LLM**: Groq (LLaMA 3.1)
- **MCP**: @modelcontextprotocol/sdk

## Project Structure

```
digital-twin-mcp/
├── app/
│   ├── actions/rag.ts      # Server actions
│   └── page.tsx            # Main UI
├── lib/
│   ├── vector.ts           # Upstash utilities
│   └── groq.ts             # Groq utilities
├── server/
│   └── index.ts            # MCP server
└── .env.local              # Env variables
```

## Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

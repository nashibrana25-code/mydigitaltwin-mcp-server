# Digital Twin MCP Server

A **Model Context Protocol (MCP)** server that creates a digital twin assistant, answering questions about a person's professional profile using **RAG (Retrieval-Augmented Generation)**. Deployed live on Vercel for 24/7 access.

**Live URL:** `https://digital-twin-mcp-ten.vercel.app/api/mcp`

---

## Architecture Overview

```
┌─────────────────────┐     ┌──────────────────────────────────┐
│   Claude Desktop    │     │     Vercel (Production)          │
│   or MCP Client     │────▶│  Next.js API Route (/api/mcp)   │
│   via mcp-remote    │◀────│    ├── SSE Transport (GET)       │
└─────────────────────┘     │    └── JSON-RPC (POST)           │
                            │            │                     │
                            │            ▼                     │
                            │   ┌──────────────────┐           │
                            │   │  lib/vector.ts   │──────────▶│── Upstash Vector DB
                            │   │  Semantic Search  │           │   (Cloud - Embeddings)
                            │   └──────────────────┘           │
                            │            │                     │
                            │            ▼                     │
                            │   ┌──────────────────┐           │
                            │   │  lib/groq.ts     │──────────▶│── Groq API
                            │   │  LLM Generation   │           │   (LLaMA 3.1)
                            │   └──────────────────┘           │
                            └──────────────────────────────────┘

┌─────────────────────┐
│   Local MCP Server  │     (Alternative: stdio transport)
│   server/index.ts   │──── For local Claude Desktop via start-server.js
└─────────────────────┘
```

## Features

- **RAG-Powered Responses** — Retrieval-Augmented Generation for accurate, context-aware answers
- **Vector Search** — Semantic search using Upstash Vector with automatic embeddings
- **Fast LLM** — Groq API with LLaMA 3.1 for ultra-fast response generation
- **MCP Protocol** — Standard Model Context Protocol with SSE + JSON-RPC transport
- **Dual Deployment** — Runs on Vercel (24/7 cloud) or locally (stdio)
- **Two Tools** — `query_digital_twin` (RAG query) and `search_profile` (semantic search)

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript |
| **Package Manager** | pnpm |
| **Vector Database** | Upstash Vector |
| **LLM Provider** | Groq (LLaMA 3.1-8b-instant) |
| **MCP SDK** | @modelcontextprotocol/sdk |
| **Deployment** | Vercel |
| **UI** | Tailwind CSS + ShadCN (dark mode) |

---

## Project Structure

```
digital-twin-mcp/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (dark mode)
│   ├── page.tsx                  # Home page (Resume + Chat UI)
│   ├── globals.css               # Global styles
│   └── api/
│       └── mcp/
│           └── route.ts          # ★ MCP API endpoint (SSE + JSON-RPC)
├── lib/                          # Core libraries
│   ├── vector.ts                 # Upstash Vector client & search
│   ├── groq.ts                   # Groq LLM client & generation
│   └── utils.ts                  # Tailwind utilities
├── server/                       # Local MCP server (stdio transport)
│   └── index.ts                  # MCP server using @modelcontextprotocol/sdk
├── components/                   # React components
│   ├── Resume.tsx                # Online resume display
│   └── ChatWidget.tsx            # Chat interface widget
├── scripts/
│   └── upload-profile.ts         # Upload digitaltwin.json to Upstash Vector
├── start-server.js               # Local server launcher (loads .env.local)
├── .env.local                    # Environment variables (not committed)
├── .env.example                  # Environment template
├── vercel.json                   # Vercel deployment config
├── next.config.ts                # Next.js configuration
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript config
└── README.md                     # This file
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- [Upstash Vector](https://upstash.com/docs/vector/overall/getstarted) database
- [Groq API key](https://console.groq.com/)

### 1. Clone & Install

```powershell
git clone https://github.com/nashibrana25-code/mydigitaltwin-mcp-server.git
cd mydigitaltwin-mcp-server
pnpm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and add your credentials:

```powershell
Copy-Item .env.example .env.local
```

```env
UPSTASH_VECTOR_REST_URL=https://your-endpoint.upstash.io
UPSTASH_VECTOR_REST_TOKEN=your-token-here
GROQ_API_KEY=gsk_your-api-key-here
```

### 3. Upload Profile Data

Place your `digitaltwin.json` file in the parent directory, then run:

```powershell
pnpm tsx scripts/upload-profile.ts
```

This chunks your professional profile and uploads embeddings to Upstash Vector.

### 4. Run Locally

```powershell
pnpm dev
```

The MCP endpoint is available at `http://localhost:3000/api/mcp`.

---

## MCP Tools

### `query_digital_twin`

Queries the professional profile using RAG — searches the vector database for relevant context, then generates an AI response using Groq LLaMA.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `question` | string | Yes | Question about the professional profile |

**Example:** *"What are your technical skills?"* → Returns an AI-generated answer based on profile data.

### `search_profile`

Searches the professional profile using semantic search — returns raw matching chunks with relevance scores, without AI generation.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `topK` | number | No | Number of results (1-10, default: 3) |

**Example:** *"leadership experience"* → Returns top matching profile chunks with similarity scores.

---

## Connecting to Claude Desktop

### Option A: Cloud (Vercel — Recommended)

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "digital-twin": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://digital-twin-mcp-ten.vercel.app/api/mcp"
      ]
    }
  }
}
```

### Option B: Local (stdio)

```json
{
  "mcpServers": {
    "digital-twin": {
      "command": "node",
      "args": ["C:/path/to/digital-twin-mcp/start-server.js"]
    }
  }
}
```

### VS Code MCP Integration

Add to `.vscode/mcp.json`:

```json
{
  "mcpServers": {
    "digital-twin": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://digital-twin-mcp-ten.vercel.app/api/mcp"]
    }
  }
}
```

---

## Deployment to Vercel

### Deploy

```powershell
pnpm build
vercel --yes --prod
```

### Set Environment Variables

Add these in the [Vercel Dashboard](https://vercel.com/) under **Settings > Environment Variables**:

- `UPSTASH_VECTOR_REST_URL`
- `UPSTASH_VECTOR_REST_TOKEN`
- `GROQ_API_KEY`

---

## How It Works

1. **Client Connects** — `mcp-remote` establishes SSE connection via GET `/api/mcp`
2. **Question Received** — Client sends JSON-RPC request via POST `/api/mcp`
3. **Vector Search** — Query is embedded and matched against Upstash Vector database
4. **Context Retrieved** — Top K most relevant profile chunks are gathered
5. **LLM Generation** — Groq LLaMA generates a personalized response using context
6. **Response Returned** — Answer sent back via SSE stream to the client

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start Next.js development server |
| `pnpm build` | Build for production |
| `pnpm start` | Run production build |
| `pnpm lint` | Run ESLint |
| `pnpm type-check` | Run TypeScript type checking |
| `pnpm tsx scripts/upload-profile.ts` | Upload profile data to vector DB |

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| `UPSTASH_VECTOR_REST_URL is not defined` | Ensure `.env.local` exists with all required variables |
| `Failed to query vector database` | Verify Upstash credentials; check database has profile data |
| `Failed to generate response from Groq` | Verify `GROQ_API_KEY` is valid and has credits |
| `Claude Desktop shows "disconnected"` | Restart Claude Desktop; check MCP config URL is correct |
| `429 Too Many Requests` | Vercel rate limiting — wait a moment and retry |

---

## License

MIT

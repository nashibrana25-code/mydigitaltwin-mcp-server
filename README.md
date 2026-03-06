# Digital Twin MCP Server

A **Model Context Protocol (MCP)** server that creates a digital twin assistant, answering questions about a professional profile using **RAG (Retrieval-Augmented Generation)**. Includes a resume/chat UI and a live MCP endpoint for Claude Desktop.

**Live MCP URL:** `https://digital-twin-mcp-ten.vercel.app/api/mcp`

**Live UI:** [https://digital-twin-mcp-ten.vercel.app](https://digital-twin-mcp-ten.vercel.app)

---

## Architecture

```
┌─────────────────────┐     ┌──────────────────────────────────────┐
│  Claude Desktop     │     │  Vercel (Next.js 15)                 │
│  or any MCP Client  │────▶│                                      │
│  via mcp-remote     │◀────│  /api/mcp   ← MCP endpoint (SSE)    │
└─────────────────────┘     │  /          ← Resume + Chat UI      │
                            │                                      │
                            │         ┌────────────────┐           │
                            │         │ lib/vector.ts  │──▶ Upstash Vector DB
                            │         │ Semantic Search│   (mxbai-embed-large-v1)
                            │         └────────────────┘           │
                            │         ┌────────────────┐           │
                            │         │ lib/groq.ts    │──▶ Groq API
                            │         │ LLM Generation │   (LLaMA 3.1-8b-instant)
                            │         └────────────────┘           │
                            └──────────────────────────────────────┘
```

**MCP Tools exposed:**

| Tool | Description |
|------|-------------|
| `query_digital_twin` | RAG query — searches vector DB, generates AI response |
| `search_profile` | Semantic search — returns raw matching profile chunks |

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Package Manager | pnpm |
| Vector Database | Upstash Vector |
| LLM | Groq (LLaMA 3.1-8b-instant) |
| MCP SDK | @modelcontextprotocol/sdk |
| Deployment | Vercel |
| UI | Tailwind CSS (dark mode) |

---

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- [Upstash Vector](https://console.upstash.com/) database
- [Groq](https://console.groq.com/) API key

### 1. Clone & install

```bash
git clone https://github.com/nashibrana25-code/mydigitaltwin-mcp-server.git
cd mydigitaltwin-mcp-server/digital-twin-mcp
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
UPSTASH_VECTOR_REST_URL=https://your-endpoint.upstash.io
UPSTASH_VECTOR_REST_TOKEN=your-token-here
GROQ_API_KEY=gsk_your-api-key-here
```

### 3. Upload profile data

```bash
pnpm tsx scripts/upload-profile.ts
```

### 4. Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) for the resume + chat UI.

---

## Connect to Claude Desktop

Add to your Claude Desktop config (`claude_desktop_config.json`):

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

Then restart Claude Desktop. Two tools will appear: `query_digital_twin` and `search_profile`.

---

## Example Prompts (for Claude Desktop)

1. **"What is this person's professional background?"**
   Uses `query_digital_twin` to generate a summary from the profile.

2. **"Search for any experience with cloud architecture."**
   Uses `search_profile` to find relevant profile chunks.

3. **"Would this person be a good fit for a senior full-stack role?"**
   Uses `query_digital_twin` to evaluate fit against the profile data.

---

## Repository Structure

```
├── digital-twin-mcp/         # Main application (deployed to Vercel)
│   ├── app/                   # Next.js App Router
│   │   ├── page.tsx           # Resume + Chat UI
│   │   └── api/mcp/route.ts   # MCP endpoint
│   ├── components/            # React components
│   ├── lib/                   # Vector search + Groq LLM clients
│   ├── server/                # Local MCP server (stdio)
│   ├── scripts/               # Profile upload script
│   └── tests/                 # Recruiter query tests
├── docs/                      # Deployment & testing docs
├── archive/                   # Previous iterations & coursework
└── README.md                  # This file
```

---

## Documentation

- [Deployment Guide](docs/DEPLOYMENT.md) — Vercel setup, env vars, routing
- [Testing Guide](docs/TESTING.md) — Smoke tests and verification checklist

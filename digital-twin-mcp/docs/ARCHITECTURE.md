# Digital Twin RAG System Architecture

## Overview
Production-ready RAG system with MCP server for multi-platform integration.

## Components
- Next.js 15 (App Router) hosting web UI and MCP HTTP endpoint
- Upstash Vector (auto-embedding: mixedbread-ai/mxbai-embed-large-v1)
- Groq LLM (llama-3.1-8b-instant)
- JSON-RPC MCP endpoint at `/api/mcp` with tools: `query_digital_twin`, `search_profile`
- Profile source: `digitaltwin.json` → ingested via `embed_digitaltwin.py`

## Data Flow
1. User question → `/api/mcp` tools/call
2. Server queries Upstash Vector with `data: question`, `topK`
3. Top results → context block (title + content)
4. Groq LLM generates first-person answer
5. JSON-RPC response returned to client or Claude Desktop

## Error Handling
- Invalid params → JSON-RPC error (-32000)
- Unknown method → -32601
- Empty vector results → graceful fallback text
- CORS enabled for HTTP clients

## Security
- Env vars via `.env.local` and Vercel dashboard
- Read-only token can be used for search-only contexts

## Key Files
- `app/api/mcp/route.ts`
- `lib/vector.ts`
- `lib/groq.ts`
- `digitaltwin.json`
- `embed_digitaltwin.py`

# Deployment Guide

## Vercel Configuration

The Next.js app lives in the `digital-twin-mcp/` subdirectory. Vercel must be configured to deploy from this subdirectory.

### Vercel Project Settings

| Setting | Value |
|---------|-------|
| **Root Directory** | `digital-twin-mcp` |
| **Framework Preset** | Next.js |
| **Build Command** | `pnpm build` (auto-detected) |
| **Output Directory** | `.next` (auto-detected) |
| **Install Command** | `pnpm install` (auto-detected) |

The `digital-twin-mcp/vercel.json` reinforces these settings:

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs"
}
```

### Environment Variables

Set these in **Vercel → Project → Settings → Environment Variables**:

| Variable | Description | Example |
|----------|-------------|---------|
| `UPSTASH_VECTOR_REST_URL` | Upstash Vector endpoint | `https://your-endpoint.upstash.io` |
| `UPSTASH_VECTOR_REST_TOKEN` | Upstash Vector auth token | `AX...` |
| `GROQ_API_KEY` | Groq API key | `gsk_...` |

All three are required for production.

---

## How Routing Works

### `/api/mcp` — MCP Endpoint

The MCP endpoint is a Next.js API route at `app/api/mcp/route.ts`.

- **GET /api/mcp** — Opens a Server-Sent Events (SSE) connection for MCP clients (e.g., `mcp-remote` from Claude Desktop).
- **POST /api/mcp** — Handles JSON-RPC 2.0 requests (MCP protocol).
- **OPTIONS /api/mcp** — CORS preflight.

When deployed, the full URL is:

```
https://digital-twin-mcp-ten.vercel.app/api/mcp
```

Claude Desktop connects via:

```
npx -y mcp-remote https://digital-twin-mcp-ten.vercel.app/api/mcp
```

### `/` — Resume + Chat UI

The root page serves a resume display with an embedded chat widget. No authentication required.

---

## Deployment Checklist

1. **Verify Vercel Root Directory** is set to `digital-twin-mcp`
2. **Set all 3 environment variables** in Vercel dashboard
3. **Push to main** — Vercel auto-deploys
4. **Verify** — see [Testing Guide](TESTING.md)

---

## Redeployment

To redeploy without code changes (e.g., after updating env vars):

1. Go to Vercel dashboard → Deployments
2. Click the latest deployment → three dots → "Redeploy"

Or push any commit to `main`.

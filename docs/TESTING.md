# Testing Guide

## Smoke Test Checklist

### 1. UI is accessible

Open the live URL in a browser:

```
https://digital-twin-mcp-ten.vercel.app
```

- [ ] Page loads without errors
- [ ] Resume content is visible
- [ ] Chat widget is present and interactive

### 2. MCP endpoint responds

```bash
curl -s -X POST https://digital-twin-mcp-ten.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' \
  | python -m json.tool
```

Expected: JSON-RPC response with `serverInfo.name = "digital-twin-mcp"`.

### 3. Tools are listed

After initialization, list available tools:

```bash
curl -s -X POST https://digital-twin-mcp-ten.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  | python -m json.tool
```

Expected: Two tools — `query_digital_twin` and `search_profile`.

### 4. Vector retrieval works

```bash
curl -s -X POST https://digital-twin-mcp-ten.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_profile","arguments":{"query":"experience","topK":2}}}' \
  | python -m json.tool
```

Expected: Results with profile chunks containing relevance scores.

### 5. RAG query works

```bash
curl -s -X POST https://digital-twin-mcp-ten.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"query_digital_twin","arguments":{"question":"What is this persons background?"}}}' \
  | python -m json.tool
```

Expected: AI-generated response about the person's professional background.

### 6. Claude Desktop connects

1. Add config to `claude_desktop_config.json`:

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

2. Restart Claude Desktop
3. Verify the `digital-twin` tools appear in the tools list
4. Ask: "What is this person's professional background?"
5. Confirm Claude uses `query_digital_twin` and returns a coherent answer

---

## Local Testing

```bash
cd digital-twin-mcp
pnpm dev
```

Then run the same curl commands above against `http://localhost:3000/api/mcp`.

### Automated recruiter tests

```bash
cd digital-twin-mcp/tests
python run_recruiter_tests.py
```

Uses sample queries from `recruiter_queries.json` against the live endpoint.

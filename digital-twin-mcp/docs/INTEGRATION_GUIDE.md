# MCP Integration Guide

## Claude Desktop
Add to your Claude Desktop config:

```json
"digital-twin": {
  "command": "npx",
  "args": ["-y", "mcp-remote",
    "https://mydigitaltwin-mcp-server.vercel.app/api/mcp"]
}
```

Restart Claude Desktop and verify the tools are listed.

## VS Code GitHub Copilot MCP
- Enable MCP servers in VS Code Insiders
- Point to your `.vscode/mcp.json` if using local stdio mode

## Web UI
- Visit the live chat: https://mydigitaltwin-mcp-server.vercel.app/

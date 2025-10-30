# Claude Desktop MCP Setup

Your Digital Twin MCP server is configured to work with Claude Desktop via stdio transport.

## Setup Instructions

### 1. Locate Claude Desktop Config File

The config file location depends on your OS:

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```
Typically: `C:\Users\nashi\AppData\Roaming\Claude\claude_desktop_config.json`

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Linux:**
```
~/.config/Claude/claude_desktop_config.json
```

### 2. Add Your Digital Twin Server

Edit `claude_desktop_config.json` and add your server:

```json
{
  "mcpServers": {
    "digital-twin": {
      "command": "node",
      "args": [
        "C:\\Users\\YOUR_USERNAME\\Week 5\\digital-twin-mcp\\node_modules\\.bin\\tsx",
        "C:\\Users\\YOUR_USERNAME\\Week 5\\digital-twin-mcp\\server\\index.ts"
      ],
      "env": {
        "UPSTASH_VECTOR_REST_URL": "your_upstash_url_here",
        "UPSTASH_VECTOR_REST_TOKEN": "your_upstash_token_here",
        "GROQ_API_KEY": "your_groq_api_key_here"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

Close and reopen Claude Desktop completely for the changes to take effect.

### 4. Verify Connection

In Claude Desktop:
1. Look for MCP indicator (usually in the UI)
2. Try asking: "Use the digital-twin MCP server to query_digital_twin: What are my skills?"
3. Check if the tools are available

## Alternative: Using pnpm (Recommended)

Instead of calling node directly, you can use pnpm:

```json
{
  "mcpServers": {
    "digital-twin": {
      "command": "pnpm",
      "args": ["--dir", "C:\\Users\\YOUR_USERNAME\\Week 5\\digital-twin-mcp", "mcp"],
      "env": {
        "UPSTASH_VECTOR_REST_URL": "your_upstash_url_here",
        "UPSTASH_VECTOR_REST_TOKEN": "your_upstash_token_here",
        "GROQ_API_KEY": "your_groq_api_key_here"
      }
    }
  }
}
```

This uses the `mcp` script from package.json: `"mcp": "tsx server/index.ts"`

## Testing the Server Standalone

Before adding to Claude Desktop, test the server:

```powershell
# In terminal
cd "C:\Users\nashi\Week 5\digital-twin-mcp"
pnpm mcp
```

You should see:
```
✓ Upstash Vector client initialized
✓ Groq client initialized
✓ MCP Server initialized
✓ Digital Twin MCP Server running on stdio
✓ Ready to accept tool calls
```

Press Ctrl+C to stop.

## Troubleshooting

### Server Won't Start
- Check that all environment variables are set in Claude Desktop config
- Verify the file paths are correct (use absolute paths)
- Check Node.js is installed and accessible

### Tools Not Showing
- Restart Claude Desktop completely
- Check Claude Desktop logs for MCP connection errors
- Verify the server starts successfully in standalone mode

### "No vectors found" Error
- The vector database is currently empty (0 vectors)
- You need to upload your profile data first
- See SETUP_COMPLETE.md for instructions on creating content_chunks

## Available Tools

Once connected, Claude Desktop will have access to:

1. **query_digital_twin**: Ask questions about your professional background (uses RAG)
2. **search_profile**: Search specific sections of your profile (raw results)
3. **get_database_info**: Check vector database statistics

## Next Steps

1. Set up Claude Desktop config
2. Upload profile data to Upstash Vector (currently 0 vectors)
3. Test queries in Claude Desktop
4. Use for interview preparation!

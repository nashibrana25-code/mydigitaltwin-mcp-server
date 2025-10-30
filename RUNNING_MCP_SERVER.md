# Running Your Digital Twin MCP Server

## ⚠️ Important: VS Code MCP vs Claude Desktop MCP

Your MCP server is configured for **stdio transport** (standard input/output), which is the standard way MCP servers work with **Claude Desktop**, not VS Code.

**VS Code MCP Integration** (`.vscode/mcp.json`) is for VS Code to connect as an MCP **client** to an HTTP server - this is NOT how to run your server.

## 🎯 Recommended: Use with Claude Desktop

### Quick Start

1. **Test the server locally first:**
   ```powershell
   cd "C:\Users\nashi\Week 5\digital-twin-mcp"
   .\start-mcp.ps1
   ```

2. **Expected Output:**
   ```
   🚀 Starting Digital Twin MCP Server...
   📄 Loading environment from .env.local...
     ✓ Loaded UPSTASH_VECTOR_REST_URL
     ✓ Loaded UPSTASH_VECTOR_REST_TOKEN
     ✓ Loaded GROQ_API_KEY
   ✓ All environment variables loaded
   Starting MCP server...
   ✓ Upstash Vector client initialized
   ✓ Groq client initialized
   ✓ MCP Server initialized
   ✓ Digital Twin MCP Server running on stdio
   ✓ Ready to accept tool calls
   ```

3. **Press Ctrl+C to stop**

### Claude Desktop Integration

1. **Find Claude Desktop config:**
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Usually: `C:\Users\nashi\AppData\Roaming\Claude\claude_desktop_config.json`

2. **Add your server** (edit the config file):
   ```json
   {
     "mcpServers": {
       "digital-twin": {
         "command": "powershell",
         "args": [
           "-ExecutionPolicy", "Bypass",
           "-File", "C:\\Users\\nashi\\Week 5\\digital-twin-mcp\\start-mcp.ps1"
         ]
       }
     }
   }
   ```

3. **Restart Claude Desktop** completely

4. **Test in Claude:**
   - Ask: "What MCP tools are available?"
   - Try: "Use query_digital_twin to tell me about my skills"

## 🔧 Alternative Methods

### Method 1: Direct pnpm (requires .env.local)

```powershell
cd "C:\Users\nashi\Week 5\digital-twin-mcp"
pnpm mcp
```

**Note:** This only works if your terminal environment has the variables loaded.

### Method 2: Using the PowerShell script

```powershell
.\start-mcp.ps1
```

This automatically loads `.env.local` variables.

### Method 3: Manual environment variables

```powershell
$env:UPSTASH_VECTOR_REST_URL = "your-url"
$env:UPSTASH_VECTOR_REST_TOKEN = "your-token"
$env:GROQ_API_KEY = "your-key"
pnpm mcp
```

## 📊 Monitoring Output

### Initialization Logs

When the server starts successfully:
```
✓ Upstash Vector client initialized
✓ Groq client initialized
✓ MCP Server initialized
✓ Digital Twin MCP Server running on stdio
✓ Ready to accept tool calls
```

### Tool Call Logs

When a tool is invoked (from Claude Desktop):
```
🔧 [1730304000000] Tool call: query_digital_twin
📝 [1730304000000] Arguments: {"question":"What are my skills?"}
🔍 [1730304000000] Querying digital twin: "What are my skills?" (topK: 3)
✓ [1730304000000] Vector search completed in 42ms (3 results)
✓ [1730304000000] Extracted 3 unique sources
🤖 [1730304000000] Generating AI response...
✓ [1730304000000] Response generated in 285ms (total: 330ms)
```

### Error Logs

If something goes wrong:
```
❌ [1730304000000] Tool execution failed: Invalid input: Question cannot be empty
```

## 🚨 Troubleshooting

### Error: Missing required environment variables

**Problem:** `.env.local` file not found or incomplete

**Solution:**
1. Check that `.env.local` exists in the project root
2. Verify it contains all three variables:
   ```
   UPSTASH_VECTOR_REST_URL=https://...
   UPSTASH_VECTOR_REST_TOKEN=...
   GROQ_API_KEY=gsk_...
   ```
3. No quotes needed around values

### Error: Cannot run scripts (PowerShell)

**Problem:** PowerShell execution policy blocks scripts

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Or run directly:
```powershell
powershell -ExecutionPolicy Bypass -File .\start-mcp.ps1
```

### Server starts but "No vectors found"

**Problem:** Database is empty (0 vectors)

**Solution:** You need to upload your profile data first. The database currently has 0 vectors. See the next steps section.

## 📝 Available MCP Tools

Once running, your server exposes these tools:

### 1. query_digital_twin
```json
{
  "name": "query_digital_twin",
  "parameters": {
    "question": "What programming languages do you know?",
    "topK": 3
  }
}
```
Uses RAG to answer questions about your profile.

### 2. search_profile
```json
{
  "name": "search_profile",
  "parameters": {
    "query": "python experience",
    "topK": 3
  }
}
```
Returns raw search results without AI generation.

### 3. get_database_info
```json
{
  "name": "get_database_info",
  "parameters": {}
}
```
Shows database statistics (vector count, dimensions, etc.)

## 🎯 Next Steps

1. ✅ **Server is ready** - You can start it with `.\start-mcp.ps1`
2. ⏳ **Upload profile data** - Currently 0 vectors in database
3. ⏳ **Configure Claude Desktop** - Follow CLAUDE_DESKTOP_SETUP.md
4. ⏳ **Test RAG queries** - Ask questions about your profile

## 💡 Tips

- **Development:** Use `.\start-mcp.ps1` to test locally
- **Production:** Configure Claude Desktop to auto-start the server
- **Debugging:** Server logs show detailed timing and error information
- **Performance:** Check the timing logs to optimize slow queries

## 🔗 Related Files

- `CLAUDE_DESKTOP_SETUP.md` - Detailed Claude Desktop integration guide
- `CODE_ENHANCEMENTS.md` - Documentation of error handling and logging
- `TROUBLESHOOTING.md` - Common issues and solutions
- `.env.local` - Your environment variables (keep secret!)

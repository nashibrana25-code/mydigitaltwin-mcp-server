# Troubleshooting Guide - Digital Twin MCP Server

## ✅ System Check Results

### Current Status: **ALL CLEAR** ✓

- ✅ **TypeScript Compilation**: No errors
- ✅ **Environment Variables**: Properly configured in `.env.local`
- ✅ **Dependencies**: All required packages installed
- ✅ **Server Actions**: Correctly using `"use server"` directive
- ✅ **MCP Protocol**: Response format follows specification

---

## Expected Errors & Solutions

### 1. TypeScript Type Errors

#### Error: Property 'metadata' does not exist on type 'QueryResult'
**Status**: ✅ **RESOLVED** - Using proper type assertions

**Current Implementation**:
```typescript
const title = result.metadata?.title as string || "Information"
const content = result.metadata?.content as string || ""
```

**If this error occurs**:
- Ensure `@upstash/vector` is version `^1.2.2` or higher
- Use optional chaining (`?.`) and type assertions (`as string`)
- Verify `includeMetadata: true` in query options

---

### 2. Environment Variable Issues

#### Error: UPSTASH_VECTOR_REST_URL is undefined
**Status**: ✅ **RESOLVED** - Variables properly set

**Current `.env.local`**:
```env
UPSTASH_VECTOR_REST_URL="https://noble-zebra-94577-us1-vector.upstash.io"
UPSTASH_VECTOR_REST_TOKEN="ABUFMG5..."
UPSTASH_VECTOR_REST_READONLY_TOKEN="ABUIMG5..."
GROQ_API_KEY="gsk_Jg8..."
```

**If this error occurs**:
1. Verify `.env.local` exists in project root
2. Restart the development server: `pnpm dev`
3. Check for typos in variable names
4. Ensure no trailing spaces in `.env.local`
5. For MCP server, pass env vars in config:
   ```json
   "env": {
     "UPSTASH_VECTOR_REST_URL": "your_url"
   }
   ```

---

### 3. MCP Protocol Errors

#### Error: Invalid MCP response format
**Status**: ✅ **RESOLVED** - Following MCP specification

**Current Implementation**:
```typescript
return {
  content: [
    {
      type: "text",
      text: answer,
    },
  ],
};
```

**MCP Response Structure Requirements**:
- Must return `{ content: [...] }`
- Content items must have `type` and appropriate content field
- For errors, include `isError: true`

**If this error occurs**:
- Ensure response matches MCP specification
- Check the `CallToolRequestSchema` handler
- Verify content array structure
- Reference: `@modelcontextprotocol/sdk` types

---

### 4. Server Action Errors

#### Error: Server actions must be async functions
**Status**: ✅ **RESOLVED** - Proper async/await usage

**Current Implementation** (`app/actions/rag.ts`):
```typescript
"use server";

export async function ragQuery(question: string): Promise<RAGResult> {
  // Implementation
}
```

**Requirements**:
- ✅ `"use server"` directive at top of file
- ✅ All exported functions are `async`
- ✅ Return types properly defined
- ✅ Error handling with try/catch

**If this error occurs**:
1. Add `"use server"` at the very top of the file
2. Make all exported functions `async`
3. Ensure proper TypeScript return types
4. Handle errors appropriately

---

### 5. Dependency Issues

#### Error: Module '@upstash/vector' not found
**Status**: ✅ **RESOLVED** - All dependencies installed

**Installed Packages**:
```json
{
  "@modelcontextprotocol/sdk": "^1.20.2",
  "@upstash/vector": "^1.2.2",
  "groq": "^4.11.0",
  "groq-sdk": "^0.34.0",
  "zod": "^4.1.12",
  "tsx": "^4.20.6",
  "ts-node": "^10.9.2"
}
```

**If this error occurs**:
```powershell
# Install all dependencies
pnpm install

# Or install specific packages
pnpm add @upstash/vector groq-sdk @modelcontextprotocol/sdk zod

# Install dev dependencies
pnpm add -D tsx ts-node @types/node
```

---

## Additional Common Issues

### 6. Import Path Errors

#### Error: Cannot find module '@/lib/vector'
**Solution**:
- Verify `tsconfig.json` has path aliases configured
- Current config should include:
  ```json
  {
    "compilerOptions": {
      "paths": {
        "@/*": ["./*"]
      }
    }
  }
  ```

---

### 7. Groq API Errors

#### Error: Invalid API key
**Symptoms**: 401 Unauthorized from Groq

**Solution**:
1. Verify `GROQ_API_KEY` in `.env.local`
2. Check API key is valid at https://console.groq.com
3. Ensure no quotes in environment variable value
4. Restart dev server after changing `.env.local`

---

### 8. Upstash Vector Errors

#### Error: Vector database returns 0 results
**Symptoms**: "I don't have specific information about that topic"

**Solution**:
1. Check database has vectors:
   ```typescript
   const info = await index.info();
   console.log(info.vectorCount); // Should be > 0
   ```
2. Upload profile data using embed script
3. Verify vectors uploaded successfully
4. Check query format and metadata structure

---

### 9. MCP Server Won't Start

#### Error: MCP server fails to start
**Symptoms**: Command `pnpm mcp` fails

**Solutions**:
```powershell
# Check TypeScript compilation
pnpm build

# Test tsx installation
pnpm tsx --version

# Run with verbose logging
pnpm tsx server/index.ts

# Check for port conflicts
# MCP uses stdio, not ports, so this is rare
```

---

### 10. Next.js Development Issues

#### Error: Module not found in development
**Solution**:
```powershell
# Clear Next.js cache
rm -r .next

# Reinstall dependencies
rm -r node_modules
pnpm install

# Restart dev server
pnpm dev
```

---

## Testing Checklist

### Environment
- [ ] `.env.local` file exists
- [ ] All 4 environment variables are set
- [ ] No syntax errors in `.env.local`

### Dependencies
- [ ] `pnpm install` completed successfully
- [ ] `node_modules` folder exists
- [ ] No peer dependency warnings

### TypeScript
- [ ] `tsconfig.json` configured correctly
- [ ] No compilation errors
- [ ] Path aliases working (`@/lib/*`)

### MCP Server
- [ ] `server/index.ts` has no errors
- [ ] MCP tools defined correctly
- [ ] Response format matches specification

### Server Actions
- [ ] `"use server"` directive present
- [ ] All functions are async
- [ ] Proper error handling

---

## Quick Diagnostics

### Check Database Connection
```typescript
// Add to test page or run in console
const stats = await getDatabaseStats();
console.log(stats);
// Should show: { success: true, vectorCount: X, ... }
```

### Test Groq Connection
```bash
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY"
```

### Verify MCP Server
```powershell
# Test MCP server stdio communication
pnpm mcp
# Should output: "Digital Twin MCP Server running on stdio"
```

---

## Debug Mode

### Enable Verbose Logging

**In `server/index.ts`**, add:
```typescript
server.onerror = (error) => {
  console.error("[MCP Server Error]", error);
};

// Add logging to handlers
console.error("[MCP] Tool called:", request.params.name);
```

**In `app/actions/rag.ts`**, add:
```typescript
export async function ragQuery(question: string): Promise<RAGResult> {
  console.log("[RAG] Query:", question);
  
  try {
    const results = await queryVectors(question, 3);
    console.log("[RAG] Vector results:", results.length);
    // ... rest of implementation
  }
}
```

---

## 11. MCP Connection Issues with VS Code Insiders

### Troubleshooting MCP Integration with GitHub Copilot

#### MCP Server Not Responding

**Symptoms**: VS Code can't connect to MCP server

**Solutions**:
- ✅ Verify server is running on http://localhost:3000
  ```powershell
  # Check if server is running
  curl http://localhost:3000/api/mcp
  ```
- ✅ Check `.vscode/mcp.json` exists and is valid JSON
  ```json
  {
    "servers": {
      "digital-twin-mcp": {
        "type": "http",
        "url": "http://localhost:3000/api/mcp"
      }
    }
  }
  ```
- ✅ Restart VS Code Insiders after creating MCP config
  - Press `Ctrl+Shift+P` → `Developer: Reload Window`
- ✅ Ensure no firewall blocking localhost:3000
  ```powershell
  # Check if port 3000 is accessible
  Test-NetConnection -ComputerName localhost -Port 3000
  ```

#### GitHub Copilot Not Using MCP

**Symptoms**: Copilot doesn't recognize MCP server or tools

**Solutions**:
- ✅ Confirm GitHub Copilot has MCP features enabled
  - Open Settings (`Ctrl+,`)
  - Search for "copilot mcp"
  - Enable "GitHub Copilot: Use MCP Servers"
- ✅ Check VS Code Insiders version (needs latest version)
  - Help → About → Check for updates
  - MCP support requires recent VS Code Insiders build
- ✅ Verify `@workspace` prefix in prompts
  - Use: "Can you tell me about my work experience using the digital twin MCP server?"
  - Or: "@workspace what are my skills?"
- ✅ Try restarting GitHub Copilot extension
  - `Ctrl+Shift+P` → "GitHub Copilot: Restart Extension Host"

#### No Digital Twin Responses

**Symptoms**: MCP server responds but returns empty/error results

**Solutions**:
- ✅ Check server logs for Upstash/Groq connection errors
  ```
  Terminal output should show:
  ✓ Upstash Vector client initialized
  ✓ Groq client initialized
  ```
- ✅ Verify environment variables in `.env.local`
  ```powershell
  Get-Content .env.local | Select-String "UPSTASH|GROQ"
  ```
- ✅ Test `/api/mcp` endpoint directly in browser
  - Navigate to http://localhost:3000/api/mcp
  - Should see JSON health check response
- ✅ Ensure `digitaltwin.json` data was loaded into vector database
  ```powershell
  # Check vector count
  pnpm tsx scripts/upload-profile.ts
  ```

#### Debugging Commands

**Test MCP endpoint directly**:
```powershell
# Test with curl (PowerShell)
$body = @{
    jsonrpc = "2.0"
    method = "tools/list"
    id = 1
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/mcp" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

**Expected response**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "tools": [
      {
        "name": "query_digital_twin",
        "description": "Ask questions about the person's professional background..."
      },
      {
        "name": "search_profile",
        "description": "Search specific sections of the professional profile..."
      },
      {
        "name": "get_database_info",
        "description": "Get information about the vector database..."
      }
    ]
  },
  "id": 1
}
```

**Check server logs for errors**:
```powershell
# Run with verbose output
pnpm dev --verbose

# Watch for these log entries:
# ✓ Upstash Vector client initialized
# ✓ Groq client initialized
# GET /api/mcp 200 in Xms
# POST /api/mcp 200 in Xms
```

#### Claude Desktop vs VS Code Insiders

**Different Connection Methods**:

**Claude Desktop** (via `claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "digital-twin": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:3000/api/mcp"]
    }
  }
}
```

**VS Code Insiders** (via `.vscode/mcp.json`):
```json
{
  "servers": {
    "digital-twin-mcp": {
      "type": "http",
      "url": "http://localhost:3000/api/mcp"
    }
  }
}
```

Both connect to the same HTTP endpoint but use different config formats.

---

## 12. Common MCP Runtime Issues

### MCP Server Not Found

**Symptoms**: Claude Desktop or VS Code can't locate the MCP server

**Solutions**:
- ✅ Verify `mcp-remote` is still running (don't close the terminal)
  ```powershell
  # Check if mcp-remote process is active
  Get-Process -Name "node" | Where-Object { $_.CommandLine -like "*mcp-remote*" }
  ```
- ✅ Ensure Next.js dev server is running on localhost:3000
  ```powershell
  # Verify server is running
  curl http://localhost:3000/api/mcp
  # Should return JSON response, not error
  ```
- ✅ Check Claude Desktop MCP configuration syntax
  - Open `%APPDATA%\Claude\claude_desktop_config.json`
  - Verify JSON is valid:
    ```powershell
    try { 
      Get-Content "$env:APPDATA\Claude\claude_desktop_config.json" -Raw | ConvertFrom-Json | Out-Null
      Write-Host "✓ JSON is valid" -ForegroundColor Green 
    } catch { 
      Write-Host "✗ JSON is invalid: $_" -ForegroundColor Red 
    }
    ```
- ✅ Restart Claude Desktop after configuration changes
  ```powershell
  # Force close Claude Desktop
  Get-Process -Name "Claude" -ErrorAction SilentlyContinue | Stop-Process -Force
  # Then reopen Claude Desktop
  ```

### No Digital Twin Responses

**Symptoms**: MCP tools load but return no data or errors

**Solutions**:
- ✅ Verify MCP endpoint responds correctly
  ```powershell
  # Test endpoint health
  Invoke-RestMethod -Uri "http://localhost:3000/api/mcp" -Method GET
  # Should return: { status: "ok", upstash: "connected", groq: "connected" }
  ```
- ✅ Check server logs for Upstash/Groq connection errors
  - Look for error messages in the terminal running `pnpm dev`
  - Common errors:
    - `UPSTASH_VECTOR_REST_URL is undefined`
    - `GROQ_API_KEY is undefined`
    - `401 Unauthorized` from Groq
    - `Network error` from Upstash
- ✅ Ensure `digitaltwin.json` was properly embedded
  ```powershell
  # Re-run embedding script
  cd digital-twin-workshop
  pnpm tsx scripts/upload-profile.ts
  
  # Should see:
  # ✓ Created 43 content chunks
  # ✓ Database now contains 135 vectors
  ```
- ✅ Test with VS Code first to isolate issues
  - Use VS Code Insiders with `.vscode/mcp.json`
  - Prompt: "@workspace what are my technical skills?"
  - If works in VS Code but not Claude Desktop → Claude config issue
  - If fails in both → server/database issue

### Slow or Timeout Responses

**Symptoms**: MCP tools take >30 seconds or timeout

**Solutions**:
- ✅ Check internet connection for Upstash/Groq API calls
  ```powershell
  # Test Upstash connectivity
  Test-NetConnection -ComputerName noble-zebra-94577-us1-vector.upstash.io -Port 443
  
  # Test Groq connectivity
  Test-NetConnection -ComputerName api.groq.com -Port 443
  ```
- ✅ Verify API keys in `.env.local` file
  ```powershell
  # Check environment variables are loaded
  cd digital-twin-mcp
  Get-Content .env.local | Select-String "UPSTASH|GROQ"
  ```
- ✅ Increase timeout in Claude Desktop configuration
  ```json
  {
    "mcpServers": {
      "digital-twin": {
        "command": "npx",
        "args": ["-y", "mcp-remote", "http://localhost:3000/api/mcp"],
        "timeout": 60000
      }
    }
  }
  ```
- ✅ Monitor server performance in terminal logs
  - Watch for slow API response times in logs
  - Check for multiple concurrent requests
  - Verify Groq rate limits not exceeded
  ```
  Expected log times:
  POST /api/mcp 200 in 1500-3000ms  ← Normal
  POST /api/mcp 200 in 10000ms      ← Slow (investigate)
  POST /api/mcp 504 in 30000ms      ← Timeout (check APIs)
  ```

### Debugging Steps

**Sequential Troubleshooting Workflow**:

**Step 1: Test MCP server directly in VS Code first**
```
1. Open VS Code Insiders
2. Create/verify .vscode/mcp.json exists
3. Restart VS Code → Developer: Reload Window
4. New Copilot chat: "@workspace what are my skills?"
5. If works → Issue is Claude Desktop config
6. If fails → Issue is MCP server/database
```

**Step 2: Verify mcp-remote tunnel is active**
```powershell
# Check if mcp-remote is running
Get-Process -Name "node" | Select-Object Id, ProcessName, StartTime

# If not running, start it:
cd digital-twin-mcp
npx -y mcp-remote http://localhost:3000/api/mcp
# Keep this terminal open!
```

**Step 3: Check Claude Desktop logs/error messages**
```powershell
# Claude Desktop log location
notepad "$env:APPDATA\Claude\logs\mcp.log"

# Look for:
# - "Server disconnected" → mcp-remote not running
# - "Tool not found" → MCP endpoint issue
# - "Timeout" → API connection issue
# - "Invalid response" → Server error
```

**Step 4: Restart all components in sequence**
```powershell
# 1. Stop Claude Desktop
Get-Process -Name "Claude" -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Stop mcp-remote (Ctrl+C in terminal)

# 3. Restart Next.js dev server
cd digital-twin-mcp
# Ctrl+C to stop, then:
pnpm dev

# 4. Wait for server to be ready (shows "Local: http://localhost:3000")

# 5. Start mcp-remote in NEW terminal
npx -y mcp-remote http://localhost:3000/api/mcp

# 6. Reopen Claude Desktop

# 7. Test with simple query:
# "Hi Claude, can you use the digital twin MCP server to tell me about my work experience?"
```

**Quick Diagnostic Checklist**:
```
□ Next.js server running on localhost:3000
□ /api/mcp endpoint returns JSON health check
□ .env.local has all 4 API keys
□ mcp-remote tunnel active (terminal open)
□ claude_desktop_config.json is valid JSON
□ Claude Desktop restarted after config changes
□ Vector database has >0 vectors
□ No firewall blocking localhost connections
```

---

## Getting Help

### If Issues Persist:

1. **Check TypeScript compilation**: `pnpm build`
2. **Review server logs**: Check terminal output
3. **Test individual components**:
   - Test Upstash connection separately
   - Test Groq API separately
   - Test MCP server response format

4. **Common fix**: Restart everything
   ```powershell
   # Stop all servers (Ctrl+C)
   rm -r .next
   pnpm dev
   ```

5. **Verify versions**:
   ```powershell
   node --version  # Should be 18+
   pnpm --version  # Should be 8+
   pnpm list @upstash/vector groq-sdk
   ```

---

## Summary

**Current Status**: ✅ **All systems operational**

Your Digital Twin MCP Server is properly configured with:
- ✅ Correct TypeScript types
- ✅ Valid environment variables
- ✅ All dependencies installed
- ✅ MCP protocol compliance
- ✅ Proper server actions
- ✅ Error handling

**Next Step**: Upload profile data to Upstash Vector to enable full functionality!

---

**Last Checked**: October 30, 2025
**All Checks Passed**: Yes ✓

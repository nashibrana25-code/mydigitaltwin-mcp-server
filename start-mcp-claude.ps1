# MCP Server Startup - Keeps process alive for Claude Desktop
$ErrorActionPreference = "Stop"
Set-Location "C:\Users\nashi\Week 5\digital-twin-mcp"

# Load environment variables from .env.local
Get-Content .env.local | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim() -replace '^["' + "']|[" + '"]$'
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

# Start MCP server - it will run in foreground and communicate via stdio
& pnpm --silent mcp 2>&1

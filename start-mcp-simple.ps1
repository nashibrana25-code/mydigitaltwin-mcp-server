# Simple MCP Server Startup
Set-Location "C:\Users\nashi\Week 5\digital-twin-mcp"

# Load environment variables
Get-Content .env.local | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim() -replace '^["' + "']|[" + '"]$'
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

# Start MCP server
& pnpm mcp

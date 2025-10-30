# MCP Server Startup Script
# This loads environment variables from .env.local and starts the MCP server

Write-Host "🚀 Starting Digital Twin MCP Server..." -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env.local
$envFile = Join-Path $PSScriptRoot ".env.local"

if (Test-Path $envFile) {
    Write-Host "📄 Loading environment from .env.local..." -ForegroundColor Yellow
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            # Remove quotes if present
            $value = $value -replace '^["'']|["'']$'
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
            Write-Host "  ✓ Loaded $key" -ForegroundColor Green
        }
    }
    Write-Host ""
} else {
    Write-Host "❌ Error: .env.local not found!" -ForegroundColor Red
    Write-Host "Please create .env.local with your credentials:" -ForegroundColor Yellow
    Write-Host "  UPSTASH_VECTOR_REST_URL=..." -ForegroundColor Gray
    Write-Host "  UPSTASH_VECTOR_REST_TOKEN=..." -ForegroundColor Gray
    Write-Host "  GROQ_API_KEY=..." -ForegroundColor Gray
    exit 1
}

# Validate required variables
$required = @("UPSTASH_VECTOR_REST_URL", "UPSTASH_VECTOR_REST_TOKEN", "GROQ_API_KEY")
$missing = @()

foreach ($var in $required) {
    if (-not [Environment]::GetEnvironmentVariable($var, "Process")) {
        $missing += $var
    }
}

if ($missing.Count -gt 0) {
    Write-Host "❌ Missing required environment variables:" -ForegroundColor Red
    foreach ($var in $missing) {
        Write-Host "  - $var" -ForegroundColor Red
    }
    exit 1
}

Write-Host "✓ All environment variables loaded" -ForegroundColor Green
Write-Host ""
Write-Host "Starting MCP server..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

# Start the MCP server
& pnpm mcp

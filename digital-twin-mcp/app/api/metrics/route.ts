// Prometheus metrics endpoint
// Returns metrics in Prometheus text format

export const dynamic = 'force-dynamic';

export async function GET() {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const currentTime = Date.now() / 1000;
  
  const metrics = `
# HELP mcp_uptime_seconds Process uptime in seconds
# TYPE mcp_uptime_seconds gauge
mcp_uptime_seconds ${uptime}

# HELP mcp_memory_used_bytes Memory used by the process
# TYPE mcp_memory_used_bytes gauge
mcp_memory_used_bytes{type="rss"} ${memoryUsage.rss}
mcp_memory_used_bytes{type="heapTotal"} ${memoryUsage.heapTotal}
mcp_memory_used_bytes{type="heapUsed"} ${memoryUsage.heapUsed}
mcp_memory_used_bytes{type="external"} ${memoryUsage.external}

# HELP mcp_timestamp_seconds Current timestamp
# TYPE mcp_timestamp_seconds gauge
mcp_timestamp_seconds ${currentTime}

# HELP mcp_server_info Server information
# TYPE mcp_server_info gauge
mcp_server_info{version="1.0.0",node_version="${process.version}"} 1
`.trim();

  return new Response(metrics, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

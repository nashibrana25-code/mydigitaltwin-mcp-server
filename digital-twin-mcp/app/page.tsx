export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Digital Twin MCP Server</h1>
        <p className="text-muted-foreground mb-8">
          RAG-powered professional assistant using Model Context Protocol
        </p>

        <div className="space-y-6">
          <section className="border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-3">🚀 Server Status</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Your MCP server is ready to receive requests via stdio transport.
            </p>
            <div className="bg-muted p-4 rounded font-mono text-sm">
              <p>✓ Vector Database: Upstash Vector</p>
              <p>✓ LLM: Groq (llama-3.1-8b-instant)</p>
              <p>✓ Protocol: Model Context Protocol</p>
            </div>
          </section>

          <section className="border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-3">🛠️ Available Tools</h2>
            <div className="space-y-4">
              <div className="border-l-4 border-primary pl-4">
                <h3 className="font-semibold">query_digital_twin</h3>
                <p className="text-sm text-muted-foreground">
                  Query the professional profile using RAG. Returns personalized AI-generated responses.
                </p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <h3 className="font-semibold">search_profile</h3>
                <p className="text-sm text-muted-foreground">
                  Search for specific information. Returns raw context chunks without AI generation.
                </p>
              </div>
            </div>
          </section>

          <section className="border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-3">📖 Usage</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Configure your MCP client to connect to this server:
            </p>
            <pre className="bg-muted p-4 rounded overflow-x-auto text-sm">
{`{
  "mcpServers": {
    "digital-twin": {
      "command": "node",
      "args": ["path/to/server/index.js"],
      "env": {
        "UPSTASH_VECTOR_REST_URL": "...",
        "UPSTASH_VECTOR_REST_TOKEN": "...",
        "GROQ_API_KEY": "..."
      }
    }
  }
}`}
            </pre>
          </section>

          <section className="border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-3">⚙️ Configuration</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Required environment variables:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><code className="bg-muted px-2 py-1 rounded">UPSTASH_VECTOR_REST_URL</code></li>
              <li><code className="bg-muted px-2 py-1 rounded">UPSTASH_VECTOR_REST_TOKEN</code></li>
              <li><code className="bg-muted px-2 py-1 rounded">GROQ_API_KEY</code></li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}

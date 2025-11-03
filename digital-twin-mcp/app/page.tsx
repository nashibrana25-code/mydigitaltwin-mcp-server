'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: 'query_digital_twin',
            arguments: {
              question: input,
            },
          },
        }),
      });

      const data = await response.json();
      
      let assistantContent = 'Sorry, I encountered an error processing your request.';
      
      if (data.result?.content?.[0]?.text) {
        assistantContent = data.result.content[0].text;
      } else if (data.error) {
        assistantContent = `Error: ${data.error.message || 'Unknown error'}`;
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to connect to server'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold">Digital Twin Chat</h1>
          <p className="text-muted-foreground">
            Ask questions about the professional profile using RAG
          </p>
        </div>

        {/* Chat Interface */}
        <div className="border rounded-lg bg-card shadow-lg">
          {/* Messages Area */}
          <div className="h-[500px] sm:h-[600px] overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-lg font-medium mb-4">Start a conversation!</p>
                <div className="space-y-2 text-sm max-w-md">
                  <p className="font-semibold">Try asking:</p>
                  <ul className="space-y-1 text-left">
                    <li>• What programming languages do you know?</li>
                    <li>• Tell me about your work experience</li>
                    <li>• What projects have you worked on?</li>
                    <li>• What are your career goals?</li>
                    <li>• What certifications do you have?</li>
                  </ul>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-lg p-3 sm:p-4 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-xs font-semibold mb-1 opacity-75">
                        {message.role === 'user' ? 'You' : 'Digital Twin'}
                      </p>
                      <p className="whitespace-pre-wrap text-sm sm:text-base">{message.content}</p>
                      <p className="text-xs opacity-60 mt-2">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[75%] rounded-lg p-4 bg-muted">
                      <p className="text-xs font-semibold mb-1 opacity-75">Digital Twin</p>
                      <p className="flex items-center gap-2 text-sm">
                        <span className="inline-block w-2 h-2 bg-current rounded-full animate-bounce"></span>
                        <span className="inline-block w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                        <span className="inline-block w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                        <span>Thinking...</span>
                      </p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 border-t bg-muted/50">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about the profile..."
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base whitespace-nowrap"
              >
                {isLoading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        </div>

        {/* Info Cards */}
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="border rounded-lg p-4 bg-card">
            <h3 className="font-semibold mb-2">🔌 Claude Desktop Integration</h3>
            <p className="text-muted-foreground text-xs mb-2">Add to your MCP settings:</p>
            <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
{`"digital-twin": {
  "command": "npx",
  "args": ["-y", "mcp-remote",
    "https://mydigitaltwin-mcp-server.vercel.app/api/mcp"]
}`}
            </pre>
          </div>

          <div className="border rounded-lg p-4 bg-card">
            <h3 className="font-semibold mb-2">⚡ Powered By</h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>✓ <strong>Vector DB:</strong> Upstash Vector (RAG)</li>
              <li>✓ <strong>LLM:</strong> Groq (llama-3.1-8b-instant)</li>
              <li>✓ <strong>Protocol:</strong> Model Context Protocol</li>
              <li>✓ <strong>Framework:</strong> Next.js 15</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}

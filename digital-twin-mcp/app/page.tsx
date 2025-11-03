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
    <main className="min-h-screen bg-black p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">Digital Twin Chat</h1>
          <p className="text-gray-400">
            Ask questions about the professional profile using RAG
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Chat Interface - Takes 2 columns */}
          <div className="lg:col-span-2 border border-gray-800 rounded-lg bg-zinc-950 shadow-2xl">
            {/* Messages Area */}
            <div className="h-[400px] sm:h-[500px] overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-lg font-medium mb-4 text-gray-400">Start a conversation!</p>
                <div className="space-y-2 text-sm max-w-md">
                  <p className="font-semibold text-gray-400">Try asking:</p>
                  <ul className="space-y-1 text-left text-gray-500">
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
                          ? 'bg-white text-black'
                          : 'bg-zinc-900 text-white border border-gray-800'
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
                    <div className="max-w-[75%] rounded-lg p-4 bg-zinc-900 border border-gray-800 text-white">
                      <p className="text-xs font-semibold mb-1 opacity-75">Digital Twin</p>
                      <p className="flex items-center gap-2 text-sm">
                        <span className="inline-block w-2 h-2 bg-white rounded-full animate-bounce"></span>
                        <span className="inline-block w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                        <span className="inline-block w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
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
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 border-t border-gray-800 bg-black">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about the profile..."
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-800 rounded-lg bg-zinc-950 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white text-sm sm:text-base"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base whitespace-nowrap"
              >
                {isLoading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        </div>

        {/* Info Sidebar - Takes 1 column */}
        <div className="space-y-4">
          <div className="border border-gray-800 rounded-lg p-4 bg-zinc-950 sticky top-4">
            <h3 className="font-semibold mb-3 text-white">🔌 Claude Desktop Integration</h3>
            <p className="text-gray-500 text-xs mb-2">Add to your MCP settings:</p>
            <pre className="bg-black border border-gray-800 p-2 rounded text-xs overflow-x-auto text-gray-400">
{`"digital-twin": {
  "command": "npx",
  "args": ["-y", "mcp-remote",
    "https://mydigitaltwin-mcp-server.vercel.app/api/mcp"]
}`}
            </pre>
          </div>

          <div className="border border-gray-800 rounded-lg p-4 bg-zinc-950">
            <h3 className="font-semibold mb-3 text-white">⚡ Powered By</h3>
            <ul className="space-y-2 text-xs text-gray-400">
              <li>✓ <strong className="text-white">Vector DB:</strong> Upstash Vector (RAG)</li>
              <li>✓ <strong className="text-white">LLM:</strong> Groq (llama-3.1-8b-instant)</li>
              <li>✓ <strong className="text-white">Protocol:</strong> Model Context Protocol</li>
              <li>✓ <strong className="text-white">Framework:</strong> Next.js 15</li>
            </ul>
          </div>
        </div>
      </div>
      </div>
    </main>
  );
}   </main>
  );
}

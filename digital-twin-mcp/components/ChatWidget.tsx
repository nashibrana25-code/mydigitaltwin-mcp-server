'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
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
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-black border-2 border-white rounded-full shadow-2xl hover:scale-110 transition-transform duration-200 flex items-center justify-center text-white z-50"
          aria-label="Open chat"
        >
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          {/* Notification dot */}
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-black rounded-2xl shadow-2xl flex flex-col z-50 border-2 border-white">
          {/* Chat Header */}
          <div className="bg-white text-black p-4 rounded-t-2xl flex justify-between items-center border-b-2 border-gray-800">
            <div>
              <h3 className="font-bold text-lg">Chat with Nashib&apos;s AI</h3>
              <p className="text-xs opacity-90">Ask me anything!</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-gray-200 rounded-full p-2 transition-colors"
              aria-label="Close chat"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-900">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                <div className="text-5xl mb-3">💬</div>
                <p className="text-sm font-medium mb-3 text-gray-300">Start a conversation!</p>
                <div className="space-y-1 text-xs max-w-xs">
                  <p className="font-semibold text-gray-300">Try asking:</p>
                  <ul className="space-y-1 text-left text-gray-400">
                    <li>• What skills do you have?</li>
                    <li>• Tell me about your projects</li>
                    <li>• What&apos;s your experience?</li>
                    <li>• What are your goals?</li>
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
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-white text-black'
                          : 'bg-gray-800 text-white border border-gray-700'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-60 mt-1">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gray-800 border border-gray-700">
                      <p className="flex items-center gap-2 text-sm text-gray-300">
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
          <form onSubmit={handleSubmit} className="p-4 bg-black border-t-2 border-white rounded-b-2xl">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-white rounded-full bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white text-sm"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 bg-white text-black rounded-full font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

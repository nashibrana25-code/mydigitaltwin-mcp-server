"use client";

import { useState } from "react";
import { ragQuery, getDatabaseStats, type RAGResult } from "@/app/actions/rag";

interface DatabaseStats {
  success: boolean;
  vectorCount?: number;
  dimension?: number;
  similarityFunction?: string;
  error?: string;
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<RAGResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DatabaseStats | null>(null);

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    try {
      const response = await ragQuery(question);
      setResult(response);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    const statsData = await getDatabaseStats();
    setStats(statsData);
  };

  return (
    <main className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Digital Twin MCP Server</h1>
          <p className="text-muted-foreground">
            Ask questions about Nashib&apos;s professional background, skills, and experience.
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={loadStats}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
          >
            Load Database Stats
          </button>
        </div>

        {stats && (
          <div className="p-4 bg-card rounded-lg border">
            <h2 className="text-lg font-semibold mb-2">Database Statistics</h2>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Vectors:</dt>
              <dd>{stats.vectorCount}</dd>
              <dt className="text-muted-foreground">Dimension:</dt>
              <dd>{stats.dimension}</dd>
              <dt className="text-muted-foreground">Similarity:</dt>
              <dd>{stats.similarityFunction}</dd>
            </dl>
          </div>
        )}

        <form onSubmit={handleQuery} className="space-y-4">
          <div>
            <label htmlFor="question" className="block text-sm font-medium mb-2">
              Your Question
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full p-3 bg-background border rounded-md min-h-[100px]"
              placeholder="e.g., Tell me about your work experience"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Searching..." : "Ask Question"}
          </button>
        </form>

        {result && (
          <div className="space-y-4">
            <div className="p-6 bg-card rounded-lg border">
              <h2 className="text-lg font-semibold mb-3">Answer</h2>
              <p className="text-sm leading-relaxed">{result.answer}</p>
            </div>

            {result.sources && result.sources.length > 0 && (
              <div className="p-6 bg-card rounded-lg border">
                <h2 className="text-lg font-semibold mb-3">Sources</h2>
                <div className="space-y-3">
                  {result.sources.map((source, idx) => (
                    <div key={idx} className="p-3 bg-muted rounded-md">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-medium text-sm">{source.title}</h3>
                        <span className="text-xs text-muted-foreground">
                          {(source.score * 100).toFixed(1)}% match
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {source.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Example Questions:</h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Tell me about your work experience</li>
            <li>• What are your technical skills?</li>
            <li>• Describe your Hogwarts Library project</li>
            <li>• What cybersecurity tools have you used?</li>
            <li>• What are your career goals?</li>
          </ul>
        </div>

        <div className="p-4 bg-card rounded-lg border">
          <h3 className="font-semibold mb-2">MCP Server Info</h3>
          <p className="text-sm text-muted-foreground mb-2">
            This MCP server exposes the following tools:
          </p>
          <ul className="text-sm space-y-1">
            <li><code className="px-2 py-1 bg-muted rounded">query_digital_twin</code> - Ask questions with RAG</li>
            <li><code className="px-2 py-1 bg-muted rounded">search_profile</code> - Search profile sections</li>
            <li><code className="px-2 py-1 bg-muted rounded">get_database_info</code> - Get vector DB stats</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

/**
 * Server Actions for RAG (Retrieval Augmented Generation)
 * Handles digital twin queries with vector search and LLM generation
 */

"use server";

import { queryVectors, getVectorInfo } from "@/lib/vector";
import { generateResponse } from "@/lib/groq";

export interface RAGResult {
  answer: string;
  sources: Array<{
    title: string;
    content: string;
    score: number;
  }>;
  success: boolean;
  error?: string;
  metadata?: {
    processingTimeMs: number;
    vectorSearchTimeMs?: number;
    llmGenerationTimeMs?: number;
    sourcesFound: number;
  };
}

/**
 * Perform RAG query with comprehensive logging and error handling
 * Pipeline: Query validation → Vector search → Context building → LLM generation
 * 
 * @param {string} question - User's question
 * @returns {Promise<RAGResult>} RAG result with answer and sources
 */
export async function ragQuery(question: string): Promise<RAGResult> {
  const startTime = Date.now();
  
  console.log("\n🔍 ===== RAG QUERY START =====");
  console.log(`📝 Question: "${question}"`);
  
  // Step 1: Input validation
  if (!question || question.trim().length === 0) {
    console.error("❌ Empty question provided");
    return {
      answer: "Please provide a question.",
      sources: [],
      success: false,
      error: "Empty question",
      metadata: {
        processingTimeMs: Date.now() - startTime,
        sourcesFound: 0
      }
    };
  }

  try {
    // Step 2: Query vector database for relevant content
    console.log("\n📊 Step 1: Searching vector database...");
    const vectorSearchStart = Date.now();
    
    const results = await queryVectors(question, 3);
    const vectorSearchTime = Date.now() - vectorSearchStart;
    
    console.log(`✓ Vector search completed in ${vectorSearchTime}ms`);
    console.log(`📦 Found ${results?.length || 0} results`);
    
    if (!results || results.length === 0) {
      console.warn("⚠️ No relevant context found in vector database");
      const totalTime = Date.now() - startTime;
      return {
        answer: "I don't have specific information about that topic. The profile may need to be uploaded to the vector database first.",
        sources: [],
        success: true,
        metadata: {
          processingTimeMs: totalTime,
          vectorSearchTimeMs: vectorSearchTime,
          sourcesFound: 0
        }
      };
    }

    // Step 3: Extract relevant content and metadata with deduplication
    console.log("\n🏗️ Step 2: Extracting and validating sources...");
    const seenContents = new Set<string>();
    const sources = results
      .map((result) => ({
        title: result.metadata?.title as string || "Information",
        content: result.metadata?.content as string || "",
        score: result.score || 0
      }))
      .filter(source => {
        // Filter out empty content
        if (!source.content) {
          return false;
        }
        // Deduplicate by content
        if (seenContents.has(source.content)) {
          return false;
        }
        seenContents.add(source.content);
        return true;
      });

    console.log(`✓ Extracted ${sources.length} unique valid sources`);

    if (sources.length === 0) {
      console.warn("⚠️ No valid content extracted from results");
      const totalTime = Date.now() - startTime;
      return {
        answer: "I found some information but couldn't extract details. Please try rephrasing your question.",
        sources: [],
        success: true,
        metadata: {
          processingTimeMs: totalTime,
          vectorSearchTimeMs: vectorSearchTime,
          sourcesFound: 0
        }
      };
    }

    // Step 4: Build context from top documents
    console.log("\n🏗️ Step 3: Building context...");
    const context = sources
      .map(source => `${source.title}: ${source.content}`)
      .join("\n\n");
    
    console.log(`✓ Built context: ${context.length} characters`);

    // Step 5: Generate response with context
    console.log("\n🤖 Step 4: Generating AI response...");
    const llmStart = Date.now();
    
    const prompt = `Based on the following information about yourself, answer the question.
Speak in first person as if you are describing your own background.

Your Information:
${context}

Question: ${question}

Provide a helpful, professional response:`;

    const answer = await generateResponse(prompt);
    const llmTime = Date.now() - llmStart;
    
    console.log(`✓ AI response generated in ${llmTime}ms`);
    console.log(`📄 Response length: ${answer.length} characters`);

    const totalTime = Date.now() - startTime;
    console.log(`\n✓ ===== RAG QUERY COMPLETE in ${totalTime}ms =====\n`);

    return {
      answer,
      sources,
      success: true,
      metadata: {
        processingTimeMs: totalTime,
        vectorSearchTimeMs: vectorSearchTime,
        llmGenerationTimeMs: llmTime,
        sourcesFound: sources.length
      }
    };

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error("\n❌ ===== RAG QUERY FAILED =====");
    console.error("Error:", error);
    console.error(`Failed after ${totalTime}ms\n`);
    
    return {
      answer: "An error occurred while processing your question. Please try again.",
      sources: [],
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      metadata: {
        processingTimeMs: totalTime,
        sourcesFound: 0
      }
    };
  }
}

/**
 * Get database statistics with error handling
 * @returns {Promise<Object>} Database information and status
 */
export async function getDatabaseStats() {
  try {
    console.log("📊 Fetching database statistics...");
    const info = await getVectorInfo();
    
    const vectorCount = info.vectorCount || 0;
    console.log(`✓ Database stats: ${vectorCount} vectors`);
    
    return {
      success: true,
      vectorCount,
      dimension: info.dimension || 0,
      similarityFunction: info.similarityFunction || "unknown"
    };
  } catch (error) {
    console.error("❌ Failed to fetch database stats:", error);
    return {
      success: false,
      vectorCount: 0,
      dimension: 0,
      similarityFunction: "unknown",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}


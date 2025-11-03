import { Index } from "@upstash/vector";

if (!process.env.UPSTASH_VECTOR_REST_URL) {
  throw new Error("UPSTASH_VECTOR_REST_URL is not defined");
}

if (!process.env.UPSTASH_VECTOR_REST_TOKEN) {
  throw new Error("UPSTASH_VECTOR_REST_TOKEN is not defined");
}

export const vectorIndex = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

export interface VectorQueryResult {
  id: string;
  score: number;
  metadata?: {
    title?: string;
    type?: string;
    content?: string;
    category?: string;
    tags?: string[];
  };
}

export async function queryVectors(
  query: string,
  topK: number = 3
): Promise<VectorQueryResult[]> {
  try {
    console.log(`[Vector] Querying with: "${query.substring(0, 50)}..." (topK=${topK})`);
    
    const results = await vectorIndex.query({
      data: query,
      topK,
      includeMetadata: true,
    });

    console.log(`[Vector] Found ${results.length} results`);
    
    if (results.length > 0) {
      console.log(`[Vector] First result score: ${results[0].score}, metadata:`, results[0].metadata);
    }

    return results as VectorQueryResult[];
  } catch (error) {
    console.error("[Vector] Error querying vectors:", error);
    throw new Error("Failed to query vector database");
  }
}

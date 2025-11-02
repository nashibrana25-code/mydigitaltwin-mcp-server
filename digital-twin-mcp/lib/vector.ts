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
    const results = await vectorIndex.query({
      data: query,
      topK,
      includeMetadata: true,
    });

    return results as VectorQueryResult[];
  } catch (error) {
    console.error("Error querying vectors:", error);
    throw new Error("Failed to query vector database");
  }
}

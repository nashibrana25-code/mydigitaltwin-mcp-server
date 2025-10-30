/**
 * Upstash Vector Database Utilities
 * Handles all vector database operations including querying and database info retrieval
 */

import { Index } from "@upstash/vector";

// Environment variable validation
const UPSTASH_URL = process.env.UPSTASH_VECTOR_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_VECTOR_REST_TOKEN;

if (!UPSTASH_URL || !UPSTASH_TOKEN) {
  console.error("❌ Missing Upstash Vector credentials in environment variables");
}

/**
 * Initialize and return Upstash Vector Index instance
 * @returns {Index} Configured Upstash Vector Index
 * @throws {Error} If environment variables are missing
 */
export function getVectorIndex(): Index {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    throw new Error(
      "Missing required environment variables: UPSTASH_VECTOR_REST_URL and/or UPSTASH_VECTOR_REST_TOKEN"
    );
  }

  try {
    const index = new Index({
      url: UPSTASH_URL,
      token: UPSTASH_TOKEN,
    });
    
    return index;
  } catch (error) {
    console.error("❌ Failed to initialize Upstash Vector Index:", error);
    throw new Error(
      `Failed to initialize vector database: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Query vector database for semantically similar content
 * @param {string} query - The search query text
 * @param {number} topK - Number of results to return (default: 3)
 * @returns {Promise} Query results with metadata
 * @throws {Error} If query fails
 */
export async function queryVectors(query: string, topK: number = 3) {
  const startTime = Date.now();
  
  if (!query || query.trim().length === 0) {
    throw new Error("Query cannot be empty");
  }

  if (topK < 1 || topK > 100) {
    throw new Error("topK must be between 1 and 100");
  }

  const index = getVectorIndex();
  
  try {
    console.log(`🔍 Querying vectors: "${query.substring(0, 50)}..." (topK: ${topK})`);
    
    const results = await index.query({
      data: query,
      topK,
      includeMetadata: true,
    });
    
    const duration = Date.now() - startTime;
    console.log(`✓ Vector query completed in ${duration}ms, found ${results.length} results`);
    
    return results;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Vector query failed after ${duration}ms:`, error);
    
    if (error instanceof Error) {
      // Handle specific Upstash errors
      if (error.message.includes("401") || error.message.includes("Unauthorized")) {
        throw new Error("Invalid Upstash credentials. Please check your API token.");
      }
      if (error.message.includes("404") || error.message.includes("Not Found")) {
        throw new Error("Vector database not found. Please verify your Upstash URL.");
      }
      if (error.message.includes("timeout")) {
        throw new Error("Vector query timed out. Please try again.");
      }
    }
    
    throw new Error(
      `Vector query failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get vector database information and statistics
 * @returns {Promise} Database info including vector count, dimension, etc.
 * @throws {Error} If info retrieval fails
 */
export async function getVectorInfo() {
  const index = getVectorIndex();
  
  try {
    console.log("📊 Fetching vector database info...");
    
    const info = await index.info();
    
    console.log(`✓ Database info retrieved: ${info.vectorCount || 0} vectors, dimension: ${info.dimension || 0}`);
    
    return info;
  } catch (error) {
    console.error("❌ Failed to get vector database info:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("401") || error.message.includes("Unauthorized")) {
        throw new Error("Invalid Upstash credentials. Cannot retrieve database info.");
      }
    }
    
    throw new Error(
      `Failed to get database info: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Validate vector database connection
 * @returns {Promise<boolean>} True if connection is valid
 */
export async function validateConnection(): Promise<boolean> {
  try {
    await getVectorInfo();
    return true;
  } catch (error) {
    console.error("❌ Vector database connection validation failed:", error);
    return false;
  }
}


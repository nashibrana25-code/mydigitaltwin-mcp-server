/**
 * Groq AI Integration
 * Handles LLM inference using Groq's ultra-fast API with LLaMA models
 */

import Groq from "groq-sdk";

const DEFAULT_MODEL = "llama-3.1-8b-instant";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Environment variable validation
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error("❌ Missing GROQ_API_KEY in environment variables");
}

/**
 * Initialize and return Groq client instance
 * @returns {Groq} Configured Groq client
 * @throws {Error} If API key is missing
 */
export function getGroqClient(): Groq {
  if (!GROQ_API_KEY) {
    throw new Error("Missing required environment variable: GROQ_API_KEY");
  }
  
  try {
    const client = new Groq({
      apiKey: GROQ_API_KEY,
    });
    
    return client;
  } catch (error) {
    console.error("❌ Failed to initialize Groq client:", error);
    throw new Error(
      `Failed to initialize Groq client: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Sleep utility for retry logic
 * @param {number} ms - Milliseconds to sleep
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate AI response using Groq with context and retry logic
 * @param {string} prompt - User prompt/question
 * @param {string} systemPrompt - System instructions for the AI (optional)
 * @param {string} model - Groq model to use (default: llama-3.1-8b-instant)
 * @returns {Promise<string>} Generated response text
 * @throws {Error} If generation fails after retries
 */
export async function generateResponse(
  prompt: string,
  systemPrompt?: string,
  model: string = DEFAULT_MODEL
): Promise<string> {
  const startTime = Date.now();
  
  // Input validation
  if (!prompt || prompt.trim().length === 0) {
    throw new Error("Prompt cannot be empty");
  }

  if (prompt.length > 8000) {
    console.warn("⚠️ Prompt is very long, truncating to 8000 characters");
    prompt = prompt.substring(0, 8000);
  }

  const client = getGroqClient();
  const defaultSystemPrompt = 
    "You are an AI digital twin. Answer questions as if you are the person, speaking in first person about your background, skills, and experience.";
  
  let lastError: Error | null = null;

  // Retry loop for transient failures
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🤖 Generating response with Groq (attempt ${attempt}/${MAX_RETRIES})...`);
      
      const completion = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: systemPrompt || defaultSystemPrompt
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
        top_p: 1,
        stream: false,
      });
      
      const duration = Date.now() - startTime;
      const response = completion.choices[0]?.message?.content?.trim();
      
      if (!response) {
        throw new Error("Groq returned empty response");
      }
      
      console.log(`✓ Response generated in ${duration}ms (${response.length} chars)`);
      
      return response;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      const duration = Date.now() - startTime;
      
      console.error(`❌ Groq generation failed (attempt ${attempt}/${MAX_RETRIES}) after ${duration}ms:`, error);
      
      // Handle specific Groq API errors
      if (error instanceof Error) {
        // Rate limit errors
        if (error.message.includes("429") || error.message.includes("rate limit")) {
          console.warn("⚠️ Rate limit hit, waiting before retry...");
          if (attempt < MAX_RETRIES) {
            await sleep(RETRY_DELAY_MS * attempt); // Exponential backoff
            continue;
          }
          throw new Error("Groq API rate limit exceeded. Please try again later.");
        }
        
        // Authentication errors
        if (error.message.includes("401") || error.message.includes("Unauthorized")) {
          throw new Error("Invalid Groq API key. Please check your credentials.");
        }
        
        // Model not found
        if (error.message.includes("404") || error.message.includes("model_not_found")) {
          throw new Error(`Model '${model}' not found. Please use a valid Groq model.`);
        }
        
        // Timeout errors
        if (error.message.includes("timeout")) {
          console.warn("⚠️ Request timeout, retrying...");
          if (attempt < MAX_RETRIES) {
            await sleep(RETRY_DELAY_MS);
            continue;
          }
          throw new Error("Groq API request timed out. Please try again.");
        }
      }
      
      // Retry for other transient errors
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
    }
  }
  
  // If all retries failed
  throw new Error(
    `Failed to generate response after ${MAX_RETRIES} attempts: ${lastError?.message || "Unknown error"}`
  );
}

/**
 * Validate Groq API connection
 * @returns {Promise<boolean>} True if connection is valid
 */
export async function validateGroqConnection(): Promise<boolean> {
  try {
    await generateResponse("Test", "Respond with 'OK'", DEFAULT_MODEL);
    return true;
  } catch (error) {
    console.error("❌ Groq API connection validation failed:", error);
    return false;
  }
}


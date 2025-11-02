import Groq from "groq-sdk";

if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY is not defined");
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface GenerateResponseOptions {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function generateResponse({
  prompt,
  systemPrompt = "You are an AI digital twin. Answer questions as if you are the person, speaking in first person about your background, skills, and experience.",
  model = "llama-3.1-8b-instant",
  temperature = 0.7,
  maxTokens = 1024,
}: GenerateResponseOptions): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature,
      max_tokens: maxTokens,
    });

    return completion.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Error generating response:", error);
    throw new Error("Failed to generate response from Groq");
  }
}

export async function* generateStreamingResponse({
  prompt,
  systemPrompt = "You are an AI digital twin. Answer questions as if you are the person, speaking in first person about your background, skills, and experience.",
  model = "llama-3.1-8b-instant",
  temperature = 0.7,
  maxTokens = 1024,
}: GenerateResponseOptions): AsyncGenerator<string> {
  try {
    const stream = await groq.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  } catch (error) {
    console.error("Error streaming response:", error);
    throw new Error("Failed to stream response from Groq");
  }
}

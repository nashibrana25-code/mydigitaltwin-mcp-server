/**
 * Interview Coaching Module
 * Implements query preprocessing and response post-processing for interview preparation
 * Based on RAG + LLM dual-layer architecture
 */

import Groq from "groq-sdk";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

/**
 * Query Preprocessing - Enhance user questions for better vector search
 * Converts vague interview questions into precise, comprehensive search queries
 * 
 * Example:
 * Input: "What should I highlight?"
 * Output: "Technical achievements, leadership examples, quantified results, 
 *          problem-solving skills, measurable impact, key projects"
 */
export async function enhanceQuery(
  userQuestion: string,
  groqClient: Groq
): Promise<string> {
  const enhancePrompt = `You are an interview preparation assistant specializing in query enhancement.

Your task: Transform the user's question into an optimized search query that will retrieve the most relevant information from a professional profile database.

Original question: "${userQuestion}"

Enhanced query should:
- Include relevant synonyms and related terms
- Focus on interview-relevant aspects (achievements, skills, impact)
- Expand context for better semantic matching
- Consider STAR format elements (Situation, Task, Action, Result)
- Add domain-specific keywords

Return ONLY the enhanced search query (no explanations):`;

  try {
    const response = await groqClient.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a query optimization expert for interview preparation. Return concise, enhanced search queries."
        },
        {
          role: "user",
          content: enhancePrompt
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.5, // Lower temperature for more focused queries
      max_tokens: 150,   // Shorter responses for queries
    });

    const enhancedQuery = response.choices[0]?.message?.content?.trim();
    
    if (!enhancedQuery) {
      console.warn("⚠️ Query enhancement returned empty, using original");
      return userQuestion;
    }

    console.log(`🔍 Query enhanced: "${userQuestion}" → "${enhancedQuery}"`);
    return enhancedQuery;
    
  } catch (error) {
    console.error("❌ Query enhancement failed:", error);
    // Fallback to original question if enhancement fails
    return userQuestion;
  }
}

/**
 * Response Post-processing - Transform RAG results into interview-ready answers
 * Applies STAR format, coaching tips, and professional presentation
 * 
 * Example:
 * Input: Raw project data from vector DB
 * Output: "Let me share a specific example that demonstrates my technical skills: 
 *          [STAR formatted response with metrics and coaching tips]"
 */
export async function formatForInterview(
  originalQuestion: string,
  ragResults: Array<{ content: string; category?: string; score?: number }>,
  groqClient: Groq,
  interviewContext?: {
    interviewerType?: "HR" | "Technical" | "Manager" | "Executive";
    jobRole?: string;
    companyType?: "Startup" | "Enterprise" | "Agency";
  }
): Promise<string> {
  // Extract and combine context from RAG results
  const context = ragResults
    .map((result, index) => {
      const category = result.category ? `[${result.category}]` : "";
      const score = result.score ? `(relevance: ${result.score.toFixed(2)})` : "";
      return `${index + 1}. ${category} ${result.content} ${score}`;
    })
    .join("\n\n");

  // Determine interviewer-specific instructions
  const interviewerGuidance = getInterviewerGuidance(interviewContext?.interviewerType);

  const interviewPrompt = `You are an expert interview coach helping prepare compelling interview responses.

ORIGINAL QUESTION: "${originalQuestion}"

PROFESSIONAL PROFILE DATA:
${context}

INTERVIEW CONTEXT:
${interviewContext ? `
- Interviewer Type: ${interviewContext.interviewerType || "General"}
- Job Role: ${interviewContext.jobRole || "Not specified"}
- Company Type: ${interviewContext.companyType || "Not specified"}
` : "General interview preparation"}

YOUR TASK:
Create a compelling, interview-ready response that:

1. STRUCTURE (when appropriate):
   - Uses STAR format (Situation, Task, Action, Result)
   - Opens with a confident statement
   - Includes specific metrics and achievements
   - Closes with learning or impact statement

2. CONTENT REQUIREMENTS:
   - Speaks in FIRST PERSON (I did, I led, I achieved)
   - Includes SPECIFIC NUMBERS and QUANTIFIABLE RESULTS
   - Highlights TECHNICAL SKILLS and PROBLEM-SOLVING
   - Shows GROWTH MINDSET and CONTINUOUS LEARNING
   - Addresses the question DIRECTLY and COMPLETELY

3. PRESENTATION:
   - Professional yet conversational tone
   - 2-3 minutes spoken length (aim for 200-300 words)
   - Clear, confident language
   - No filler words or uncertainty

4. INTERVIEWER-SPECIFIC ADAPTATION:
${interviewerGuidance}

5. COACHING TIPS:
   After the main answer, add a brief "💡 INTERVIEW TIP:" section with:
   - Delivery advice (tone, emphasis, timing)
   - Common follow-up questions to prepare for
   - Red flags to avoid

FORMAT YOUR RESPONSE AS:

[YOUR ANSWER]
(The actual interview response in first person)

💡 INTERVIEW TIP:
(2-3 actionable coaching points)

Begin your response:`;

  try {
    const response = await groqClient.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert interview coach with 20+ years of experience. You help candidates present their experience compellingly using proven frameworks like STAR methodology."
        },
        {
          role: "user",
          content: interviewPrompt
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7, // Balanced creativity and consistency
      max_tokens: 800,  // Longer for detailed responses
    });

    const formattedResponse = response.choices[0]?.message?.content?.trim();
    
    if (!formattedResponse) {
      throw new Error("Interview formatting returned empty response");
    }

    console.log(`✓ Interview response formatted (${formattedResponse.length} chars)`);
    return formattedResponse;
    
  } catch (error) {
    console.error("❌ Interview formatting failed:", error);
    
    // Fallback to basic formatting
    return `Based on my experience:\n\n${context}\n\nThis directly addresses your question about ${originalQuestion}.`;
  }
}

/**
 * Get interviewer-specific guidance for response adaptation
 */
function getInterviewerGuidance(interviewerType?: string): string {
  switch (interviewerType) {
    case "HR":
      return `- Focus on: Culture fit, soft skills, motivation, team collaboration
- Depth: Surface to moderate technical detail
- Emphasize: Personality, communication, values alignment
- Duration: 60-90 seconds for most answers`;

    case "Technical":
      return `- Focus on: Technical depth, problem-solving approach, specific technologies
- Depth: Deep technical detail with code/architecture examples
- Emphasize: Technical decisions, debugging skills, learning approach
- Duration: 2-3 minutes with technical specifics`;

    case "Manager":
      return `- Focus on: Business impact, project delivery, collaboration
- Depth: Balance technical skill with outcomes
- Emphasize: Results, reliability, communication, growth potential
- Duration: 2-2.5 minutes with metrics`;

    case "Executive":
      return `- Focus on: Strategic thinking, business value, long-term vision
- Depth: High-level with key metrics
- Emphasize: Impact, scalability, leadership potential, ROI
- Duration: 2-3 minutes focusing on business outcomes`;

    default:
      return `- Adapt to the interviewer's questions and depth
- Balance technical detail with business impact
- Use STAR format for behavioral questions
- Keep responses concise and focused`;
  }
}

/**
 * Detect question type for optimized processing
 */
export function detectQuestionType(question: string): {
  type: "behavioral" | "technical" | "situational" | "background" | "general";
  suggestedFormat: string;
} {
  const lowerQuestion = question.toLowerCase();

  // Behavioral questions (past experience)
  if (
    lowerQuestion.includes("tell me about a time") ||
    lowerQuestion.includes("describe a situation") ||
    lowerQuestion.includes("give me an example") ||
    lowerQuestion.includes("have you ever")
  ) {
    return {
      type: "behavioral",
      suggestedFormat: "STAR (Situation, Task, Action, Result)"
    };
  }

  // Technical questions (skills, knowledge)
  if (
    lowerQuestion.includes("how would you") ||
    lowerQuestion.includes("explain") ||
    lowerQuestion.includes("difference between") ||
    lowerQuestion.includes("implement") ||
    lowerQuestion.includes("code") ||
    lowerQuestion.includes("algorithm")
  ) {
    return {
      type: "technical",
      suggestedFormat: "Concept explanation + practical example + edge cases"
    };
  }

  // Situational questions (hypothetical scenarios)
  if (
    lowerQuestion.includes("what would you do") ||
    lowerQuestion.includes("imagine") ||
    lowerQuestion.includes("suppose") ||
    lowerQuestion.includes("if you were")
  ) {
    return {
      type: "situational",
      suggestedFormat: "Approach + reasoning + expected outcome"
    };
  }

  // Background questions (experience, skills)
  if (
    lowerQuestion.includes("tell me about yourself") ||
    lowerQuestion.includes("your experience") ||
    lowerQuestion.includes("your background") ||
    lowerQuestion.includes("walk me through")
  ) {
    return {
      type: "background",
      suggestedFormat: "Chronological overview + key highlights + current focus"
    };
  }

  // General questions
  return {
    type: "general",
    suggestedFormat: "Direct answer + supporting evidence + learning/impact"
  };
}

/**
 * Complete interview preparation pipeline
 * Combines query enhancement, RAG search, and response formatting
 */
export interface InterviewPipelineOptions {
  question: string;
  vectorSearch: (query: string, topK: number) => Promise<Array<{
    content: string;
    category?: string;
    score?: number;
  }>>;
  groqClient: Groq;
  topK?: number;
  interviewContext?: {
    interviewerType?: "HR" | "Technical" | "Manager" | "Executive";
    jobRole?: string;
    companyType?: "Startup" | "Enterprise" | "Agency";
  };
  enableQueryEnhancement?: boolean;
}

export async function interviewPreparationPipeline(
  options: InterviewPipelineOptions
): Promise<{
  answer: string;
  metadata: {
    originalQuestion: string;
    enhancedQuery?: string;
    questionType: ReturnType<typeof detectQuestionType>;
    resultsCount: number;
    processingTimeMs: number;
  };
}> {
  const startTime = Date.now();
  const {
    question,
    vectorSearch,
    groqClient,
    topK = 3,
    interviewContext,
    enableQueryEnhancement = true,
  } = options;

  console.log(`\n🎯 Starting interview preparation pipeline for: "${question}"`);

  // Step 1: Detect question type
  const questionType = detectQuestionType(question);
  console.log(`📋 Question type: ${questionType.type} (${questionType.suggestedFormat})`);

  // Step 2: Query preprocessing (optional)
  let searchQuery = question;
  if (enableQueryEnhancement) {
    try {
      searchQuery = await enhanceQuery(question, groqClient);
    } catch (error) {
      console.warn("⚠️ Query enhancement failed, using original:", error);
    }
  }

  // Step 3: Vector search with enhanced query
  const ragResults = await vectorSearch(searchQuery, topK);
  console.log(`✓ Retrieved ${ragResults.length} results from vector database`);

  // Step 4: Response post-processing
  const answer = await formatForInterview(
    question,
    ragResults,
    groqClient,
    interviewContext
  );

  const processingTime = Date.now() - startTime;
  console.log(`✓ Interview preparation completed in ${processingTime}ms\n`);

  return {
    answer,
    metadata: {
      originalQuestion: question,
      enhancedQuery: enableQueryEnhancement ? searchQuery : undefined,
      questionType,
      resultsCount: ragResults.length,
      processingTimeMs: processingTime,
    },
  };
}

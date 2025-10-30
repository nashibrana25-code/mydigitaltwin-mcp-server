/**
 * Upload Digital Twin Profile to Upstash Vector Database
 * Creates content chunks from digitaltwin.json and uploads them with embeddings
 */

import { Index } from "@upstash/vector";
import * as fs from "fs";
import * as path from "path";

// Load environment variables from .env.local
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      process.env[key] = value;
    }
  });
}

const UPSTASH_VECTOR_REST_URL = process.env.UPSTASH_VECTOR_REST_URL;
const UPSTASH_VECTOR_REST_TOKEN = process.env.UPSTASH_VECTOR_REST_TOKEN;

if (!UPSTASH_VECTOR_REST_URL || !UPSTASH_VECTOR_REST_TOKEN) {
  console.error("❌ Missing required environment variables");
  console.error("Please ensure .env.local contains:");
  console.error("  - UPSTASH_VECTOR_REST_URL");
  console.error("  - UPSTASH_VECTOR_REST_TOKEN");
  process.exit(1);
}

// Initialize Upstash Vector
const vectorIndex = new Index({
  url: UPSTASH_VECTOR_REST_URL,
  token: UPSTASH_VECTOR_REST_TOKEN,
});

interface ContentChunk {
  id: string;
  title: string;
  content: string;
  category: string;
}

/**
 * Safely join array items, handling undefined/null
 */
function safeJoin(arr: any, separator: string = ", "): string {
  if (!arr || !Array.isArray(arr)) return "";
  return arr.filter(Boolean).filter(Boolean).join(separator);
}

/**
 * Create content chunks from digital twin profile
 */
function createContentChunks(profile: any): ContentChunk[] {
  const chunks: ContentChunk[] = [];

  // Personal information
  chunks.push({
    id: "personal-info",
    title: "Personal Information",
    content: `${profile.personal.name} is a ${profile.personal.title} based in ${profile.personal.location}. ${profile.personal.summary}`,
    category: "personal"
  });

  chunks.push({
    id: "elevator-pitch",
    title: "Elevator Pitch",
    content: profile.personal.elevator_pitch,
    category: "personal"
  });

  // Contact information
  chunks.push({
    id: "contact-info",
    title: "Contact Information",
    content: `Email: ${profile.personal.contact.email}, LinkedIn: ${profile.personal.contact.linkedin}, GitHub: ${profile.personal.contact.github}, Portfolio: ${profile.personal.contact.portfolio}`,
    category: "contact"
  });

  // Salary and location preferences
  chunks.push({
    id: "salary-location",
    title: "Salary and Location Preferences",
    content: `Currently: ${profile.salary_location.current_salary}. Expectations: ${profile.salary_location.salary_expectations}. Location preferences: ${safeJoin(profile.salary_location.location_preferences)}. Work authorization: ${profile.salary_location.work_authorization}. Remote experience: ${profile.salary_location.remote_experience}`,
    category: "preferences"
  });

  // Experience - Each project
  profile.experience.forEach((exp: any, index: number) => {
    const expId = exp.project_name?.toLowerCase().replace(/\s+/g, "-") || `experience-${index}`;
    
    chunks.push({
      id: `${expId}-overview`,
      title: `${exp.project_name || exp.company} - Overview`,
      content: `${exp.type}: ${exp.project_name || exp.title}. Role: ${exp.role || exp.title}. Duration: ${exp.duration}. Context: ${exp.context}. ${exp.team_structure || ''}`,
      category: "experience"
    });

    // STAR achievements
    if (exp.achievements_star && Array.isArray(exp.achievements_star)) {
      exp.achievements_star.forEach((star: any, starIndex: number) => {
        chunks.push({
          id: `${expId}-star-${starIndex}`,
          title: `${exp.project_name} - Achievement ${starIndex + 1}`,
          content: `Situation: ${star.situation}. Task: ${star.task}. Action: ${star.action}. Result: ${star.result}`,
          category: "experience"
        });
      });
    }

    // Technical skills used
    if (exp.technical_skills_used && Array.isArray(exp.technical_skills_used)) {
      chunks.push({
        id: `${expId}-tech-skills`,
        title: `${exp.project_name} - Technologies`,
        content: `Technologies used: ${exp.technical_skills_used.filter(Boolean).join(", ")}`,
        category: "experience"
      });
    }

    // Key features (for projects)
    if (exp.key_features && Array.isArray(exp.key_features)) {
      chunks.push({
        id: `${expId}-features`,
        title: `${exp.project_name} - Key Features`,
        content: `Key features: ${exp.key_features.filter(Boolean).join(". ")}`,
        category: "experience"
      });
    }

    // Security concepts (for cyber security project)
    if (exp.security_concepts_learned && Array.isArray(exp.security_concepts_learned)) {
      chunks.push({
        id: `${expId}-security-concepts`,
        title: `${exp.project_name} - Security Concepts`,
        content: `Security concepts learned: ${exp.security_concepts_learned.filter(Boolean).join(", ")}`,
        category: "experience"
      });
    }

    // Transferable skills (for part-time work)
    if (exp.transferable_skills && Array.isArray(exp.transferable_skills)) {
      chunks.push({
        id: `${expId}-transferable`,
        title: `${exp.company} - Transferable Skills`,
        content: `Transferable skills: ${exp.transferable_skills.filter(Boolean).join(". ")}`,
        category: "experience"
      });
    }
  });

  // Technical Skills - Programming Languages
  profile.skills.technical.programming_languages.forEach((lang: any) => {
    const frameworks = lang.frameworks || lang.databases || [];
    const concepts = lang.concepts || [];
    chunks.push({
      id: `skill-${lang.language.toLowerCase()}`,
      title: `${lang.language} Skills`,
      content: `${lang.language}: ${lang.proficiency} proficiency with ${lang.years} years of experience. Frameworks: ${frameworks.join(", ")}. Concepts: ${concepts.join(", ")}`,
      category: "skills"
    });
  });

  // Web Technologies
  chunks.push({
    id: "web-technologies",
    title: "Web Technologies",
    content: `Web technologies: ${profile.skills.technical.web_technologies.filter(Boolean).join(", ")}`,
    category: "skills"
  });

  // Tools and Platforms
  chunks.push({
    id: "tools-platforms",
    title: "Tools and Platforms",
    content: `Tools and platforms: ${profile.skills.technical.tools_platforms.filter(Boolean).join(", ")}`,
    category: "skills"
  });

  // Databases
  chunks.push({
    id: "databases",
    title: "Database Experience",
    content: `Databases: ${profile.skills.technical.databases.filter(Boolean).join(", ")}`,
    category: "skills"
  });

  // Currently Learning
  chunks.push({
    id: "currently-learning",
    title: "Currently Learning",
    content: `Currently learning: ${profile.skills.technical.currently_learning.filter(Boolean).join(", ")}`,
    category: "skills"
  });

  // Soft Skills
  chunks.push({
    id: "soft-skills",
    title: "Soft Skills",
    content: `Soft skills: ${profile.skills.soft_skills.filter(Boolean).join(", ")}`,
    category: "skills"
  });

  // Certifications
  chunks.push({
    id: "certifications",
    title: "Certifications",
    content: `Certifications: ${profile.skills.certifications.filter(Boolean).join(". ")}`,
    category: "skills"
  });

  // Education
  chunks.push({
    id: "education-overview",
    title: "Education",
    content: `${profile.education.current_year} student at ${profile.education.university}, pursuing ${profile.education.degree}. Major: ${profile.education.major}. GPA: ${profile.education.gpa}. Expected graduation: ${profile.education.expected_graduation}`,
    category: "education"
  });

  chunks.push({
    id: "coursework",
    title: "Relevant Coursework",
    content: `Relevant coursework: ${profile.education.relevant_coursework.filter(Boolean).join(", ")}`,
    category: "education"
  });

  chunks.push({
    id: "academic-projects",
    title: "Academic Projects",
    content: `Completed projects: ${profile.education.completed_projects.filter(Boolean).join(". ")}`,
    category: "education"
  });

  chunks.push({
    id: "academic-achievements",
    title: "Academic Achievements",
    content: `Achievements: ${profile.education.academic_achievements.filter(Boolean).join(". ")}`,
    category: "education"
  });

  // Career Goals
  chunks.push({
    id: "career-goals-immediate",
    title: "Immediate Career Goals",
    content: `Immediate goal: ${profile.career_goals.immediate}. Short-term: ${profile.career_goals.short_term}. Long-term: ${profile.career_goals.long_term}`,
    category: "career_goals"
  });

  chunks.push({
    id: "learning-focus",
    title: "Learning Focus Areas",
    content: `Learning focus: ${profile.career_goals.learning_focus.filter(Boolean).join(", ")}`,
    category: "career_goals"
  });

  chunks.push({
    id: "industries-interested",
    title: "Industries of Interest",
    content: `Interested in: ${profile.career_goals.industries_interested.filter(Boolean).join(", ")}. Ideal role: ${profile.career_goals.ideal_role}`,
    category: "career_goals"
  });

  // Interview Prep - Behavioral Questions
  chunks.push({
    id: "behavioral-questions",
    title: "Common Behavioral Interview Questions",
    content: `Prepared for questions like: ${profile.interview_prep.common_questions.behavioral.filter(Boolean).join(". ")}`,
    category: "interview_prep"
  });

  // Interview Prep - Technical Questions
  chunks.push({
    id: "technical-questions",
    title: "Common Technical Interview Questions",
    content: `Prepared for technical questions like: ${profile.interview_prep.common_questions.technical.filter(Boolean).join(". ")}`,
    category: "interview_prep"
  });

  // Interview Prep - Strengths
  chunks.push({
    id: "strengths",
    title: "Key Strengths",
    content: `Strengths to highlight: ${profile.interview_prep.strengths_to_highlight.filter(Boolean).join(". ")}`,
    category: "interview_prep"
  });

  // Interview Prep - Weakness Mitigation
  profile.interview_prep.weakness_mitigation.forEach((w: any, index: number) => {
    chunks.push({
      id: `weakness-${index}`,
      title: `Addressing Weakness: ${w.weakness}`,
      content: `Weakness: ${w.weakness}. Mitigation: ${w.mitigation}`,
      category: "interview_prep"
    });
  });

  // Interview Prep - Questions to Ask
  chunks.push({
    id: "questions-to-ask",
    title: "Questions to Ask Interviewer",
    content: `Good questions to ask: ${profile.interview_prep.common_questions.company_research.questions_to_ask.filter(Boolean).join(". ")}`,
    category: "interview_prep"
  });

  // Professional Development
  chunks.push({
    id: "recent-learning",
    title: "Recent Learning",
    content: `Recent learning: ${profile.professional_development.recent_learning.filter(Boolean).join(". ")}`,
    category: "professional_development"
  });

  chunks.push({
    id: "online-courses",
    title: "Online Courses",
    content: `Online courses: ${profile.professional_development.online_courses.filter(Boolean).join(". ")}`,
    category: "professional_development"
  });

  chunks.push({
    id: "practice-platforms",
    title: "Practice Platforms",
    content: `Practice platforms: ${profile.professional_development.practice_platforms.filter(Boolean).join(", ")}`,
    category: "professional_development"
  });

  return chunks;
}

/**
 * Upload chunks to Upstash Vector with progress tracking
 */
async function uploadChunks(chunks: ContentChunk[]) {
  console.log(`\n📊 Uploading ${chunks.length} content chunks to Upstash Vector...`);
  console.log("━".repeat(60));

  const batchSize = 10;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(chunks.length / batchSize);

    console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} chunks)`);

    try {
      // Upstash Vector auto-generates embeddings when you provide string data
      const vectors = batch.map(chunk => ({
        id: chunk.id,
        data: chunk.content, // Upstash will auto-embed this
        metadata: {
          title: chunk.title,
          content: chunk.content,
          category: chunk.category
        }
      }));

      await vectorIndex.upsert(vectors);
      successCount += batch.length;
      
      batch.forEach(chunk => {
        console.log(`  ✓ ${chunk.title} (${chunk.category})`);
      });

    } catch (error) {
      errorCount += batch.length;
      console.error(`  ❌ Batch ${batchNum} failed:`, error);
      batch.forEach(chunk => {
        console.log(`  ✗ ${chunk.title}`);
      });
    }

    // Small delay between batches to avoid rate limits
    if (i + batchSize < chunks.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log("\n" + "━".repeat(60));
  console.log(`\n📈 Upload Summary:`);
  console.log(`  ✓ Success: ${successCount} chunks`);
  console.log(`  ✗ Errors: ${errorCount} chunks`);
  console.log(`  📊 Total: ${chunks.length} chunks`);
  
  return { successCount, errorCount };
}

/**
 * Verify upload by querying the database
 */
async function verifyUpload() {
  console.log("\n🔍 Verifying upload...");
  
  try {
    const info = await vectorIndex.info();
    console.log(`✓ Database now contains ${info.vectorCount || 0} vectors`);
    console.log(`✓ Dimension: ${info.dimension}`);
    console.log(`✓ Similarity function: ${info.similarityFunction}`);

    // Test query
    console.log("\n🧪 Testing search functionality...");
    const testResults = await vectorIndex.query({
      data: "What programming languages do you know?",
      topK: 3,
      includeMetadata: true
    });

    if (testResults && testResults.length > 0) {
      console.log(`✓ Search test successful! Found ${testResults.length} results`);
      testResults.forEach((result, i) => {
        console.log(`  ${i + 1}. ${result.metadata?.title} (score: ${result.score?.toFixed(3)})`);
      });
    } else {
      console.log("⚠️ Search test returned no results");
    }

  } catch (error) {
    console.error("❌ Verification failed:", error);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log("🚀 Digital Twin Profile Upload");
  console.log("━".repeat(60));

  // Load profile
  const profilePath = path.join(__dirname, "..", "..", "digital-twin-workshop", "digitaltwin.json");
  
  if (!fs.existsSync(profilePath)) {
    console.error(`❌ Profile not found at: ${profilePath}`);
    process.exit(1);
  }

  console.log(`📄 Loading profile from: ${profilePath}`);
  const profile = JSON.parse(fs.readFileSync(profilePath, "utf-8"));
  console.log(`✓ Profile loaded: ${profile.personal.name}`);

  // Create chunks
  console.log("\n🔨 Creating content chunks...");
  const chunks = createContentChunks(profile);
  console.log(`✓ Created ${chunks.length} content chunks`);

  // Show chunk breakdown by category
  const categoryCount: Record<string, number> = {};
  chunks.forEach(chunk => {
    categoryCount[chunk.category] = (categoryCount[chunk.category] || 0) + 1;
  });
  
  console.log("\n📋 Chunks by category:");
  Object.entries(categoryCount).forEach(([category, count]) => {
    console.log(`  • ${category}: ${count} chunks`);
  });

  // Upload chunks
  const { successCount, errorCount } = await uploadChunks(chunks);

  if (errorCount > 0) {
    console.log("\n⚠️ Some chunks failed to upload. You may want to retry.");
  }

  // Verify upload
  if (successCount > 0) {
    await verifyUpload();
  }

  console.log("\n✅ Upload complete!");
  console.log("\n🎯 Next steps:");
  console.log("  1. Test your MCP server: pnpm mcp");
  console.log("  2. Configure Claude Desktop (see CLAUDE_DESKTOP_SETUP.md)");
  console.log("  3. Try asking questions about your profile!");
}

main().catch(error => {
  console.error("\n💥 Fatal error:", error);
  process.exit(1);
});



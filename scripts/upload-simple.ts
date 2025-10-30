/**
 * Upload Digital Twin Profile to Upstash Vector - SIMPLE VERSION
 * Creates content chunks and uploads them with auto-embeddings
 */

import { Index } from "@upstash/vector";
import * as fs from "fs";
import * as path from "path";

// Helper to safely join arrays
const safe = (arr: any, sep = ", ") => (arr && Array.isArray(arr) ? arr.filter(Boolean).join(sep) : "");

// Load env
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8").split("\n").forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key, val] = match;
      process.env[key.trim()] = val.trim().replace(/^["']|["']$/g, "");
    }
  });
}

const URL = process.env.UPSTASH_VECTOR_REST_URL;
const TOKEN = process.env.UPSTASH_VECTOR_REST_TOKEN;

if (!URL || !TOKEN) {
  console.error("❌ Missing UPSTASH env vars");
  process.exit(1);
}

const index = new Index({ url: URL, token: TOKEN });

async function main() {
  console.log("🚀 Digital Twin Profile Upload\n");

  // Load profile
  const profilePath = path.join(__dirname, "..", "..", "digital-twin-workshop", "digitaltwin.json");
  const profile = JSON.parse(fs.readFileSync(profilePath, "utf-8"));
  console.log(`✓ Loaded: ${profile.personal.name}\n`);

  const chunks: Array<{id: string, content: string, metadata: any}> = [];

  // Personal
  chunks.push({
    id: "personal",
    content: `${profile.personal.name} is a ${profile.personal.title} in ${profile.personal.location}. ${profile.personal.summary}`,
    metadata: { title: "Personal", category: "personal", content: `${profile.personal.name} is a ${profile.personal.title} in ${profile.personal.location}. ${profile.personal.summary}` }
  });

  chunks.push({
    id: "pitch",
    content: profile.personal.elevator_pitch,
    metadata: { title: "Elevator Pitch", category: "personal", content: profile.personal.elevator_pitch }
  });

  // Contact
  const contact = profile.personal.contact;
  chunks.push({
    id: "contact",
    content: `Email: ${contact.email}, LinkedIn: ${contact.linkedin}, GitHub: ${contact.github}`,
    metadata: { title: "Contact", category: "contact", content: `Email: ${contact.email}, LinkedIn: ${contact.linkedin}, GitHub: ${contact.github}` }
  });

  // Salary/Location
  const sal = profile.salary_location;
  chunks.push({
    id: "salary",
    content: `${sal.current_salary}. Expectations: ${sal.salary_expectations}. Locations: ${safe(sal.location_preferences)}. Authorization: ${sal.work_authorization}`,
    metadata: { title: "Salary & Location", category: "preferences", content: `${sal.current_salary}. Expectations: ${sal.salary_expectations}. Locations: ${safe(sal.location_preferences)}. Authorization: ${sal.work_authorization}` }
  });

  // Experience
  profile.experience.forEach((exp: any, i: number) => {
    const id = `exp-${i}`;
    chunks.push({
      id,
      content: `${exp.type}: ${exp.project_name || exp.title}. Role: ${exp.role || exp.title}. Duration: ${exp.duration}. ${exp.context}`,
      metadata: { title: exp.project_name || exp.title, category: "experience", content: `${exp.type}: ${exp.project_name || exp.title}. Role: ${exp.role || exp.title}. Duration: ${exp.duration}. ${exp.context}` }
    });

    if (exp.achievements_star) {
      exp.achievements_star.forEach((star: any, j: number) => {
        chunks.push({
          id: `${id}-star-${j}`,
          content: `Situation: ${star.situation}. Task: ${star.task}. Action: ${star.action}. Result: ${star.result}`,
          metadata: { title: `${exp.project_name} Achievement`, category: "experience", content: `Situation: ${star.situation}. Task: ${star.task}. Action: ${star.action}. Result: ${star.result}` }
        });
      });
    }

    if (exp.technical_skills_used) {
      chunks.push({
        id: `${id}-tech`,
        content: `Technologies: ${safe(exp.technical_skills_used)}`,
        metadata: { title: `${exp.project_name} Tech`, category: "experience", content: `Technologies: ${safe(exp.technical_skills_used)}` }
      });
    }
  });

  // Skills
  profile.skills.technical.programming_languages.forEach((lang: any) => {
    chunks.push({
      id: `skill-${lang.language.toLowerCase()}`,
      content: `${lang.language}: ${lang.proficiency} (${lang.years} years). Frameworks: ${safe(lang.frameworks)}. Concepts: ${safe(lang.concepts)}`,
      metadata: { title: `${lang.language} Skills`, category: "skills", content: `${lang.language}: ${lang.proficiency} (${lang.years} years). Frameworks: ${safe(lang.frameworks)}. Concepts: ${safe(lang.concepts)}` }
    });
  });

  chunks.push({
    id: "web-tech",
    content: `Web technologies: ${safe(profile.skills.technical.web_technologies)}`,
    metadata: { title: "Web Technologies", category: "skills", content: `Web technologies: ${safe(profile.skills.technical.web_technologies)}` }
  });

  chunks.push({
    id: "tools",
    content: `Tools: ${safe(profile.skills.technical.tools_platforms)}`,
    metadata: { title: "Tools & Platforms", category: "skills", content: `Tools: ${safe(profile.skills.technical.tools_platforms)}` }
  });

  chunks.push({
    id: "soft-skills",
    content: `Soft skills: ${safe(profile.skills.soft_skills)}`,
    metadata: { title: "Soft Skills", category: "skills", content: `Soft skills: ${safe(profile.skills.soft_skills)}` }
  });

  // Education
  const edu = profile.education;
  chunks.push({
    id: "education",
    content: `${edu.current_year} at ${edu.university}, ${edu.degree}. Major: ${edu.major}. GPA: ${edu.gpa}. Graduation: ${edu.expected_graduation}`,
    metadata: { title: "Education", category: "education", content: `${edu.current_year} at ${edu.university}, ${edu.degree}. Major: ${edu.major}. GPA: ${edu.gpa}. Graduation: ${edu.expected_graduation}` }
  });

  chunks.push({
    id: "coursework",
    content: `Coursework: ${safe(edu.relevant_coursework)}`,
    metadata: { title: "Coursework", category: "education", content: `Coursework: ${safe(edu.relevant_coursework)}` }
  });

  // Career Goals
  const goals = profile.career_goals;
  chunks.push({
    id: "goals",
    content: `Immediate: ${goals.immediate}. Short-term: ${goals.short_term}. Long-term: ${goals.long_term}. Learning: ${safe(goals.learning_focus)}`,
    metadata: { title: "Career Goals", category: "career", content: `Immediate: ${goals.immediate}. Short-term: ${goals.short_term}. Long-term: ${goals.long_term}. Learning: ${safe(goals.learning_focus)}` }
  });

  // Interview Prep
  const prep = profile.interview_prep;
  chunks.push({
    id: "strengths",
    content: `Strengths: ${safe(prep.strengths_to_highlight, ". ")}`,
    metadata: { title: "Strengths", category: "interview", content: `Strengths: ${safe(prep.strengths_to_highlight, ". ")}` }
  });

  prep.weakness_mitigation.forEach((w: any, i: number) => {
    chunks.push({
      id: `weakness-${i}`,
      content: `Weakness: ${w.weakness}. Mitigation: ${w.mitigation}`,
      metadata: { title: "Addressing Weaknesses", category: "interview", content: `Weakness: ${w.weakness}. Mitigation: ${w.mitigation}` }
    });
  });

  console.log(`✓ Created ${chunks.length} chunks\n`);

  // Upload in batches
  console.log("📤 Uploading to Upstash...\n");
  const batchSize = 10;
  let success = 0;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    try {
      await index.upsert(batch.map(c => ({
        id: c.id,
        data: c.content,
        metadata: c.metadata
      })));
      success += batch.length;
      console.log(`✓ Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} chunks`);
    } catch (error) {
      console.error(`❌ Batch failed:`, error);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n✅ Uploaded ${success}/${chunks.length} chunks\n`);

  // Verify
  const info = await index.info();
  console.log(`📊 Database now has ${info.vectorCount || 0} vectors`);

  // Test search
  const results = await index.query({
    data: "What programming languages do you know?",
    topK: 3,
    includeMetadata: true
  });
  console.log(`\n🔍 Test search found ${results.length} results:`);
  results.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.metadata?.title} (score: ${r.score?.toFixed(3)})`);
  });

  console.log("\n✅ Done! Your digital twin is ready.\n");
}

main().catch(e => {
  console.error("\n💥 Error:", e.message);
  process.exit(1);
});

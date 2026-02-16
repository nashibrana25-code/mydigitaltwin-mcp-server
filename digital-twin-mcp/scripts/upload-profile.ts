#!/usr/bin/env tsx
/**
 * Upload Profile Script
 * Embeds digitaltwin.json into Upstash Vector Database
 */

import fs from 'fs';
import path from 'path';
import { Index } from '@upstash/vector';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const UPSTASH_URL = process.env.UPSTASH_VECTOR_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_VECTOR_REST_TOKEN;

if (!UPSTASH_URL || !UPSTASH_TOKEN) {
  console.error('❌ Missing Upstash credentials in .env.local');
  console.error('   Required: UPSTASH_VECTOR_REST_URL, UPSTASH_VECTOR_REST_TOKEN');
  process.exit(1);
}

const vectorIndex = new Index({
  url: UPSTASH_URL,
  token: UPSTASH_TOKEN,
});

interface ProfileChunk {
  id: string;
  text: string;
  metadata: {
    title: string;
    type: string;
    content: string;
    category: string;
    tags: string[];
  };
}

function loadProfile(): any {
  const profilePath = path.join(__dirname, '../../digitaltwin.json');
  console.log(`📖 Loading profile from: ${profilePath}`);
  
  const rawData = fs.readFileSync(profilePath, 'utf-8');
  return JSON.parse(rawData);
}

function createChunks(profile: any): ProfileChunk[] {
  const chunks: ProfileChunk[] = [];
  let chunkId = 0;

  const addChunk = (
    title: string,
    content: string,
    type: string,
    category: string,
    tags: string[] = []
  ) => {
    chunkId++;
    const enrichedText = `${title}: ${content}`;
    
    chunks.push({
      id: `chunk-${chunkId}`,
      text: enrichedText,
      metadata: {
        title,
        type,
        content,
        category,
        tags,
      },
    });
  };

  // Personal Information
  if (profile.personal) {
    const p = profile.personal;
    
    if (p.summary) {
      addChunk('Personal Summary', p.summary, 'personal', 'overview', ['about', 'introduction']);
    }
    
    if (p.elevator_pitch) {
      addChunk('Elevator Pitch', p.elevator_pitch, 'personal', 'overview', ['pitch', 'introduction']);
    }

    const personalDetails: string[] = [];
    if (p.marital_status) personalDetails.push(`Marital Status: ${p.marital_status}`);
    if (p.relationship_status) personalDetails.push(`Relationship Status: ${p.relationship_status}`);
    if (p.nationality) personalDetails.push(`Nationality: ${p.nationality}`);
    if (p.Age) personalDetails.push(`Age: ${p.Age}`);
    if (p.gender) personalDetails.push(`Gender: ${p.gender}`);
    if (p.location) personalDetails.push(`Location: ${p.location}`);
    
    if (personalDetails.length > 0) {
      addChunk('Personal Details', personalDetails.join('. '), 'personal', 'details', 
        ['personal', 'demographics', 'marital', 'status']);
    }
  }

  // Experience
  if (profile.experience && Array.isArray(profile.experience)) {
    profile.experience.forEach((exp: any, idx: number) => {
      const expType = exp.type || 'Experience';
      const title = `${expType}: ${exp.project_name || exp.company || 'Unknown'}`;
      
      const details: string[] = [];
      if (exp.role) details.push(`Role: ${exp.role}`);
      if (exp.duration) details.push(`Duration: ${exp.duration}`);
      if (exp.status) details.push(`Status: ${exp.status}`);
      if (exp.current_status) details.push(`Current Status: ${exp.current_status}`);
      if (exp.context) details.push(`Context: ${exp.context}`);
      
      addChunk(title, details.join('. '), 'experience', 'work_history', ['experience', expType.toLowerCase()]);
      
      // STAR achievements
      if (exp.achievements_star && Array.isArray(exp.achievements_star)) {
        exp.achievements_star.forEach((star: any, starIdx: number) => {
          const starText = `Situation: ${star.situation || ''}. Task: ${star.task || ''}. Action: ${star.action || ''}. Result: ${star.result || ''}`;
          addChunk(`${title} - Achievement ${starIdx + 1}`, starText, 'achievement', 'accomplishments', 
            ['star', 'achievement', expType.toLowerCase()]);
        });
      }
    });
  }

  // Skills
  if (profile.skills?.technical?.programming_languages) {
    profile.skills.technical.programming_languages.forEach((lang: any) => {
      const langText = `${lang.language} (${lang.proficiency}): ${(lang.concepts || []).join(', ')}`;
      addChunk(`Programming: ${lang.language}`, langText, 'skill', 'technical', 
        ['programming', lang.language.toLowerCase()]);
    });
  }

  // Education
  if (profile.education) {
    const edu = profile.education;
    const eduText = `Studying ${edu.degree || ''} at ${edu.university || ''}. Currently in ${edu.current_year || ''}. GPA: ${edu.gpa || ''}. Expected graduation: ${edu.expected_graduation || ''}`;
    addChunk('Education Background', eduText, 'education', 'academic', ['education', 'university']);
    
    if (edu.relevant_coursework && Array.isArray(edu.relevant_coursework)) {
      const courseworkText = 'Relevant coursework: ' + edu.relevant_coursework.join(', ');
      addChunk('Academic Coursework', courseworkText, 'education', 'academic', ['coursework', 'education']);
    }
  }

  // Career Goals
  if (profile.career_goals) {
    const goals = profile.career_goals;
    const goalsText = `Immediate: ${goals.immediate || ''}. Short-term: ${goals.short_term || ''}. Long-term: ${goals.long_term || ''}`;
    addChunk('Career Goals', goalsText, 'goals', 'career', ['goals', 'career']);
  }

  // Salary & Location
  if (profile.salary_location) {
    const sal = profile.salary_location;
    const salText = `Salary expectations: ${sal.salary_expectations || ''}. Location preferences: ${(sal.location_preferences || []).join(', ')}. Work authorization: ${sal.work_authorization || ''}`;
    addChunk('Salary and Location Preferences', salText, 'preferences', 'compensation', ['salary', 'location']);
  }

  console.log(`✓ Created ${chunks.length} chunks from profile`);
  return chunks;
}

async function uploadChunks(chunks: ProfileChunk[]) {
  console.log(`\n📤 Uploading ${chunks.length} chunks to Upstash...`);
  
  try {
    // Check current state
    const info = await vectorIndex.info();
    console.log(`📊 Current vectors in database: ${info.vectorCount || 0}`);
    
    // Reset if needed
    if (info.vectorCount && info.vectorCount > 0) {
      console.log('🗑️  Resetting database...');
      await vectorIndex.reset();
      console.log('✓ Database reset complete');
    }
    
    // Upload chunks
    const vectors = chunks.map((chunk) => ({
      id: chunk.id,
      data: chunk.text,
      metadata: chunk.metadata,
    }));
    
    await vectorIndex.upsert(vectors);
    
    console.log(`✅ Successfully uploaded ${chunks.length} chunks!`);
    
    // Verify
    const finalInfo = await vectorIndex.info();
    console.log(`📊 Final vector count: ${finalInfo.vectorCount || 0}`);
    
  } catch (error) {
    console.error('❌ Upload failed:', error);
    throw error;
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('🚀 Digital Twin Profile Upload');
  console.log('='.repeat(70));
  
  try {
    const profile = loadProfile();
    const chunks = createChunks(profile);
    
    console.log('\n📝 Sample chunks:');
    chunks.slice(0, 3).forEach((chunk, idx) => {
      console.log(`\n  ${idx + 1}. ID: ${chunk.id}`);
      console.log(`     Title: ${chunk.metadata.title}`);
      console.log(`     Type: ${chunk.metadata.type}`);
      console.log(`     Text preview: ${chunk.text.substring(0, 100)}...`);
    });
    
    if (chunks.length > 3) {
      console.log(`\n  ... and ${chunks.length - 3} more chunks`);
    }
    
    await uploadChunks(chunks);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Upload Complete!');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

"""
Digital Twin Profile Ingestion Script
Migrated from ChromaDB to Upstash Vector

KEY MIGRATION CHANGES:
❌ REMOVED: Manual embedding generation with Ollama/local models
❌ REMOVED: ChromaDB client and local vector storage
✅ ADDED: Upstash Vector with automatic server-side embedding
✅ ADDED: Raw text upsert (no pre-computed vectors needed)

This script demonstrates the complete migration from ChromaDB to Upstash Vector.
"""

import json
import sys
from typing import List, Dict, Tuple
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn

# Import our modular clients (migration architecture)
from settings import Settings
from upstash_client import UpstashVectorClient

console = Console()

# Configuration
JSON_FILE = "digitaltwin.json"


def load_profile_data(filename: str = JSON_FILE) -> Dict:
    """Load profile data from JSON file"""
    console.print(f"\n📖 Loading profile data from {filename}...")
    
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
        console.print(f"✓ Loaded profile data successfully", style="green")
        return data
    except FileNotFoundError:
        console.print(f"❌ File not found: {filename}", style="red")
        sys.exit(1)
    except json.JSONDecodeError as e:
        console.print(f"❌ Invalid JSON: {e}", style="red")
        sys.exit(1)


def flatten_profile_to_chunks(profile: Dict) -> List[Tuple[str, str, Dict]]:
    """
    Convert nested profile JSON into flat chunks for vector storage
    
    MIGRATION NOTE: This replaces manual embedding generation.
    Instead of: text → embed → (id, vector, metadata)
    Now: text → (id, text, metadata)  ← Upstash auto-embeds!
    
    Returns:
        List of (id, text, metadata) tuples
    """
    console.print("\n🔄 Converting profile to vector chunks...")
    chunks = []
    chunk_id = 0
    
    # Helper to create chunks
    def add_chunk(title: str, content: str, chunk_type: str, category: str = "", tags: List[str] = None):
        nonlocal chunk_id
        chunk_id += 1
        
        # MIGRATION: Raw text instead of pre-computed embeddings
        enriched_text = f"{title}: {content}"
        
        chunks.append((
            f"chunk-{chunk_id}",
            enriched_text,  # ← Upstash will auto-embed this text
            {
                "title": title,
                "type": chunk_type,
                "content": content,
                "category": category,
                "tags": tags or []
            }
        ))
    
    # Personal Information
    if 'personal' in profile:
        p = profile['personal']
        add_chunk(
            "Personal Summary",
            p.get('summary', ''),
            "personal",
            "overview",
            ["about", "introduction"]
        )
        add_chunk(
            "Elevator Pitch",
            p.get('elevator_pitch', ''),
            "personal",
            "overview",
            ["pitch", "introduction"]
        )
    
    # Work Experience
    if 'experience' in profile:
        for idx, exp in enumerate(profile['experience'], 1):
            # Main experience summary
            exp_type = exp.get('type', 'Experience')
            title = f"{exp_type}: {exp.get('project_name', exp.get('company', 'Unknown'))}"
            
            # Combine key details
            details = []
            if exp.get('role'):
                details.append(f"Role: {exp['role']}")
            if exp.get('duration'):
                details.append(f"Duration: {exp['duration']}")
            if exp.get('context'):
                details.append(f"Context: {exp['context']}")
            
            add_chunk(
                title,
                '. '.join(details),
                "experience",
                "work_history",
                ["experience", exp_type.lower()]
            )
            
            # STAR achievements
            if 'achievements_star' in exp:
                for star_idx, star in enumerate(exp['achievements_star'], 1):
                    star_text = f"Situation: {star.get('situation', '')}. Task: {star.get('task', '')}. Action: {star.get('action', '')}. Result: {star.get('result', '')}"
                    add_chunk(
                        f"{title} - Achievement {star_idx}",
                        star_text,
                        "achievement",
                        "accomplishments",
                        ["star", "achievement", exp_type.lower()]
                    )
    
    # Technical Skills
    if 'skills' in profile and 'technical' in profile['skills']:
        tech = profile['skills']['technical']
        
        # Programming languages
        if 'programming_languages' in tech:
            for lang in tech['programming_languages']:
                lang_text = f"{lang['language']} ({lang['proficiency']}): {', '.join(lang.get('concepts', []))}"
                add_chunk(
                    f"Programming: {lang['language']}",
                    lang_text,
                    "skill",
                    "technical",
                    ["programming", lang['language'].lower()]
                )
    
    # Education
    if 'education' in profile:
        edu = profile['education']
        edu_text = f"Studying {edu.get('degree', '')} at {edu.get('university', '')}. Currently in {edu.get('current_year', '')}. GPA: {edu.get('gpa', '')}. Expected graduation: {edu.get('expected_graduation', '')}"
        add_chunk(
            "Education Background",
            edu_text,
            "education",
            "academic",
            ["education", "university"]
        )
        
        # Coursework
        if 'relevant_coursework' in edu:
            coursework_text = "Relevant coursework: " + ", ".join(edu['relevant_coursework'])
            add_chunk(
                "Academic Coursework",
                coursework_text,
                "education",
                "academic",
                ["coursework", "education"]
            )
    
    # Career Goals
    if 'career_goals' in profile:
        goals = profile['career_goals']
        goals_text = f"Immediate: {goals.get('immediate', '')}. Short-term: {goals.get('short_term', '')}. Long-term: {goals.get('long_term', '')}"
        add_chunk(
            "Career Goals",
            goals_text,
            "goals",
            "career",
            ["goals", "career"]
        )
    
    # Salary & Location
    if 'salary_location' in profile:
        sal = profile['salary_location']
        sal_text = f"Salary expectations: {sal.get('salary_expectations', '')}. Location preferences: {', '.join(sal.get('location_preferences', []))}. Work authorization: {sal.get('work_authorization', '')}"
        add_chunk(
            "Salary and Location Preferences",
            sal_text,
            "preferences",
            "compensation",
            ["salary", "location"]
        )
    
    console.print(f"✓ Created {len(chunks)} chunks from profile", style="green")
    return chunks


def ingest_to_upstash(chunks: List[Tuple[str, str, Dict]]) -> None:
    """
    Upload chunks to Upstash Vector
    
    MIGRATION HIGHLIGHT:
    ❌ OLD (ChromaDB): collection.add(ids=ids, embeddings=vectors, metadatas=metadata)
    ✅ NEW (Upstash):  index.upsert([(id, text, metadata)])  ← No embeddings!
    
    Upstash automatically generates embeddings server-side using:
    - Model: mixedbread-ai/mxbai-embed-large-v1
    - Dimensions: 1024
    - Similarity: COSINE
    """
    console.print("\n📤 Uploading to Upstash Vector Database...")
    console.print("   [Migration] Using automatic server-side embedding", style="cyan")
    console.print("   [Migration] No manual embedding generation needed!", style="cyan")
    
    try:
        # Initialize client in read-write mode
        client = UpstashVectorClient(read_only=False)
        
        # Check current state
        info = client.info()
        current_count = info.get('vectorCount', 0)
        console.print(f"\n📊 Current vectors in database: {current_count}")
        
        # Option to reset
        if current_count > 0:
            console.print(f"⚠️  Database already contains {current_count} vectors", style="yellow")
            response = input("Reset database before upload? (y/n): ").strip().lower()
            if response == 'y':
                console.print("🗑️  Resetting database...", style="yellow")
                client.reset()
                console.print("✓ Database reset complete", style="green")
        
        # Upload chunks with progress bar
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            task = progress.add_task(f"Uploading {len(chunks)} chunks...", total=1)
            
            # MIGRATION: Direct upsert with raw text (no embeddings)
            client.upsert_texts(chunks)
            
            progress.update(task, completed=1)
        
        console.print(f"\n✅ Successfully uploaded {len(chunks)} chunks to Upstash!", style="green bold")
        
        # Verify upload
        final_info = client.info()
        final_count = final_info.get('vectorCount', 0)
        console.print(f"📊 Final vector count: {final_count}")
        
    except Exception as e:
        console.print(f"\n❌ Upload failed: {e}", style="red bold")
        sys.exit(1)


def main():
    """Main ingestion pipeline"""
    console.print("=" * 70, style="cyan")
    console.print("🚀 Digital Twin Profile Ingestion", style="cyan bold")
    console.print("   ChromaDB → Upstash Vector Migration", style="cyan")
    console.print("=" * 70, style="cyan")
    
    # Validate environment
    console.print("\n📋 Validating configuration...")
    try:
        Settings.validate_or_raise()
    except ValueError as e:
        console.print(f"❌ {e}", style="red")
        sys.exit(1)
    
    Settings.print_status()
    
    # Load profile
    profile = load_profile_data()
    
    # Convert to chunks (no embedding generation!)
    chunks = flatten_profile_to_chunks(profile)
    
    # Show sample chunks
    console.print("\n📝 Sample chunks:")
    for idx, (chunk_id, text, metadata) in enumerate(chunks[:3], 1):
        console.print(f"\n  {idx}. ID: {chunk_id}")
        console.print(f"     Title: {metadata['title']}")
        console.print(f"     Type: {metadata['type']}")
        console.print(f"     Text preview: {text[:100]}...")
    
    if len(chunks) > 3:
        console.print(f"\n  ... and {len(chunks) - 3} more chunks")
    
    # Upload to Upstash
    ingest_to_upstash(chunks)
    
    console.print("\n" + "=" * 70, style="green")
    console.print("✅ Migration Complete!", style="green bold")
    console.print("=" * 70, style="green")
    console.print("\nNext steps:")
    console.print("  1. Test queries: python digital_twin_mcp_server.py")
    console.print("  2. Run smoke tests: python test_smoke.py")
    console.print("  3. Try the app: Ask questions about your profile!\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        console.print("\n\n❌ Interrupted by user", style="yellow")
        sys.exit(1)
    except Exception as e:
        console.print(f"\n❌ Fatal error: {e}", style="red bold")
        import traceback
        traceback.print_exc()
        sys.exit(1)

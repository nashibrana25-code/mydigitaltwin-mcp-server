"""
Digital Twin RAG Application
Professional implementation with modular architecture
- Upstash Vector: Built-in embeddings and vector storage
- Groq: Ultra-fast LLM inference with retry logic
"""

import json
import time
from typing import Dict, List, Optional

# Import our modular clients
from settings import Settings
from groq_client import generate_response, validate_groq_connection
from upstash_client import UpstashVectorClient

# Constants
JSON_FILE = "digitaltwin.json"
DEFAULT_MODEL = "llama-3.1-8b-instant"


def setup_vector_database() -> Optional[UpstashVectorClient]:
    """
    Setup Upstash Vector database with built-in embeddings
    Loads profile data if database is empty
    
    Returns:
        UpstashVectorClient instance or None if setup fails
    """
    print("🔄 Setting up Upstash Vector database...")
    
    try:
        # Use read-write client for setup
        client = UpstashVectorClient(read_only=False)
        
        # Check current vector count
        info = client.info()
        current_count = info.get('vectorCount', 0)
        print(f"📊 Current vectors in database: {current_count}")
        
        # Load data if database is empty
        if current_count == 0:
            print("📝 Loading your professional profile...")
            
            try:
                with open(JSON_FILE, "r", encoding="utf-8") as f:
                    profile_data = json.load(f)
            except FileNotFoundError:
                print(f"❌ {JSON_FILE} not found!")
                return None
            
            # Prepare vectors from content chunks
            vectors = []
            content_chunks = profile_data.get('content_chunks', [])
            
            if not content_chunks:
                print("❌ No content chunks found in profile data")
                return None
            
            for chunk in content_chunks:
                enriched_text = f"{chunk['title']}: {chunk['content']}"
                
                vectors.append((
                    chunk['id'],
                    enriched_text,
                    {
                        "title": chunk['title'],
                        "type": chunk['type'],
                        "content": chunk['content'],
                        "category": chunk.get('metadata', {}).get('category', ''),
                        "tags": chunk.get('metadata', {}).get('tags', [])
                    }
                ))
            
            # Upload vectors
            client.upsert_texts(vectors)
            print(f"✅ Successfully uploaded {len(vectors)} content chunks!")
        
        print("✅ Vector database ready!")
        return client
        
    except Exception as e:
        print(f"❌ Error setting up database: {e}")
        return None


def query_vectors(
    client: UpstashVectorClient, 
    query_text: str, 
    top_k: int = 3
) -> List[Dict]:
    """
    Query Upstash Vector for similar vectors
    
    Args:
        client: UpstashVectorClient instance
        query_text: Query string
        top_k: Number of results to return
    
    Returns:
        List of matching results
    """
    try:
        results = client.query_text(
            query=query_text,
            top_k=top_k,
            include_metadata=True
        )
        return results
    except Exception as e:
        print(f"❌ Error querying vectors: {e}")
        return []


def rag_query(
    vector_client: UpstashVectorClient,
    question: str,
    model: str = DEFAULT_MODEL
) -> str:
    """
    Perform RAG query using Upstash Vector + Groq
    
    Args:
        vector_client: UpstashVectorClient instance  
        question: User's question
        model: Groq model to use
        
    Returns:
        Generated response string
    """
    start_time = time.time()
    
    try:
        # Step 1: Query vector database
        print(f"\n🔍 Searching for: '{question}'")
        results = query_vectors(vector_client, question, top_k=3)
        
        if not results or len(results) == 0:
            return "I don't have specific information about that topic. The profile may need to be uploaded to the vector database first."
        
        # Step 2: Extract relevant content
        print("🧠 Analyzing your professional profile...")
        
        top_docs = []
        for result in results:
            metadata = result.get('metadata', {})
            title = metadata.get('title', 'Information')
            content = metadata.get('content', '')
            score = result.get('score', 0)
            
            print(f"  📄 {title} (relevance: {score:.3f})")
            if content:
                top_docs.append(f"{title}: {content}")
        
        if not top_docs:
            return "I found some information but couldn't extract details. Please try rephrasing your question."
        
        # Step 3: Generate response with context
        print("⚡ Generating personalized response with Groq...")
        
        context = "\n\n".join(top_docs)
        prompt = f"""Based on the following information about yourself, answer the question.
Speak in first person as if you are describing your own background.

Your Information:
{context}

Question: {question}

Provide a helpful, professional response:"""
        
        response = generate_response(prompt, model=model)
        
        duration = time.time() - start_time
        print(f"✓ Response generated in {duration:.2f}s\n")
        
        return response
    
    except Exception as e:
        print(f"❌ Error during RAG query: {e}")
        return f"An error occurred while processing your question: {e}"


def main():
    """Main application loop"""
    print("=" * 60)
    print("🤖 Your Digital Twin - AI Profile Assistant")
    print("=" * 60)
    print("🔗 Vector Storage: Upstash (built-in embeddings)")
    print(f"⚡ AI Inference: Groq ({DEFAULT_MODEL})")
    print("📋 Data Source: Your Professional Profile")
    print("=" * 60)
    
    # Validate environment
    print("\n📋 Validating configuration...")
    Settings.print_status()
    
    try:
        Settings.validate_or_raise()
    except ValueError as e:
        print(f"\n❌ {e}")
        print("\nPlease add the missing variables to your .env file and try again.")
        return
    
    # Validate Groq connection
    print("🔍 Testing Groq API connection...")
    if not validate_groq_connection():
        print("❌ Failed to connect to Groq API. Please check your GROQ_API_KEY.")
        return
    
    # Setup vector database
    vector_client = setup_vector_database()
    if not vector_client:
        print("❌ Failed to setup vector database.")
        return
    
    print("\n" + "=" * 60)
    print("✅ Your Digital Twin is ready!")
    print("=" * 60)
    
    # Interactive chat loop
    print("\n🤖 Chat with your AI Digital Twin!")
    print("Ask questions about your experience, skills, projects, or career goals.")
    print("Type 'exit' to quit.\n")
    
    print("💭 Try asking:")
    print("  - 'Tell me about your work experience'")
    print("  - 'What are your technical skills?'")
    print("  - 'Describe your career goals'")
    print("  - 'What projects have you worked on?'")
    print()
    
    while True:
        try:
            question = input("You: ").strip()
            
            if question.lower() in ["exit", "quit", "q"]:
                print("\n👋 Thanks for chatting with your Digital Twin!")
                break
            
            if not question:
                continue
            
            answer = rag_query(vector_client, question)
            print(f"\n🤖 Digital Twin: {answer}\n")
            
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}\n")


if __name__ == "__main__":
    main()

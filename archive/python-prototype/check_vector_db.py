"""Quick script to check Upstash Vector database status"""
from upstash_client import UpstashVectorClient
from rich.console import Console

console = Console()

try:
    # Initialize client
    client = UpstashVectorClient()
    
    # Get database info
    info = client.info()
    
    console.print("\n📊 Upstash Vector Database Status", style="cyan bold")
    console.print("=" * 50)
    console.print(f"Vector Count: {info.get('vectorCount', 0)}", style="green")
    console.print(f"Dimension: {info.get('dimension', 0)}")
    console.print(f"Similarity Function: {info.get('similarityFunction', 'unknown')}")
    console.print(f"Pending Vector Count: {info.get('pendingVectorCount', 0)}")
    
    # Try a sample query
    console.print("\n🔍 Testing Sample Query", style="cyan bold")
    console.print("=" * 50)
    
    test_query = "What is my recent internship experience?"
    results = client.query_text(test_query, top_k=3, include_metadata=True)
    
    console.print(f"\nQuery: '{test_query}'")
    console.print(f"Results found: {len(results)}\n")
    
    for idx, result in enumerate(results, 1):
        console.print(f"{idx}. Score: {result.score:.4f}")
        console.print(f"   ID: {result.id}")
        console.print(f"   Title: {result.metadata.get('title', 'N/A')}")
        console.print(f"   Type: {result.metadata.get('type', 'N/A')}")
        console.print(f"   Category: {result.metadata.get('category', 'N/A')}")
        content = result.metadata.get('content', '')
        console.print(f"   Content preview: {content[:150]}...")
        console.print()
    
    console.print("✅ Database is operational and updated!", style="green bold")
    
except Exception as e:
    console.print(f"❌ Error: {e}", style="red bold")
    import traceback
    traceback.print_exc()

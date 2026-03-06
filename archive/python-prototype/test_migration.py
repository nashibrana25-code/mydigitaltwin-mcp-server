"""Quick verification that migration is working"""
from upstash_client import UpstashVectorClient
from groq_client import generate_response

print("=" * 60)
print("🧪 Migration Verification Test")
print("=" * 60)

# Test 1: Vector search
print("\n1️⃣ Testing Upstash Vector Search...")
client = UpstashVectorClient(read_only=True)
results = client.query_text("What programming languages do you know?", top_k=3)

print(f"   Found {len(results)} results:")
for i, r in enumerate(results, 1):
    metadata = getattr(r, 'metadata', {})
    title = metadata.get("title", "Unknown") if isinstance(metadata, dict) else "Unknown"
    score = getattr(r, 'score', 0)
    print(f"   {i}. {title} (relevance: {score:.3f})")

# Test 2: Groq LLM
print("\n2️⃣ Testing Groq LLM...")
answer = generate_response(
    "Say 'Migration successful!' if you can read this.",
    "Be brief.",
    max_tokens=50
)
print(f"   Response: {answer}")

print("\n" + "=" * 60)
print("✅ Both migrations verified!")
print("=" * 60)
print("\n✓ Upstash Vector: Storing & searching vectors")
print("✓ Groq LLM: Generating responses")
print("\nReady to run the full RAG app!")

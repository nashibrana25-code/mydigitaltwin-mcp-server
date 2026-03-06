"""
Smoke Test for Digital Twin Workshop
Tests Groq and Upstash integrations
"""

import sys
from settings import Settings
from groq_client import validate_groq_connection, generate_response
from upstash_client import UpstashVectorClient


def test_settings():
    """Test environment variable loading"""
    print("\n" + "=" * 60)
    print("TEST 1: Environment Variables")
    print("=" * 60)
    
    Settings.print_status()
    
    missing = Settings.validate()
    if missing:
        print(f"❌ Missing variables: {', '.join(missing)}")
        return False
    
    print("✓ All required environment variables are set")
    return True


def test_groq_connection():
    """Test Groq API connection"""
    print("\n" + "=" * 60)
    print("TEST 2: Groq API Connection")
    print("=" * 60)
    
    try:
        if not validate_groq_connection():
            print("❌ Groq connection validation failed")
            return False
        
        print("✓ Groq API connection successful")
        return True
    except Exception as e:
        print(f"❌ Groq test failed: {e}")
        return False


def test_groq_generation():
    """Test Groq response generation"""
    print("\n" + "=" * 60)
    print("TEST 3: Groq Response Generation")
    print("=" * 60)
    
    try:
        response = generate_response(
            "Say 'test successful' if you can read this",
            "You are a test assistant. Be brief.",
            temperature=0.5,
            max_tokens=50
        )
        
        print(f"Response: {response}")
        
        if response and len(response) > 0:
            print("✓ Groq generation successful")
            return True
        else:
            print("❌ Empty response from Groq")
            return False
            
    except Exception as e:
        print(f"❌ Groq generation failed: {e}")
        return False


def test_upstash_connection():
    """Test Upstash Vector connection"""
    print("\n" + "=" * 60)
    print("TEST 4: Upstash Vector Connection")
    print("=" * 60)
    
    try:
        client = UpstashVectorClient(read_only=True)
        info = client.info()
        
        print(f"  Dimension: {info.get('dimension', 'N/A')}")
        print(f"  Vector Count: {info.get('vectorCount', 0)}")
        print(f"  Similarity: {info.get('similarityFunction', 'N/A')}")
        
        print("✓ Upstash Vector connection successful")
        return True
        
    except Exception as e:
        print(f"❌ Upstash connection failed: {e}")
        return False


def test_upstash_query():
    """Test Upstash Vector query"""
    print("\n" + "=" * 60)
    print("TEST 5: Upstash Vector Query")
    print("=" * 60)
    
    try:
        client = UpstashVectorClient(read_only=True)
        
        # Try a generic query
        results = client.query_text("professional experience", top_k=3)
        
        print(f"  Query returned {len(results)} results")
        
        if results:
            for i, result in enumerate(results[:3], 1):
                # Use getattr for QueryResult objects
                score = getattr(result, 'score', 0)
                metadata = getattr(result, 'metadata', {})
                title = metadata.get('title', 'Unknown') if isinstance(metadata, dict) else 'Unknown'
                print(f"  {i}. {title} (score: {score:.4f})")
        
        print("✓ Upstash query successful")
        return True
        
    except Exception as e:
        print(f"❌ Upstash query failed: {e}")
        return False


def main():
    """Run all smoke tests"""
    print("\n" + "=" * 60)
    print("🧪 Digital Twin Workshop - Smoke Tests")
    print("=" * 60)
    
    tests = [
        ("Settings", test_settings),
        ("Groq Connection", test_groq_connection),
        ("Groq Generation", test_groq_generation),
        ("Upstash Connection", test_upstash_connection),
        ("Upstash Query", test_upstash_query),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            passed = test_func()
            results.append((test_name, passed))
        except Exception as e:
            print(f"\n❌ Test '{test_name}' crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    
    passed_count = sum(1 for _, passed in results if passed)
    total_count = len(results)
    
    for test_name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"  {status}: {test_name}")
    
    print(f"\n  {passed_count}/{total_count} tests passed")
    
    if passed_count == total_count:
        print("\n🎉 All tests passed! Your setup is complete.")
        return 0
    else:
        print(f"\n⚠️ {total_count - passed_count} test(s) failed. Check the output above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())

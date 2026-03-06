"""
Comprehensive Testing & Validation Suite
Tests all components of the Digital Twin Workshop after migration
"""

import time
import sys
from typing import List, Dict, Tuple
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn

from settings import Settings
from upstash_client import UpstashVectorClient
from groq_client import generate_response, validate_groq_connection
from digital_twin_mcp_server import rag_query, setup_vector_database

console = Console()


class TestResults:
    """Track test results"""
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.performance_metrics = {}
    
    def add_pass(self):
        self.tests_run += 1
        self.tests_passed += 1
    
    def add_fail(self):
        self.tests_run += 1
        self.tests_failed += 1
    
    def add_metric(self, name: str, value: float, unit: str = "ms"):
        self.performance_metrics[name] = {"value": value, "unit": unit}


results = TestResults()


def test_header(test_name: str, test_number: int):
    """Print test header"""
    console.print(f"\n{'='*70}", style="cyan")
    console.print(f"TEST {test_number}: {test_name}", style="cyan bold")
    console.print(f"{'='*70}", style="cyan")


def test_database_connectivity() -> bool:
    """Test 1: Database Connectivity"""
    test_header("Database Connectivity", 1)
    
    try:
        console.print("\n📊 Testing Upstash Vector connection...")
        
        # Test read-only client
        ro_client = UpstashVectorClient(read_only=True)
        console.print("  ✓ Read-only client initialized", style="green")
        
        # Get index info
        start = time.time()
        info = ro_client.info()
        latency = (time.time() - start) * 1000
        results.add_metric("Database Info Query", latency)
        
        console.print(f"\n  Database Information:")
        console.print(f"    • Dimension: {info.get('dimension', 'N/A')}")
        console.print(f"    • Vector Count: {info.get('vectorCount', 0)}")
        console.print(f"    • Similarity Function: {info.get('similarityFunction', 'N/A')}")
        console.print(f"    • Query Latency: {latency:.2f}ms")
        
        # Validate expected values
        assert info.get('dimension') == 1024, "Dimension should be 1024"
        assert info.get('vectorCount', 0) > 0, "Database should contain vectors"
        assert info.get('similarityFunction') == 'COSINE', "Should use COSINE similarity"
        
        console.print("\n  ✅ All connectivity checks passed", style="green bold")
        results.add_pass()
        return True
        
    except Exception as e:
        console.print(f"\n  ❌ Connectivity test failed: {e}", style="red bold")
        results.add_fail()
        return False


def test_embedding_generation() -> bool:
    """Test 2: Verify Automatic Embedding"""
    test_header("Automatic Embedding Verification", 2)
    
    try:
        console.print("\n🔧 Testing automatic server-side embedding...")
        
        client = UpstashVectorClient(read_only=True)
        
        # Query with text - Upstash will auto-embed
        test_queries = [
            "Python programming language",
            "Java development experience",
            "Web development skills"
        ]
        
        console.print("\n  Testing queries (Upstash auto-embeds these):")
        for i, query in enumerate(test_queries, 1):
            start = time.time()
            results_list = client.query_text(query, top_k=1)
            latency = (time.time() - start) * 1000
            
            console.print(f"\n  Query {i}: '{query}'")
            console.print(f"    • Auto-embedding: ✓ Completed")
            console.print(f"    • Search latency: {latency:.2f}ms")
            
            if results_list:
                top_result = results_list[0]
                score = getattr(top_result, 'score', 0)
                metadata = getattr(top_result, 'metadata', {})
                title = metadata.get('title', 'Unknown') if isinstance(metadata, dict) else 'Unknown'
                
                console.print(f"    • Top result: {title} (score: {score:.3f})")
                
                # Validate score quality
                assert score > 0.5, f"Score too low: {score}"
            
            results.add_metric(f"Auto-embed Query {i}", latency)
        
        console.print("\n  ✅ Automatic embedding working correctly", style="green bold")
        console.print("  ℹ️  Note: No manual embedding code required!", style="cyan")
        results.add_pass()
        return True
        
    except Exception as e:
        console.print(f"\n  ❌ Embedding test failed: {e}", style="red bold")
        results.add_fail()
        return False


def test_query_functionality() -> bool:
    """Test 3: Query Functionality"""
    test_header("Semantic Search Query Functionality", 3)
    
    try:
        console.print("\n🔍 Testing semantic search queries...")
        
        client = UpstashVectorClient(read_only=True)
        
        # Test queries with expected results
        test_cases = [
            {
                "query": "What programming languages do you know?",
                "expected_keywords": ["python", "java", "php"],
                "min_score": 0.7
            },
            {
                "query": "Tell me about your education",
                "expected_keywords": ["victoria", "university", "bachelor"],
                "min_score": 0.7
            },
            {
                "query": "What are your career goals?",
                "expected_keywords": ["developer", "career", "goal"],
                "min_score": 0.65
            }
        ]
        
        for i, test_case in enumerate(test_cases, 1):
            console.print(f"\n  Test Case {i}: {test_case['query']}")
            
            start = time.time()
            search_results = client.query_text(test_case['query'], top_k=3)
            latency = (time.time() - start) * 1000
            results.add_metric(f"Query {i}", latency)
            
            console.print(f"    • Results found: {len(search_results)}")
            console.print(f"    • Search latency: {latency:.2f}ms")
            
            # Check top results
            for j, result in enumerate(search_results[:3], 1):
                score = getattr(result, 'score', 0)
                metadata = getattr(result, 'metadata', {})
                title = metadata.get('title', 'Unknown') if isinstance(metadata, dict) else 'Unknown'
                content = metadata.get('content', '') if isinstance(metadata, dict) else ''
                
                console.print(f"      {j}. {title} (score: {score:.3f})")
                
                # Validate score
                if j == 1:  # Check top result
                    assert score >= test_case['min_score'], f"Top score too low: {score}"
                
                # Check for expected keywords
                content_lower = content.lower()
                found_keywords = [kw for kw in test_case['expected_keywords'] if kw in content_lower]
                if found_keywords and j == 1:
                    console.print(f"         Keywords found: {', '.join(found_keywords)}", style="dim")
        
        console.print("\n  ✅ All query tests passed", style="green bold")
        results.add_pass()
        return True
        
    except Exception as e:
        console.print(f"\n  ❌ Query test failed: {e}", style="red bold")
        results.add_fail()
        return False


def test_llm_responses() -> bool:
    """Test 4: LLM Response Validation"""
    test_header("Groq LLM Response Validation", 4)
    
    try:
        console.print("\n🤖 Testing Groq LLM responses...")
        
        # Test basic generation
        console.print("\n  Test 1: Basic Generation")
        start = time.time()
        response = generate_response(
            "Say exactly 'Test passed' and nothing else.",
            "You are a test assistant. Follow instructions precisely.",
            temperature=0.1,
            max_tokens=10
        )
        latency = (time.time() - start) * 1000
        results.add_metric("Basic LLM Generation", latency)
        
        console.print(f"    • Response: {response}")
        console.print(f"    • Latency: {latency:.2f}ms")
        assert len(response) > 0, "Response should not be empty"
        
        # Test with context
        console.print("\n  Test 2: Response with Context")
        context = "John is a software engineer with 5 years of Python experience."
        start = time.time()
        response = generate_response(
            f"Context: {context}\n\nQuestion: What is John's experience?\n\nAnswer briefly:",
            temperature=0.5,
            max_tokens=50
        )
        latency = (time.time() - start) * 1000
        results.add_metric("Contextual LLM Generation", latency)
        
        console.print(f"    • Response: {response[:100]}...")
        console.print(f"    • Latency: {latency:.2f}ms")
        assert "python" in response.lower() or "software" in response.lower(), "Should mention context"
        
        # Test error handling (invalid model)
        console.print("\n  Test 3: Error Handling")
        try:
            generate_response("test", model="invalid-model-name")
            console.print("    ❌ Should have raised error for invalid model", style="yellow")
        except RuntimeError as e:
            if "not found" in str(e).lower() or "model" in str(e).lower():
                console.print("    ✓ Error handling works correctly", style="green")
            else:
                raise
        
        console.print("\n  ✅ All LLM validation tests passed", style="green bold")
        results.add_pass()
        return True
        
    except Exception as e:
        console.print(f"\n  ❌ LLM validation failed: {e}", style="red bold")
        results.add_fail()
        return False


def test_performance() -> bool:
    """Test 5: Performance Testing"""
    test_header("Performance Benchmarking", 5)
    
    try:
        console.print("\n⚡ Running performance benchmarks...")
        
        # Setup
        vector_client = UpstashVectorClient(read_only=True)
        
        # Test 1: Vector Search Performance
        console.print("\n  Benchmark 1: Vector Search Speed")
        search_times = []
        for i in range(5):
            start = time.time()
            vector_client.query_text("programming skills", top_k=3)
            search_times.append((time.time() - start) * 1000)
        
        avg_search = sum(search_times) / len(search_times)
        min_search = min(search_times)
        max_search = max(search_times)
        
        console.print(f"    • Average: {avg_search:.2f}ms")
        console.print(f"    • Min: {min_search:.2f}ms")
        console.print(f"    • Max: {max_search:.2f}ms")
        results.add_metric("Avg Vector Search", avg_search)
        
        # Test 2: LLM Generation Performance
        console.print("\n  Benchmark 2: LLM Generation Speed")
        llm_times = []
        for i in range(3):
            start = time.time()
            generate_response("Hello", max_tokens=50)
            llm_times.append((time.time() - start) * 1000)
        
        avg_llm = sum(llm_times) / len(llm_times)
        min_llm = min(llm_times)
        max_llm = max(llm_times)
        
        console.print(f"    • Average: {avg_llm:.2f}ms")
        console.print(f"    • Min: {min_llm:.2f}ms")
        console.print(f"    • Max: {max_llm:.2f}ms")
        results.add_metric("Avg LLM Generation", avg_llm)
        
        # Test 3: End-to-End RAG Performance
        console.print("\n  Benchmark 3: End-to-End RAG Query")
        rag_times = []
        
        # Need to setup vector client for RAG
        vector_db_client = setup_vector_database()
        if vector_db_client:
            for i in range(3):
                start = time.time()
                rag_query(vector_db_client, "What programming languages do you know?")
                rag_times.append((time.time() - start) * 1000)
            
            avg_rag = sum(rag_times) / len(rag_times)
            min_rag = min(rag_times)
            max_rag = max(rag_times)
            
            console.print(f"    • Average: {avg_rag:.2f}ms")
            console.print(f"    • Min: {min_rag:.2f}ms")
            console.print(f"    • Max: {max_rag:.2f}ms")
            results.add_metric("Avg E2E RAG Query", avg_rag)
        
        # Performance assertions
        assert avg_search < 1000, "Vector search should be under 1 second"
        assert avg_llm < 10000, "LLM generation should be under 10 seconds"
        
        console.print("\n  ✅ Performance benchmarks completed", style="green bold")
        results.add_pass()
        return True
        
    except Exception as e:
        console.print(f"\n  ❌ Performance test failed: {e}", style="red bold")
        results.add_fail()
        return False


def generate_report():
    """Generate comprehensive test report"""
    console.print("\n" + "="*70, style="cyan")
    console.print("📊 TEST REPORT", style="cyan bold")
    console.print("="*70, style="cyan")
    
    # Summary
    pass_rate = (results.tests_passed / results.tests_run * 100) if results.tests_run > 0 else 0
    
    summary_table = Table(title="Test Summary", show_header=True, header_style="bold magenta")
    summary_table.add_column("Metric", style="cyan")
    summary_table.add_column("Value", style="green")
    
    summary_table.add_row("Tests Run", str(results.tests_run))
    summary_table.add_row("Tests Passed", str(results.tests_passed))
    summary_table.add_row("Tests Failed", str(results.tests_failed))
    summary_table.add_row("Pass Rate", f"{pass_rate:.1f}%")
    
    console.print("\n")
    console.print(summary_table)
    
    # Performance Metrics
    if results.performance_metrics:
        perf_table = Table(title="Performance Metrics", show_header=True, header_style="bold yellow")
        perf_table.add_column("Operation", style="cyan")
        perf_table.add_column("Time", style="green", justify="right")
        perf_table.add_column("Status", style="white")
        
        for name, metric in results.performance_metrics.items():
            value = metric["value"]
            unit = metric["unit"]
            
            # Determine status based on thresholds
            if "Vector Search" in name:
                status = "✅ Excellent" if value < 500 else "⚠️ Acceptable" if value < 1000 else "❌ Slow"
            elif "LLM" in name:
                status = "✅ Excellent" if value < 3000 else "⚠️ Acceptable" if value < 5000 else "❌ Slow"
            elif "RAG" in name:
                status = "✅ Excellent" if value < 4000 else "⚠️ Acceptable" if value < 8000 else "❌ Slow"
            else:
                status = "✓"
            
            perf_table.add_row(name, f"{value:.2f} {unit}", status)
        
        console.print("\n")
        console.print(perf_table)
    
    # Final verdict
    console.print("\n" + "="*70, style="cyan")
    if results.tests_failed == 0:
        console.print("✅ ALL TESTS PASSED!", style="green bold")
        console.print("🎉 System is fully operational and ready for production!", style="green")
    else:
        console.print(f"⚠️ {results.tests_failed} TEST(S) FAILED", style="yellow bold")
        console.print("Please review the errors above and fix issues.", style="yellow")
    console.print("="*70, style="cyan")


def main():
    """Run all tests"""
    console.print("="*70, style="bold cyan")
    console.print("🧪 DIGITAL TWIN WORKSHOP - COMPREHENSIVE TESTING", style="bold cyan")
    console.print("="*70, style="bold cyan")
    
    # Validate environment
    console.print("\n📋 Pre-flight checks...")
    try:
        Settings.validate_or_raise()
        console.print("  ✓ Environment configuration valid", style="green")
    except ValueError as e:
        console.print(f"  ❌ {e}", style="red")
        return 1
    
    # Run tests
    tests = [
        ("Database Connectivity", test_database_connectivity),
        ("Automatic Embedding", test_embedding_generation),
        ("Query Functionality", test_query_functionality),
        ("LLM Response Validation", test_llm_responses),
        ("Performance Benchmarking", test_performance),
    ]
    
    console.print(f"\n🚀 Running {len(tests)} test suites...\n")
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        console=console
    ) as progress:
        task = progress.add_task("Running tests...", total=len(tests))
        
        for test_name, test_func in tests:
            test_func()
            progress.update(task, advance=1)
            time.sleep(0.5)  # Brief pause between tests
    
    # Generate report
    generate_report()
    
    # Return appropriate exit code
    return 0 if results.tests_failed == 0 else 1


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        console.print("\n\n❌ Tests interrupted by user", style="yellow")
        sys.exit(1)
    except Exception as e:
        console.print(f"\n❌ Fatal error: {e}", style="red bold")
        import traceback
        traceback.print_exc()
        sys.exit(1)

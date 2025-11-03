# Query Performance Metrics

Source: `tests/TEST_RESULTS.md` - Automated test run on November 4, 2025

## Summary
- **Total questions:** 25
- **Pass rate:** 100% (25/25 passed, 0 failures)
- **Average latency:** 3,911.6 ms (3.9 seconds)
- **p95 latency:** 7,109 ms (7.1 seconds)
- **Total execution time:** 97.8 seconds

## Performance by Category

| Category | Questions | Avg Latency | Range |
|----------|-----------|-------------|-------|
| Technical Skills | 5 | ~1,034 ms | 0.98-1.19s ✅ |
| Leadership/Collaboration | 4 | ~1,011 ms | 0.86-1.19s ✅ |
| Problem Solving | 3 | ~4,448 ms | 3.25-5.09s |
| Career Progression | 3 | ~5,218 ms | 4.67-6.02s |
| Industry Knowledge | 2 | ~6,625 ms | 6.14-7.11s |
| Cultural Fit | 2 | ~5,555 ms | 4.88-6.23s |
| Achievement Quantification | 3 | ~7,390 ms | 6.25-8.11s |
| Profile Facts | 3 | ~4,349 ms | 3.69-4.72s |

## Key Insights
- ✅ **Simple factual queries** (name, age, skills) respond in under 2 seconds
- ✅ **85%+ of queries** complete within the p95 threshold (7.1s)
- ⚡ **Fastest response:** 858ms (leadership collaboration question)
- 🐌 **Slowest response:** 8,108ms (complex achievement quantification requiring synthesis)
- 📊 **Vector search** contributes <200ms; majority of latency from LLM generation time

## Production Readiness
- All queries return valid responses with proper context
- No errors or timeouts observed
- Performance meets Week 6 targets for production deployment

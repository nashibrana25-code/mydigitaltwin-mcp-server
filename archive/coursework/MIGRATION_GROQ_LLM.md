# Migration Design: Local Ollama LLM ➜ Groq Cloud API

Author: You (with Copilot)  
Date: 2025-11-01  
Status: Proposed

## Executive Summary

We will replace the local Ollama LLM inference (llama3.2 via localhost:11434) with the cloud-hosted Groq API using the `llama-3.1-8b-instant` model. Groq provides ultra-fast inference with simple API key authentication and OpenAI-compatible endpoints. The RAG pipeline UX remains identical (retrieve context from Upstash Vector; generate answer with LLM), but inference moves from local to managed cloud.

**Key Changes:**
- LLM: Ollama `llama3.2` (local) ➜ Groq `llama-3.1-8b-instant` (cloud)
- API: localhost:11434/api/generate ➜ Groq REST API (https://api.groq.com/openai/v1)
- Auth: None (local) ➜ Bearer token with GROQ_API_KEY
- Streaming: Disabled (before and after for simplicity; can enable later)
- Cost: Free local compute ➜ Usage-based Groq pricing (extremely competitive)

**Reference Implementation:**  
The Next.js app (`digital-twin-mcp/lib/groq.ts`) already uses Groq successfully. We will mirror its patterns in Python.

---

## Architecture Comparison

### Before (Current)
- **LLM Inference**
  - Model: Ollama `llama3.2` (local)
  - Endpoint: `http://localhost:11434/api/generate`
  - Request: `{"model": "llama3.2", "prompt": "...", "stream": false}`
  - Response: `{"response": "..."}`
  - Auth: None
  - Latency: Depends on local hardware (CPU/GPU)
  - Cost: Free (local compute)
  - Availability: Requires Ollama running locally

- **RAG Pipeline**
  1. Retrieve context from vector DB (Upstash)
  2. Build prompt with context
  3. POST to localhost:11434/api/generate
  4. Return answer to user

### After (Target)
- **LLM Inference**
  - Model: Groq `llama-3.1-8b-instant` (cloud)
  - Endpoint: Groq API (OpenAI-compatible)
  - Request: Chat completions format
  - Response: OpenAI-style completion
  - Auth: Bearer token (`GROQ_API_KEY`)
  - Latency: Ultra-fast (Groq's LPU architecture, typically <1s)
  - Cost: Usage-based (see pricing section)
  - Availability: 99.9% uptime SLA

- **RAG Pipeline**
  1. Retrieve context from vector DB (Upstash) — unchanged
  2. Build messages array with system + user prompts
  3. Call Groq API with retry logic and error handling
  4. Return answer to user

**Result:** Faster, more reliable inference; no local Ollama dependency; consistent behavior across environments.

---

## Detailed Migration Steps

### Phase 1: Environment Setup
1. **Install Groq Python SDK**
   ```bash
   pip install groq
   ```

2. **Verify .env Configuration**
   - Ensure `GROQ_API_KEY` is present in `.env` (already done per your note)
   - Example:
     ```bash
     GROQ_API_KEY="gsk_..."
     ```

3. **Update requirements.txt**
   ```
   groq>=0.4.0
   python-dotenv>=1.0.0
   upstash-vector>=0.1.0
   ```

### Phase 2: Create Groq Client Module
Create `groq_client.py` mirroring the TypeScript implementation:

**File:** `digital-twin-workshop/groq_client.py`

```python
"""
Groq AI Integration
Handles LLM inference using Groq's ultra-fast API with LLaMA models
"""

import os
import time
from typing import Optional
from groq import Groq

DEFAULT_MODEL = "llama-3.1-8b-instant"
MAX_RETRIES = 3
RETRY_DELAY_MS = 1000

# Environment variable validation
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

if not GROQ_API_KEY:
    print("❌ Missing GROQ_API_KEY in environment variables")


def get_groq_client() -> Groq:
    """
    Initialize and return Groq client instance
    
    Returns:
        Groq: Configured Groq client
        
    Raises:
        ValueError: If API key is missing
    """
    if not GROQ_API_KEY:
        raise ValueError("Missing required environment variable: GROQ_API_KEY")
    
    try:
        client = Groq(api_key=GROQ_API_KEY)
        return client
    except Exception as error:
        print(f"❌ Failed to initialize Groq client: {error}")
        raise RuntimeError(f"Failed to initialize Groq client: {error}")


def generate_response(
    prompt: str,
    system_prompt: Optional[str] = None,
    model: str = DEFAULT_MODEL,
    temperature: float = 0.7,
    max_tokens: int = 500
) -> str:
    """
    Generate AI response using Groq with context and retry logic
    
    Args:
        prompt: User prompt/question
        system_prompt: System instructions for the AI (optional)
        model: Groq model to use (default: llama-3.1-8b-instant)
        temperature: Sampling temperature (0.0-2.0)
        max_tokens: Maximum tokens in response
        
    Returns:
        str: Generated response text
        
    Raises:
        ValueError: If prompt is invalid
        RuntimeError: If generation fails after retries
    """
    start_time = time.time()
    
    # Input validation
    if not prompt or not prompt.strip():
        raise ValueError("Prompt cannot be empty")
    
    if len(prompt) > 8000:
        print("⚠️ Prompt is very long, truncating to 8000 characters")
        prompt = prompt[:8000]
    
    client = get_groq_client()
    default_system_prompt = (
        "You are an AI digital twin. Answer questions as if you are the person, "
        "speaking in first person about your background, skills, and experience."
    )
    
    last_error = None
    
    # Retry loop for transient failures
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            print(f"🤖 Generating response with Groq (attempt {attempt}/{MAX_RETRIES})...")
            
            completion = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt or default_system_prompt
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=1,
                stream=False,
            )
            
            duration_ms = int((time.time() - start_time) * 1000)
            response = completion.choices[0].message.content.strip() if completion.choices else None
            
            if not response:
                raise RuntimeError("Groq returned empty response")
            
            print(f"✓ Response generated in {duration_ms}ms ({len(response)} chars)")
            
            return response
            
        except Exception as error:
            last_error = error
            duration_ms = int((time.time() - start_time) * 1000)
            
            print(f"❌ Groq generation failed (attempt {attempt}/{MAX_RETRIES}) after {duration_ms}ms: {error}")
            
            error_msg = str(error).lower()
            
            # Handle specific Groq API errors
            
            # Rate limit errors
            if "429" in error_msg or "rate limit" in error_msg:
                print("⚠️ Rate limit hit, waiting before retry...")
                if attempt < MAX_RETRIES:
                    time.sleep((RETRY_DELAY_MS * attempt) / 1000)  # Exponential backoff
                    continue
                raise RuntimeError("Groq API rate limit exceeded. Please try again later.")
            
            # Authentication errors
            if "401" in error_msg or "unauthorized" in error_msg:
                raise RuntimeError("Invalid Groq API key. Please check your credentials.")
            
            # Model not found
            if "404" in error_msg or "model_not_found" in error_msg:
                raise RuntimeError(f"Model '{model}' not found. Please use a valid Groq model.")
            
            # Timeout errors
            if "timeout" in error_msg:
                print("⚠️ Request timeout, retrying...")
                if attempt < MAX_RETRIES:
                    time.sleep(RETRY_DELAY_MS / 1000)
                    continue
                raise RuntimeError("Groq API request timed out. Please try again.")
            
            # Retry for other transient errors
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_MS / 1000)
                continue
    
    # If all retries failed
    raise RuntimeError(
        f"Failed to generate response after {MAX_RETRIES} attempts: {last_error}"
    )


def validate_groq_connection() -> bool:
    """
    Validate Groq API connection
    
    Returns:
        bool: True if connection is valid
    """
    try:
        generate_response("Test", "Respond with 'OK'", DEFAULT_MODEL)
        return True
    except Exception as error:
        print(f"❌ Groq API connection validation failed: {error}")
        return False
```

### Phase 3: Update RAG Pipeline
Modify your RAG query function to use Groq instead of Ollama:

**Before (Ollama):**
```python
import requests

def query_llm(prompt: str) -> str:
    response = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": "llama3.2",
            "prompt": prompt,
            "stream": False
        }
    )
    return response.json()["response"]
```

**After (Groq):**
```python
from groq_client import generate_response

def query_llm(prompt: str, context: str = "") -> str:
    """Query LLM with optional context for RAG"""
    if context:
        full_prompt = f"""Based on the following information, answer the question.
Speak in first person as if you are describing your own background.

Context:
{context}

Question: {prompt}

Provide a helpful, professional response:"""
    else:
        full_prompt = prompt
    
    return generate_response(full_prompt)
```

### Phase 4: Update MCP Server
Modify `digital_twin_mcp_server.py` to import and use the new Groq client:

```python
from dotenv import load_dotenv
load_dotenv()

from groq_client import generate_response, validate_groq_connection
from upstash_client import UpstashVectorClient

# Validate connection on startup
if not validate_groq_connection():
    print("⚠️ Warning: Groq API validation failed")

# In your query handler:
def handle_query(user_question: str) -> dict:
    # 1. Retrieve context from Upstash
    vector_client = UpstashVectorClient(read_only=True)
    results = vector_client.query_text(user_question, top_k=3, include_metadata=True)
    
    # 2. Build context
    context = "\n\n".join([
        f"{r.get('metadata', {}).get('title', 'Info')}: {r.get('metadata', {}).get('content', '')}"
        for r in results
    ])
    
    # 3. Generate answer with Groq
    prompt = f"""Based on the following information, answer the question.
Speak in first person.

Context:
{context}

Question: {user_question}

Answer:"""
    
    answer = generate_response(prompt)
    
    return {
        "answer": answer,
        "sources": results,
        "success": True
    }
```

### Phase 5: Remove Ollama Dependencies
1. **Stop Ollama service** (if running)
2. **Remove Ollama imports** from Python files
3. **Delete Ollama-specific code** (localhost requests, stream handling)
4. **Update documentation** to reference Groq instead of Ollama

---

## Code Changes Required

### New Files
1. `groq_client.py` — Groq API wrapper with retry logic (see Phase 2)
2. `requirements.txt` — Add `groq>=0.4.0`

### Modified Files
1. `digital_twin_mcp_server.py`
   - Replace Ollama HTTP requests with `generate_response()`
   - Add Groq connection validation on startup
   
2. Any RAG query functions
   - Replace `requests.post(localhost:11434...)` with `generate_response()`
   - Update prompt format to use chat messages pattern

### Deleted Code
- All `requests.post("http://localhost:11434/api/generate", ...)` calls
- Ollama-specific error handling
- Local model management code

---

## Error Handling for API Failures

### Retry Strategy (Implemented in groq_client.py)
```python
MAX_RETRIES = 3
RETRY_DELAY_MS = 1000  # Exponential backoff: 1s, 2s, 3s
```

### Error Categories

| Error Type | HTTP Code | Handling Strategy |
|------------|-----------|-------------------|
| **Rate Limit** | 429 | Exponential backoff; fail after 3 attempts with user-friendly message |
| **Authentication** | 401 | Immediate fail; check API key |
| **Invalid Model** | 404 | Immediate fail; verify model name |
| **Timeout** | N/A | Retry with delay; fail after 3 attempts |
| **Network** | 5xx | Retry with delay; fail after 3 attempts |
| **Invalid Input** | 400 | Immediate fail; validate prompt length/content |

### Fallback Strategies
1. **Graceful degradation:** Return error message to user instead of crashing
2. **Circuit breaker (optional):** After N consecutive failures, temporarily disable Groq and show maintenance message
3. **Logging:** Log all errors with timestamps for debugging and rate limit analysis

---

## Rate Limiting Considerations

### Groq Rate Limits (as of Nov 2025)
- **Free Tier:** 30 requests/minute, 14,400 requests/day
- **Paid Tier:** Higher limits based on usage tier
- **Token limits:** Varies by model

### Mitigation Strategies
1. **Exponential backoff** — Already implemented in `groq_client.py`
2. **Request throttling** — Add local rate limiter if needed:
   ```python
   from time import sleep
   from datetime import datetime, timedelta
   
   class RateLimiter:
       def __init__(self, max_requests: int, window_seconds: int):
           self.max_requests = max_requests
           self.window = timedelta(seconds=window_seconds)
           self.requests = []
       
       def wait_if_needed(self):
           now = datetime.now()
           self.requests = [r for r in self.requests if now - r < self.window]
           if len(self.requests) >= self.max_requests:
               sleep_time = (self.requests[0] + self.window - now).total_seconds()
               if sleep_time > 0:
                   sleep(sleep_time)
           self.requests.append(now)
   ```

3. **Caching** — Cache common queries to reduce API calls:
   ```python
   from functools import lru_cache
   
   @lru_cache(maxsize=100)
   def cached_generate(prompt: str, system_prompt: str = ""):
       return generate_response(prompt, system_prompt)
   ```

4. **Monitoring** — Track request counts and response times to stay under limits

---

## Cost Implications and Usage Monitoring

### Cost Comparison

| Aspect | Ollama (Local) | Groq (Cloud) |
|--------|----------------|--------------|
| **Setup** | Free | Free |
| **Compute** | Local hardware cost | $0.00 per request (extremely competitive) |
| **Model** | llama3.2 | llama-3.1-8b-instant |
| **Inference Speed** | Varies (CPU/GPU dependent) | <1s typical (LPU-optimized) |
| **Maintenance** | Manual updates | Automatic |
| **Scalability** | Limited by hardware | Unlimited |
| **Availability** | Local uptime only | 99.9% SLA |

### Groq Pricing (Nov 2025)
- **llama-3.1-8b-instant:** Extremely competitive, often sub-cent per 1K tokens
- **Free tier:** Generous limits for development/testing
- **Pay-as-you-go:** No monthly minimums

### Usage Monitoring
1. **Track in application:**
   ```python
   usage_stats = {
       "total_requests": 0,
       "total_tokens": 0,
       "errors": 0,
       "avg_latency_ms": 0
   }
   
   def track_usage(response_time_ms: int, tokens_used: int):
       usage_stats["total_requests"] += 1
       usage_stats["total_tokens"] += tokens_used
       # Update avg_latency_ms...
   ```

2. **Groq Dashboard:** Monitor usage via Groq's web console
3. **Alerts:** Set up alerts for approaching rate limits or budget thresholds

---

## Testing Approach

### Unit Tests
**File:** `tests/test_groq_client.py`

```python
import pytest
from groq_client import generate_response, validate_groq_connection

def test_generate_response_success():
    """Test basic response generation"""
    response = generate_response("Say hello", "You are a friendly assistant")
    assert response
    assert len(response) > 0

def test_generate_response_empty_prompt():
    """Test that empty prompts raise ValueError"""
    with pytest.raises(ValueError):
        generate_response("")

def test_validate_connection():
    """Test API connection validation"""
    # Skip if no API key in CI
    import os
    if not os.environ.get("GROQ_API_KEY"):
        pytest.skip("No GROQ_API_KEY available")
    
    assert validate_groq_connection() == True

@pytest.mark.skipif(not os.environ.get("GROQ_API_KEY"), reason="No API key")
def test_rag_flow():
    """Test full RAG flow with Groq"""
    # Mock vector search results
    context = "John Doe is a software engineer with 5 years of experience."
    prompt = f"Context: {context}\n\nQuestion: What is John's experience?"
    
    response = generate_response(prompt)
    assert "software engineer" in response.lower() or "5 years" in response.lower()
```

### Integration Tests
1. **Smoke test:** On startup, validate Groq connection
2. **End-to-end test:** Query ➜ Vector search ➜ LLM ➜ Response
3. **Error scenarios:** Test with invalid API key, network timeout, rate limit

### Manual Testing
```bash
# Test Groq client directly
python -c "from groq_client import generate_response; print(generate_response('Hello'))"

# Test full RAG pipeline
python digital_twin_mcp_server.py
# Then send a test query
```

---

## Performance Comparison Expectations

### Ollama (Local)
- **Latency:** 2-10s (CPU), 0.5-2s (GPU)
- **Throughput:** Limited by local hardware
- **Consistency:** Varies with system load
- **Cold start:** Slow if model not loaded

### Groq (Cloud)
- **Latency:** <1s typical (LPU-optimized)
- **Throughput:** High, scales automatically
- **Consistency:** Very consistent
- **Cold start:** None (always warm)

### Expected Improvements
- **Faster responses:** 2-5x faster typical latency
- **Better reliability:** No dependency on local Ollama process
- **Easier deployment:** No need to bundle models or manage Ollama
- **Consistent performance:** Same speed regardless of local hardware

---

## Migration Checklist

### Pre-Migration
- [ ] Verify `GROQ_API_KEY` in `.env`
- [ ] Test Groq API access with curl or Python snippet
- [ ] Backup current Ollama-based code

### Implementation
- [ ] Install Groq SDK: `pip install groq`
- [ ] Create `groq_client.py` with retry logic and error handling
- [ ] Update `requirements.txt` to include `groq>=0.4.0`
- [ ] Modify RAG pipeline to use `generate_response()`
- [ ] Update `digital_twin_mcp_server.py` with Groq integration
- [ ] Add connection validation on startup

### Testing
- [ ] Unit tests for `groq_client.py` pass
- [ ] Integration test: Full RAG query works end-to-end
- [ ] Error handling: Test invalid API key, timeout, rate limit
- [ ] Performance: Measure and compare latency vs Ollama

### Cleanup
- [ ] Remove all Ollama HTTP request code
- [ ] Stop Ollama service (if running)
- [ ] Update documentation to reference Groq
- [ ] Remove Ollama from setup instructions

### Monitoring
- [ ] Set up usage tracking in application
- [ ] Monitor Groq dashboard for usage/costs
- [ ] Configure alerts for rate limits or budget thresholds

---

## Security Considerations

### API Key Management
1. **Storage:** Keep `GROQ_API_KEY` in `.env` (already in `.gitignore`)
2. **Access control:** Use environment variables; never hard-code
3. **Rotation:** Document key rotation process
4. **Logging:** Never log API keys; scrub from error messages

### Best Practices
```python
# ✅ GOOD
api_key = os.environ.get("GROQ_API_KEY")
client = Groq(api_key=api_key)

# ❌ BAD
client = Groq(api_key="gsk_...")
```

### Transport Security
- All Groq API calls use HTTPS
- No sensitive data should be included in prompts unless necessary
- Consider PII scrubbing if user data is sensitive

### Secrets in Logs
```python
# Scrub secrets from error messages
def safe_log_error(error: Exception):
    error_msg = str(error).replace(os.environ.get("GROQ_API_KEY", ""), "***")
    print(f"Error: {error_msg}")
```

---

## Rollback Plan

If issues arise with Groq migration:

1. **Keep Ollama code in git history** — Easy revert with `git checkout`
2. **Feature flag (optional):** Toggle between Ollama and Groq
   ```python
   USE_GROQ = os.environ.get("USE_GROQ", "true").lower() == "true"
   
   def query_llm(prompt: str) -> str:
       if USE_GROQ:
           return generate_response(prompt)
       else:
           return query_ollama_legacy(prompt)
   ```
3. **Monitor first 24h:** Watch for errors, latency, rate limits
4. **Rollback trigger:** >5% error rate or user complaints

---

## Next Steps After Migration

1. **Enable streaming (optional):** Groq supports streaming for real-time UX
   ```python
   completion = client.chat.completions.create(
       model="llama-3.1-8b-instant",
       messages=[...],
       stream=True  # Enable streaming
   )
   for chunk in completion:
       print(chunk.choices[0].delta.content, end="")
   ```

2. **Experiment with other models:**
   - `llama-3.1-70b-versatile` — Larger, more capable
   - `mixtral-8x7b-32768` — Long context window

3. **Add caching:** Cache common queries to reduce costs

4. **A/B testing:** Compare answer quality between models

5. **Fine-tuning (future):** If Groq adds fine-tuning, customize for your domain

---

## Summary

This migration from Ollama to Groq:
- **Simplifies deployment:** No local LLM management
- **Improves performance:** Faster, more consistent inference
- **Increases reliability:** 99.9% uptime SLA
- **Maintains functionality:** Same RAG pipeline, better backend
- **Follows proven patterns:** Mirrors successful Next.js implementation

The code structure (`groq_client.py`) mirrors the TypeScript version, ensuring consistency across your stack.

---

## Appendix: Quick Start Commands

```bash
# Install dependencies
pip install groq python-dotenv upstash-vector

# Verify API key
echo $GROQ_API_KEY  # Should print: gsk_...

# Test Groq connection
python -c "from groq_client import validate_groq_connection; print(validate_groq_connection())"

# Run full RAG query (after implementing digital_twin_mcp_server.py)
python digital_twin_mcp_server.py
```

---

**Reference:**
- Groq Python SDK: https://github.com/groq/groq-python
- Groq API Docs: https://console.groq.com/docs
- Next.js Groq Implementation: `digital-twin-mcp/lib/groq.ts` (this repo)

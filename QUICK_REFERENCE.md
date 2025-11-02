# 📋 Quick Reference Card

## 🚀 Common Commands

```powershell
# Test everything
python test_smoke.py

# Start the Digital Twin app
python digital_twin_mcp_server.py

# Try streaming responses
python example_streaming.py

# Test Groq integration
python groq_client.py

# Test Upstash integration
python upstash_client.py

# Check configuration
python -c "from settings import Settings; Settings.print_status()"
```

---

## 💻 Code Snippets

### Non-Streaming Response
```python
from groq_client import generate_response

answer = generate_response(
    prompt="Your question here",
    temperature=0.7,
    max_tokens=500
)
print(answer)
```

### Streaming Response
```python
from groq_client import generate_response_streaming

for chunk in generate_response_streaming("Your question"):
    print(chunk, end="", flush=True)
```

### Vector Query
```python
from upstash_client import UpstashVectorClient

client = UpstashVectorClient(read_only=True)
results = client.query_text("Python programming", top_k=5)

for r in results:
    print(f"{r['metadata']['title']}: {r['score']:.3f}")
```

### RAG Query
```python
from digital_twin_mcp_server import rag_query, setup_vector_database

vector_client = setup_vector_database()
answer = rag_query(vector_client, "Tell me about your skills")
print(answer)
```

---

## 🔧 Configuration

**Required `.env` variables:**
```bash
UPSTASH_VECTOR_REST_URL="https://..."
UPSTASH_VECTOR_REST_TOKEN="..."
UPSTASH_VECTOR_REST_READONLY_TOKEN="..."
GROQ_API_KEY="gsk_..."
```

---

## 🎯 Models Available

**Groq Models:**
- `llama-3.1-8b-instant` (default, fast)
- `llama-3.1-70b-versatile` (more capable)
- `mixtral-8x7b-32768` (long context)

**Upstash Embedding:**
- `mixedbread-ai/mxbai-embed-large-v1`
- 1024 dimensions
- 512 token sequence length
- MTEB score: 64.68

---

## 📊 Status Check

```python
from settings import Settings
from groq_client import validate_groq_connection
from upstash_client import UpstashVectorClient

# Check settings
Settings.print_status()

# Validate Groq
if validate_groq_connection():
    print("✅ Groq OK")

# Check Upstash
client = UpstashVectorClient(read_only=True)
info = client.info()
print(f"Vectors: {info['vectorCount']}")
```

---

## ⚠️ Common Issues

| Issue | Solution |
|-------|----------|
| Missing env vars | Check `.env` file exists and has all vars |
| Groq 401 | Verify `GROQ_API_KEY` is correct |
| Groq 429 | Rate limited, wait or upgrade tier |
| Upstash empty | Upload profile data first |
| Unicode error | Re-save `.env` as UTF-8 without BOM |

---

## 📖 Documentation

- `README.md` - Complete guide
- `MIGRATION_GROQ_LLM.md` - Groq migration
- `MIGRATION_UPSTASH_VECTOR.md` - Vector DB migration
- `IMPLEMENTATION_COMPLETE.md` - This implementation summary

---

## 🧪 Test Coverage

Run `python test_smoke.py` to validate:
- ✅ Environment variables
- ✅ Groq connection
- ✅ Groq generation
- ✅ Upstash connection
- ✅ Upstash query

All should pass before using the app.

---

**Keep this card handy for quick reference!**

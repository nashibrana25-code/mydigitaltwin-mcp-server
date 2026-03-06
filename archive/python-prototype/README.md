# Digital Twin Workshop

AI-powered professional profile assistant using Upstash Vector Database and Groq LLM.

## 🏗️ Architecture

- **Vector Database**: Upstash Vector with built-in embeddings (`mixedbread-ai/mxbai-embed-large-v1`)
- **LLM**: Groq Cloud API with `llama-3.1-8b-instant` model
- **RAG Pipeline**: Retrieval-Augmented Generation for personalized responses

## 📋 Prerequisites

- Python 3.8+
- Upstash Vector Database account
- Groq API account

## 🚀 Quick Start

### 1. Install Dependencies

```powershell
pip install -r requirements.txt
```

### 2. Configure Environment

Your `.env` file should contain:

```bash
# Upstash Vector Database
UPSTASH_VECTOR_REST_URL="https://..."
UPSTASH_VECTOR_REST_TOKEN="..."
UPSTASH_VECTOR_REST_READONLY_TOKEN="..."

# Groq API Configuration
GROQ_API_KEY="gsk_..."
```

### 3. Prepare Profile Data

Create or edit `digitaltwin.json` with your professional profile:

```json
{
  "content_chunks": [
    {
      "id": "exp-1",
      "title": "Work Experience",
      "type": "experience",
      "content": "Your work experience details...",
      "metadata": {
        "category": "professional",
        "tags": ["work", "career"]
      }
    }
  ]
}
```

### 4. Run Smoke Tests

```powershell
python test_smoke.py
```

Expected output:
```
🧪 Digital Twin Workshop - Smoke Tests
...
🎉 All tests passed! Your setup is complete.
```

### 5. Start the Application

```powershell
python digital_twin_mcp_server.py
```

## 📁 Project Structure

```
digital-twin-workshop/
├── .env                          # Environment variables (gitignored)
├── .gitignore                    # Git ignore rules
├── requirements.txt              # Python dependencies
├── README.md                     # This file
│
├── settings.py                   # Environment configuration
├── groq_client.py               # Groq LLM integration
├── upstash_client.py            # Upstash Vector client
│
├── digital_twin_mcp_server.py   # Main RAG application
├── digitaltwin.json             # Your profile data
├── embed_digitaltwin.py         # Ingestion script (TBD)
│
├── test_smoke.py                # Integration tests
└── data/                        # Data directory

Documentation:
├── MIGRATION_UPSTASH_VECTOR.md  # ChromaDB → Upstash migration
└── MIGRATION_GROQ_LLM.md        # Ollama → Groq migration
```

## 🧪 Testing

### Run All Tests
```powershell
python test_smoke.py
```

### Test Individual Components

**Test Groq Client:**
```powershell
python groq_client.py
```

**Test Upstash Client:**
```powershell
python upstash_client.py
```

**Test Settings:**
```powershell
python -c "from settings import Settings; Settings.print_status()"
```

## 🔧 Module Reference

### `settings.py`
Loads and validates environment variables.

```python
from settings import Settings

# Print configuration status
Settings.print_status()

# Validate (raises error if missing)
Settings.validate_or_raise()

# Check specific variables
print(Settings.GROQ_API_KEY)
```

### `groq_client.py`
Groq LLM integration with retry logic and error handling.

```python
from groq_client import generate_response, generate_response_streaming

# Non-streaming response
answer = generate_response(
    prompt="What is Python?",
    system_prompt="You are a helpful assistant.",
    temperature=0.7,
    max_tokens=500
)

# Streaming response
for chunk in generate_response_streaming("Explain AI"):
    print(chunk, end="", flush=True)
```

### `upstash_client.py`
Upstash Vector Database wrapper with automatic embedding.

```python
from upstash_client import UpstashVectorClient

# Read-only client (for queries)
ro_client = UpstashVectorClient(read_only=True)
results = ro_client.query_text("Python programming", top_k=5)

# Read-write client (for ingestion)
rw_client = UpstashVectorClient(read_only=False)
items = [
    ("doc1", "Python is great", {"category": "programming"}),
    ("doc2", "AI is powerful", {"category": "ai"})
]
rw_client.upsert_texts(items)
```

## 🎯 Usage Examples

### Interactive Chat
```powershell
python digital_twin_mcp_server.py
```

Then ask questions:
```
You: Tell me about your work experience
🤖 Digital Twin: I have worked as a...

You: What are your technical skills?
🤖 Digital Twin: I'm proficient in...
```

### Programmatic Usage
```python
from digital_twin_mcp_server import rag_query, setup_vector_database
from upstash_client import UpstashVectorClient

# Setup
vector_client = setup_vector_database()

# Query
answer = rag_query(vector_client, "What projects have you worked on?")
print(answer)
```

## 🐛 Troubleshooting

### "Missing environment variables"
- Ensure `.env` file exists in the project root
- Verify all required variables are set (see `.env` section above)

### "Groq API connection failed"
- Check your `GROQ_API_KEY` is valid
- Ensure you have internet connectivity
- Verify Groq API status at https://console.groq.com

### "Upstash connection failed"
- Verify your Upstash credentials are correct
- Check the Upstash dashboard for any issues
- Ensure the database exists and is active

### "No content chunks found"
- Make sure `digitaltwin.json` exists and has valid `content_chunks`
- Check JSON syntax with a validator

## 📊 Performance

- **Groq Latency**: Typically <1s for responses
- **Vector Search**: ~100-300ms for 3-5 results
- **Total RAG Query**: ~1-2s end-to-end

## 💰 Cost Considerations

### Upstash Vector
- Serverless, pay-per-use pricing
- Free tier available for development

### Groq
- Extremely competitive pricing (often sub-cent per 1K tokens)
- Generous free tier for development
- Monitor usage at https://console.groq.com

## 🔐 Security

- **Never commit `.env`** — It's in `.gitignore`
- Use **read-only tokens** for query operations
- Use **read-write tokens** only for ingestion scripts
- Rotate API keys regularly
- Don't log secrets

## 📚 Additional Documentation

- [Upstash Vector Migration Guide](./MIGRATION_UPSTASH_VECTOR.md)
- [Groq LLM Migration Guide](./MIGRATION_GROQ_LLM.md)
- [Upstash Vector Docs](https://upstash.com/docs/vector)
- [Groq API Docs](https://console.groq.com/docs)

## 🤝 Contributing

This is a workshop project. Feel free to:
- Experiment with different models
- Add new features
- Improve error handling
- Optimize performance

## 📝 License

MIT License - See LICENSE file for details

---

**Built with ❤️ using Upstash Vector and Groq**

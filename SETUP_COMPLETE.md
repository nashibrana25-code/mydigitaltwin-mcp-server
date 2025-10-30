# Digital Twin MCP Server - Setup Complete! ✅

## What We Built

A complete MCP (Model Context Protocol) server that implements RAG (Retrieval-Augmented Generation) for your digital twin, following the specifications from `agents.md`.

## 📦 Project Structure

```
digital-twin-mcp/
├── app/
│   ├── actions/
│   │   └── rag.ts              # Server actions for RAG queries
│   └── page.tsx                # Test UI for Digital Twin
├── lib/
│   ├── vector.ts               # Upstash Vector database utilities
│   ├── groq.ts                 # Groq AI client utilities
│   └── utils.ts                # ShadCN utilities
├── server/
│   └── index.ts                # MCP Server implementation
├── .env.local                  # Environment variables
└── package.json                # Dependencies and scripts
```

## 🛠️ Technologies Used

- ✅ **Next.js 16.0** - Latest version with App Router
- ✅ **TypeScript** - Full type safety
- ✅ **Upstash Vector** - Vector database with built-in embeddings
- ✅ **Groq SDK** - Ultra-fast LLM inference (LLaMA 3.1)
- ✅ **MCP SDK** - Model Context Protocol implementation
- ✅ **ShadCN UI** - Dark mode UI components
- ✅ **Tailwind CSS 4** - Modern styling
- ✅ **pnpm** - Fast package manager

## 🎯 MCP Tools Implemented

### 1. `query_digital_twin`
Ask questions about Nashib's professional profile with AI-generated responses.

**Example:**
```
Question: "Tell me about your cybersecurity experience"
→ Searches vector DB for relevant content
→ Generates first-person response using Groq
```

### 2. `search_profile`  
Search specific sections of the profile without AI generation.

**Example:**
```
Query: "Hogwarts library project"
→ Returns raw search results with relevance scores
```

### 3. `get_database_info`
Get statistics about the vector database.

**Returns:**
- Vector count
- Dimension
- Similarity function

## 🚀 How to Use

### 1. Test the Web UI (Currently Running!)

The development server is already running at:
- **Local**: http://localhost:3000
- **Network**: http://192.168.56.1:3000

Open it in your browser to test the RAG functionality!

### 2. Run the MCP Server

```powershell
cd "c:\Users\nashi\Week 5\digital-twin-mcp"
pnpm mcp
```

This starts the MCP server on stdio for integration with MCP clients like Claude Desktop.

### 3. Configure in Claude Desktop

Add to `~/AppData/Roaming/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "digital-twin": {
      "command": "pnpm",
      "args": ["mcp"],
      "cwd": "C:\\Users\\nashi\\Week 5\\digital-twin-mcp",
      "env": {
        "UPSTASH_VECTOR_REST_URL": "https://noble-zebra-94577-us1-vector.upstash.io",
        "UPSTASH_VECTOR_REST_TOKEN": "your_token_here",
        "GROQ_API_KEY": "your_groq_key_here"
      }
    }
  }
}
```

## 📝 Environment Variables

Already configured in `.env.local`:

```env
UPSTASH_VECTOR_REST_URL=https://noble-zebra-94577-us1-vector.upstash.io
UPSTASH_VECTOR_REST_TOKEN=ABUFMG...
UPSTASH_VECTOR_REST_READONLY_TOKEN=ABUIMG...
GROQ_API_KEY=gsk_Jg...
```

## 🔄 RAG Pipeline Flow

```
User Question
    ↓
Vector Search (Upstash)
    ↓
Find Top-K Relevant Chunks
    ↓
Build Context
    ↓
Generate Response (Groq/LLaMA 3.1)
    ↓
Return First-Person Answer
```

## ✨ Key Features

1. **Server Actions** - All RAG logic uses Next.js server actions
2. **Type Safety** - Full TypeScript throughout
3. **Dark Mode** - ShadCN UI with dark theme
4. **Built-in Embeddings** - Upstash handles embeddings automatically
5. **Fast Inference** - Groq provides sub-second responses
6. **MCP Protocol** - Standard Model Context Protocol implementation

## 📚 Example Questions to Try

- "Tell me about your work experience"
- "What are your technical skills?"
- "Describe your Hogwarts Library project"
- "What cybersecurity tools have you used?"
- "What are your career goals?"
- "Tell me about your education"

## 🎓 Next Steps

### Before the MCP server works, you need to:

1. **Upload Your Profile Data** to Upstash Vector
   - Use the Python script from `digital-twin-workshop/embed_digitaltwin.py`
   - Or create content_chunks in `digitaltwin.json`

2. **Test the Web UI**
   - Currently running at http://localhost:3000
   - Click "Load Database Stats" to check vector count
   - Try asking questions once data is uploaded

3. **Configure Claude Desktop**
   - Add MCP server configuration
   - Restart Claude Desktop
   - Use the tools via Claude

## 🐛 Troubleshooting

### If the vector database is empty (0 vectors):
You'll see: "No content chunks found in profile data"

**Solution**: Upload your profile data first using the embed script.

### To check database status:
1. Open http://localhost:3000
2. Click "Load Database Stats"
3. Check the vector count

## 📦 Installed Packages

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.20.2",
    "@upstash/vector": "^1.2.2",
    "groq-sdk": "^0.34.0",
    "groq": "^4.11.0",
    "next": "16.0.0",
    "react": "19.2.0",
    "zod": "^4.1.12"
  },
  "devDependencies": {
    "tsx": "^4.20.6",
    "ts-node": "^10.9.2",
    "typescript": "^5.9.3"
  }
}
```

## ✅ Checklist

- [x] Next.js 16 project created
- [x] TypeScript configured
- [x] ShadCN UI initialized with dark mode
- [x] Upstash Vector integration
- [x] Groq SDK integration
- [x] MCP SDK integration
- [x] Server actions for RAG
- [x] MCP server implementation
- [x] Test UI created
- [x] Environment variables configured
- [x] README documentation
- [x] Development server running

## 🎉 Success!

Your Digital Twin MCP Server is ready! The web UI is currently running at http://localhost:3000 for testing.

Once you upload your profile data to Upstash Vector, you'll be able to:
- Test queries via the web UI
- Use the MCP tools in Claude Desktop
- Get AI-powered answers about your professional background

---

**Created**: October 28, 2025
**Pattern**: Based on rolldice-mcpserver
**Logic**: Based on Binal's digital twin implementation

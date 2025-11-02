# Digital Twin MCP Server - Complete Deployment Guide

## ✅ Project Setup Complete!

Your MCP server has been successfully built and is ready for use.

## 📁 What Was Created

### Core MCP Server Files
- ✅ `server/index.ts` - MCP server implementation with 2 tools
- ✅ `lib/vector.ts` - Upstash Vector integration
- ✅ `lib/groq.ts` - Groq LLM integration  
- ✅ `lib/utils.ts` - Utility functions

### Next.js UI (Documentation/Config)
- ✅ `app/layout.tsx` - App layout with dark mode
- ✅ `app/page.tsx` - Server documentation page
- ✅ `app/globals.css` - Tailwind CSS styles

### Configuration Files
- ✅ `package.json` - Dependencies and scripts
- ✅ `tsconfig.json` - TypeScript configuration
- ✅ `next.config.ts` - Next.js configuration
- ✅ `tailwind.config.ts` - Tailwind CSS configuration
- ✅ `.env.local` - Environment variables (already configured!)
- ✅ `.gitignore` - Git ignore rules

## 🚀 Quick Start

### 1. View Documentation UI

```powershell
cd digital-twin-mcp
pnpm dev
```

Then open: http://localhost:3000

### 2. Test MCP Server

The MCP server is built at `dist/server/index.js`. Test it:

```powershell
node dist/server/index.js
```

You should see: `Digital Twin MCP Server running on stdio`

## 🔌 Connect to Claude Desktop

### Step 1: Locate Claude Desktop Config

The config file is at:
```
C:\Users\YOUR_USERNAME\AppData\Roaming\Claude\claude_desktop_config.json
```

### Step 2: Add Your MCP Server

Edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "digital-twin": {
      "command": "node",
      "args": [
        "C:\\Users\\nashi\\Week 5\\digital-twin-mcp\\dist\\server\\index.js"
      ],
      "env": {
        "UPSTASH_VECTOR_REST_URL": "https://your-endpoint.upstash.io",
        "UPSTASH_VECTOR_REST_TOKEN": "your-upstash-token",
        "GROQ_API_KEY": "gsk_your-groq-api-key"
      }
    }
  }
}
```

### Step 3: Restart Claude Desktop

Close and reopen Claude Desktop completely.

### Step 4: Verify Connection

In Claude Desktop, you should see the MCP server tools available:
- 🔧 `query_digital_twin`
- 🔧 `search_profile`

## 💬 Using the MCP Tools

### Example 1: Query Digital Twin

In Claude Desktop chat:
```
Use the digital twin MCP server to tell me about your work experience.
```

Claude will call `query_digital_twin` and return a personalized first-person response.

### Example 2: Search Profile

```
Search the digital twin profile for information about Python skills.
```

Claude will call `search_profile` and return raw matching content.

## 🛠️ Available Tools

### 1. query_digital_twin

**Purpose:** Get AI-generated responses about the professional profile

**Parameters:**
- `question` (string, required): Your question
- `top_k` (number, optional): Context chunks to retrieve (default: 3)

**Example:**
```json
{
  "question": "What are your technical skills?",
  "top_k": 3
}
```

**Returns:** First-person AI-generated answer

---

### 2. search_profile

**Purpose:** Search for specific information without AI generation

**Parameters:**
- `query` (string, required): Search terms
- `top_k` (number, optional): Number of results (default: 5)

**Example:**
```json
{
  "query": "Python programming",
  "top_k": 5
}
```

**Returns:** Raw context chunks with relevance scores

## 📊 How It Works

```
┌─────────────────┐
│ Claude Desktop  │
└────────┬────────┘
         │
         │ MCP Protocol (stdio)
         ▼
┌─────────────────────┐
│  MCP Server         │
│  (TypeScript/Node)  │
└────────┬────────────┘
         │
         ├───────────────────┐
         │                   │
         ▼                   ▼
┌────────────────┐   ┌──────────────┐
│ Upstash Vector │   │  Groq API    │
│ (RAG Search)   │   │  (LLM Gen)   │
└────────────────┘   └──────────────┘
```

**Flow:**
1. Claude Desktop sends question via MCP
2. MCP server queries Upstash Vector for relevant chunks
3. Context sent to Groq for AI generation
4. Response returned to Claude Desktop

## 🔧 Development Commands

```powershell
# Install dependencies
pnpm install

# Run Next.js dev server (documentation UI)
pnpm dev

# Build everything (Next.js + MCP server)
pnpm build

# Type check
pnpm type-check

# Lint
pnpm lint

# Start MCP server only
pnpm start:server

# Start Next.js production server
pnpm start
```

## 📝 Environment Variables

Your `.env.local` is already configured with:

```env
UPSTASH_VECTOR_REST_URL=https://noble-zebra-94577-us1-vector.upstash.io
UPSTASH_VECTOR_REST_TOKEN=ABUFMG5v...
GROQ_API_KEY=gsk_Jg8t...
```

**Security:** Never commit `.env.local` to git! It's in `.gitignore`.

## 🐛 Troubleshooting

### MCP Server Not Showing in Claude Desktop

1. Check `claude_desktop_config.json` syntax (valid JSON)
2. Verify file paths use double backslashes: `C:\\Users\\...`
3. Ensure Claude Desktop is completely restarted
4. Check Claude Desktop logs: `%APPDATA%\Claude\logs`

### "Failed to query vector database"

1. Verify Upstash credentials in `.env.local`
2. Check Upstash dashboard - is database active?
3. Ensure profile data has been uploaded to vector DB

### "Failed to generate response from Groq"

1. Verify `GROQ_API_KEY` is valid
2. Check Groq API status: https://console.groq.com
3. Ensure you have API credits remaining

### TypeScript Errors

```powershell
# Rebuild everything
pnpm build

# Check types without building
pnpm type-check
```

## 📚 Next Steps

### 1. Upload Your Profile to Vector Database

You need to run the Python script to populate the vector database:

```powershell
cd "C:\Users\nashi\Week 5"
python embed_digitaltwin.py
```

This uploads `digitaltwin.json` to Upstash Vector.

### 2. Test in Claude Desktop

Ask Claude questions like:
- "What is my work experience?"
- "Tell me about my technical skills"
- "What projects have I worked on?"

### 3. Customize the Profile

Edit `C:\Users\nashi\Week 5\digitaltwin.json` with your information, then re-run:

```powershell
python embed_digitaltwin.py
```

## 🌐 Deploy to Production (Optional)

### Option 1: Railway (Recommended for MCP Server)

1. Go to https://railway.app
2. New Project > GitHub Repo
3. Add environment variables
4. Deploy automatically

### Option 2: Vercel (UI Only)

```powershell
# Install Vercel CLI
npm i -g vercel

# Deploy
cd digital-twin-mcp
vercel
```

Note: MCP server runs locally, only UI can be deployed to Vercel.

## 📖 Architecture Overview

### Technology Stack

- **MCP Protocol**: Model Context Protocol SDK
- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Next.js 15 (for UI)
- **Vector DB**: Upstash Vector (automatic embeddings)
- **LLM**: Groq (llama-3.1-8b-instant)
- **Styling**: Tailwind CSS (dark mode)

### Project Structure

```
digital-twin-mcp/
├── server/
│   └── index.ts          # MCP server implementation
├── lib/
│   ├── vector.ts         # Upstash client
│   ├── groq.ts           # Groq client
│   └── utils.ts          # Utilities
├── app/
│   ├── layout.tsx        # App layout
│   ├── page.tsx          # Documentation page
│   └── globals.css       # Styles
├── dist/                 # Compiled output
│   └── server/
│       └── index.js      # Built MCP server
├── .env.local            # Environment variables
├── package.json          # Dependencies
└── tsconfig.json         # TypeScript config
```

## ✅ Success Checklist

- [x] Dependencies installed (`pnpm install`)
- [x] Project built successfully (`pnpm build`)
- [x] Environment variables configured (`.env.local`)
- [x] MCP server compiled (`dist/server/index.js`)
- [ ] Profile uploaded to Upstash Vector (`python embed_digitaltwin.py`)
- [ ] Claude Desktop config updated
- [ ] Claude Desktop restarted
- [ ] MCP tools visible in Claude
- [ ] Tested queries working

## 🎉 You're Ready!

Your Digital Twin MCP Server is fully set up and ready to use with Claude Desktop!

**Questions?** Check the main README.md or review the Next.js documentation UI at http://localhost:3000

---

**Built with:**
- Model Context Protocol
- Upstash Vector
- Groq LLM
- Next.js 15
- TypeScript

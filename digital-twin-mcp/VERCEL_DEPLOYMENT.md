# Digital Twin MCP Server - Vercel Deployment Guide

## ✅ Deployment Readiness Checklist

### Current Status

**Ready for Vercel Deployment:**
- ✅ Next.js 15 app configured
- ✅ TypeScript properly set up
- ✅ Tailwind CSS configured
- ✅ Environment variables defined
- ✅ Build script working
- ✅ Production build tested
- ✅ All dependencies installed

**What Will Be Deployed:**
- ✅ Next.js UI (documentation page)
- ✅ Static assets and styles
- ❌ MCP Server (runs locally only - cannot be deployed to Vercel)

---

## 🚀 Deploy to Vercel

### Option 1: Vercel CLI (Recommended)

```powershell
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from the MCP directory
cd digital-twin-mcp
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? (your account)
# - Link to existing project? N
# - Project name? digital-twin-mcp
# - Directory? ./
# - Override settings? N
```

### Option 2: GitHub Integration

1. **Push to GitHub:**
```powershell
cd "C:\Users\nashi\Week 5"
git add .
git commit -m "Add Digital Twin MCP Server"
git push origin main
```

2. **Connect to Vercel:**
   - Go to https://vercel.com
   - Click "Add New Project"
   - Import your GitHub repository
   - Select `digital-twin-mcp` as root directory
   - Click "Deploy"

---

## ⚙️ Environment Variables Setup

After deployment, add these environment variables in Vercel Dashboard:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add the following:

```
UPSTASH_VECTOR_REST_URL = https://your-endpoint.upstash.io
UPSTASH_VECTOR_REST_TOKEN = your-upstash-token-here
GROQ_API_KEY = gsk_your-groq-api-key-here
```

**Important:** Set these for "Production", "Preview", and "Development" environments.

---

## 📦 What Gets Deployed

### ✅ Deployed to Vercel:
- **Next.js UI** - Documentation and configuration page
- **Static Assets** - CSS, images, fonts
- **API Routes** - If you create Next.js API routes (optional)

### ❌ NOT Deployed (Runs Locally):
- **MCP Server** (`server/index.ts`)
  - MCP protocol requires stdio transport
  - Must run on your local machine
  - Connects to Claude Desktop locally

---

## 🏗️ Architecture After Deployment

```
┌─────────────────────────────────────────┐
│         VERCEL (Cloud)                  │
│  ┌───────────────────────────────────┐  │
│  │  Next.js UI (Documentation)       │  │
│  │  https://your-app.vercel.app      │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      YOUR LOCAL MACHINE                 │
│  ┌───────────────────────────────────┐  │
│  │  MCP Server (stdio)               │  │
│  │  node start-server.js             │  │
│  └────────────┬──────────────────────┘  │
│               │                          │
│               ▼                          │
│  ┌───────────────────────────────────┐  │
│  │  Claude Desktop                   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         CLOUD SERVICES                  │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │ Upstash      │  │ Groq API        │  │
│  │ Vector DB    │  │ (LLM)           │  │
│  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────┘
```

**Key Points:**
- UI deployed to Vercel (accessible worldwide)
- MCP Server runs locally (Claude Desktop integration)
- Both use same cloud services (Upstash + Groq)

---

## 🧪 Test Before Deployment

```powershell
# 1. Clean build test
cd digital-twin-mcp
Remove-Item -Recurse -Force .next, dist -ErrorAction SilentlyContinue
pnpm build

# 2. Production preview
pnpm start

# 3. Open browser
# Visit: http://localhost:3000
```

Expected: Documentation page loads correctly with dark theme.

---

## 🚀 Deploy Now

### Quick Deploy Steps:

```powershell
# 1. Install Vercel CLI
npm i -g vercel

# 2. Navigate to project
cd "C:\Users\nashi\Week 5\digital-twin-mcp"

# 3. Deploy
vercel

# 4. Add environment variables in Vercel Dashboard

# 5. Your app is live!
```

---

## 📊 Post-Deployment

### Your Deployed App Will Have:

**URL:** `https://digital-twin-mcp.vercel.app` (or custom domain)

**Features:**
- 📖 Documentation page
- 🎨 Dark mode UI
- 📝 MCP server setup instructions
- ⚙️ Configuration examples

**What Users Can Do:**
- Learn about your Digital Twin MCP Server
- See available tools
- Get configuration instructions
- Copy Claude Desktop config

---

## ⚠️ Important Notes

### MCP Server Limitations

**Cannot Deploy MCP Server to Vercel Because:**
1. MCP protocol requires stdio (standard input/output)
2. Vercel runs serverless functions (HTTP only)
3. Claude Desktop needs local connection

**Solution:**
- ✅ Deploy UI/documentation to Vercel
- ✅ Run MCP server locally
- ✅ Best of both worlds!

### Alternative for MCP Server Hosting

If you want to host the MCP server remotely:
- Use **Railway**, **Render**, or **Fly.io**
- These support long-running Node.js processes
- But Claude Desktop still needs local access

**Recommendation:** Keep MCP server local, deploy UI to Vercel

---

## 🔧 Troubleshooting

### Build Fails on Vercel

**Error:** TypeScript errors
```powershell
# Fix locally first
pnpm type-check
pnpm build
```

**Error:** Missing dependencies
```powershell
# Ensure pnpm-lock.yaml is committed
git add pnpm-lock.yaml
git commit -m "Add lockfile"
git push
```

### Environment Variables Not Working

1. Check Vercel Dashboard > Settings > Environment Variables
2. Ensure variables are set for all environments
3. Redeploy after adding variables

### Page Not Loading

1. Check build logs in Vercel Dashboard
2. Verify `.env.local` variables match Vercel env vars
3. Check browser console for errors

---

## ✅ Deployment Checklist

- [ ] Build succeeds locally (`pnpm build`)
- [ ] Environment variables ready
- [ ] Vercel account created
- [ ] Project connected to Vercel
- [ ] Environment variables added in Vercel
- [ ] Deployment successful
- [ ] UI loads at Vercel URL
- [ ] MCP server still runs locally
- [ ] Claude Desktop still works

---

## 🎯 Summary

**What You're Deploying:**
- Next.js documentation UI → Vercel ✅

**What Stays Local:**
- MCP Server → Your machine ✅
- Claude Desktop connection → Local ✅

**Why This Works:**
- UI accessible worldwide
- MCP server works with Claude Desktop
- Both use same cloud services (Upstash/Groq)

---

## 🚀 Ready to Deploy!

Your project is **100% ready** for Vercel deployment.

**Next Command:**
```powershell
cd digital-twin-mcp
vercel
```

Then add environment variables in Vercel Dashboard and you're live! 🎉

---

**Questions?**
- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- Your README: `./README.md`

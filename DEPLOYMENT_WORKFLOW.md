# Deployment Workflow - Automatic CI/CD with Vercel

## 🚀 How Automatic Deployment Works

Your Digital Twin MCP Server uses **Vercel's Git Integration** for continuous deployment. Every time you push code to GitHub, Vercel automatically builds and deploys your application.

### **The Process:**

```
Local Changes → Git Push → GitHub → Vercel Build → Live Deployment
     ↓              ↓          ↓           ↓              ↓
  Edit code    Commit    Trigger     Run tests    Zero-downtime
  Test local   & Push    webhook    Build Next.js   update
```

---

## ✅ Automatic Deployment Benefits

### **1. Zero Configuration Needed**
- ✅ Already connected via GitHub integration
- ✅ Automatically detects Next.js framework
- ✅ No manual deployment steps required

### **2. Continuous Integration**
- 🔄 Every push to `main` branch triggers deployment
- 🔍 Build errors caught before going live
- 📊 Deployment logs available in real-time

### **3. Zero-Downtime Deployment**
- ⚡ New version deployed alongside old version
- 🔀 Traffic switched only after successful build
- ↩️ Automatic rollback if deployment fails

### **4. Preview Deployments**
- 👁️ Every pull request gets its own preview URL
- 🧪 Test changes before merging to production
- 🔗 Share preview links with team/reviewers

---

## 📝 Making Updates - Complete Workflow

### **Step 1: Make Local Changes**

Edit your code (e.g., update profile data):

```powershell
# Navigate to project
cd "C:\Users\nashi\Week 5\digital-twin-mcp"

# Edit files (example: update digitaltwin.json)
code .

# Or update MCP server code
# Example: app/api/mcp/route.ts
```

### **Step 2: Test Locally**

**Always test before pushing to production:**

```powershell
# Start development server
pnpm dev

# Server runs at http://localhost:3000
# Test the MCP endpoint

# Test health check
Invoke-RestMethod -Uri 'http://localhost:3000/api/mcp' -Method GET

# Test MCP tools
$body = '{"jsonrpc":"2.0","method":"tools/list","id":1}'
Invoke-RestMethod -Uri 'http://localhost:3000/api/mcp' `
  -Method POST `
  -ContentType 'application/json' `
  -Body $body
```

### **Step 3: Update Profile Data (If Needed)**

If you updated `digitaltwin.json`:

```powershell
# Re-embed the updated profile
cd "C:\Users\nashi\Week 5\digital-twin-workshop"
pnpm tsx scripts/upload-profile.ts

# Verify vectors uploaded
# Output should show: "✓ Database now contains X vectors"
```

### **Step 4: Commit Changes**

```powershell
# Navigate to project
cd "C:\Users\nashi\Week 5\digital-twin-mcp"

# Check what changed
git status

# Add all changes
git add .

# Or add specific files
git add app/api/mcp/route.ts
git add lib/vector.ts

# Commit with descriptive message
git commit -m "Updated digital twin profile with new projects"

# Or more specific messages
git commit -m "Fixed: Improved RAG query relevance scoring"
git commit -m "Added: New interview preparation questions"
git commit -m "Updated: Environment variable handling"
```

### **Step 5: Push to GitHub**

```powershell
# Push to main branch (triggers production deployment)
git push origin main

# You'll see output like:
# Enumerating objects: X, done.
# Writing objects: 100% (X/X), Y KiB | Z MiB/s, done.
# To https://github.com/nashibrana25-code/mydigitaltwin-mcp-server.git
#    abc1234..def5678  main -> main
```

### **Step 6: Vercel Automatically Deploys**

**What Vercel Does (Automatically):**

1. **Detects Push** (within seconds)
   - GitHub webhook notifies Vercel
   - New deployment queued

2. **Builds Project** (~1-2 minutes)
   ```
   Installing dependencies (pnpm install)
   Compiling TypeScript
   Running Next.js build
   Optimizing production bundle
   ```

3. **Runs Checks**
   - TypeScript compilation
   - Linting (if configured)
   - Build output validation

4. **Deploys to Production** (~30 seconds)
   - Uploads optimized build
   - Updates serverless functions
   - Routes traffic to new version

5. **Total Time:** ~2-3 minutes from push to live

---

## 📊 Monitoring Deployments

### **Method 1: Vercel Dashboard**

1. Go to: https://vercel.com/nashibrana25-code/mydigitaltwin-mcp-server
2. See deployment status:
   - 🟡 **Building** - In progress
   - ✅ **Ready** - Successfully deployed
   - ❌ **Error** - Build failed

### **Method 2: Deployment Logs**

**View Build Logs:**
1. Click on deployment in Vercel dashboard
2. Click "Building" or "View Function Logs"
3. See real-time output:
   ```
   [12:34:56] > pnpm build
   [12:34:57] Compiling TypeScript...
   [12:35:02] ✓ Compiled successfully
   [12:35:05] Creating optimized production build...
   [12:35:10] ✓ Build completed
   ```

**View Runtime Logs:**
1. Click "Functions" tab
2. Click `/api/mcp`
3. See production logs:
   ```
   POST /api/mcp 200 in 1.2s
   🔍 Querying digital twin: "What are my skills?"
   ✓ Vector search completed in 823ms
   ```

### **Method 3: Deployment Notifications**

**Enable GitHub Notifications:**
- Vercel comments on commits with deployment status
- Shows preview URL for testing
- Links directly to deployment logs

**Email Notifications:**
- Go to Vercel → Account Settings → Notifications
- Enable email alerts for:
  - Deployment success
  - Deployment failure
  - Build warnings

---

## 🎯 Best Practices

### **1. Test Locally First**

**Always run before pushing:**
```powershell
# Build locally to catch errors
pnpm build

# Should see:
# ✓ Compiled successfully
# ✓ Finished TypeScript
# ✓ Generating static pages
```

**If build fails locally, fix before pushing!**

### **2. Use Descriptive Commit Messages**

**Good Commit Messages:**
```bash
✅ "Added salary negotiation examples to interview prep"
✅ "Fixed: TypeScript error in RAG query handler"
✅ "Updated profile with new Python certification"
✅ "Improved: Vector search relevance with better embeddings"
```

**Bad Commit Messages:**
```bash
❌ "update"
❌ "fix stuff"
❌ "changes"
❌ "asdf"
```

### **3. Keep Environment Variables Synced**

**Local (`.env.local`):**
```env
UPSTASH_VECTOR_REST_URL="https://..."
UPSTASH_VECTOR_REST_TOKEN="..."
UPSTASH_VECTOR_REST_READONLY_TOKEN="..."
GROQ_API_KEY="gsk_..."
```

**Production (Vercel Dashboard):**
- Ensure all 4 variables are set
- Applied to: Production, Preview, Development
- Update both if API keys change

### **4. Monitor Deployment Success**

**After every push, verify:**
```powershell
# Wait 2-3 minutes for deployment

# Test production endpoint
Invoke-RestMethod -Uri 'https://mydigitaltwin-mcp-server.vercel.app/api/mcp' -Method GET

# Should return:
# status: healthy
# upstash: connected
# groq: connected
```

### **5. Use Git Branches for Major Changes**

**For experimental features:**
```powershell
# Create feature branch
git checkout -b feature/new-mcp-tool

# Make changes and test

# Push to GitHub
git push origin feature/new-mcp-tool

# Creates preview deployment at:
# https://mydigitaltwin-mcp-server-git-feature-new-mcp-tool-<hash>.vercel.app

# After testing, merge to main
git checkout main
git merge feature/new-mcp-tool
git push origin main
```

---

## 🔄 Common Update Scenarios

### **Scenario 1: Update Profile Data**

```powershell
# 1. Edit digitaltwin.json
code "C:\Users\nashi\Week 5\digital-twin-workshop\digitaltwin.json"

# 2. Re-embed vectors
cd "C:\Users\nashi\Week 5\digital-twin-workshop"
pnpm tsx scripts/upload-profile.ts

# 3. No code changes needed - vectors updated in Upstash
# 4. Test with new queries to verify
```

**Note:** Profile updates don't require redeployment since data is in Upstash Vector database!

### **Scenario 2: Update MCP Server Code**

```powershell
# 1. Edit server code
cd "C:\Users\nashi\Week 5\digital-twin-mcp"
code app/api/mcp/route.ts

# 2. Test locally
pnpm dev

# 3. Build to verify
pnpm build

# 4. Commit and push
git add .
git commit -m "Enhanced: Improved MCP tool response formatting"
git push origin main

# 5. Vercel automatically deploys (2-3 min)
```

### **Scenario 3: Add New Environment Variable**

```powershell
# 1. Add to .env.local
echo 'NEW_API_KEY="..."' >> .env.local

# 2. Add to Vercel dashboard
# Go to: Settings → Environment Variables → Add

# 3. Update code to use new variable

# 4. Redeploy (Vercel → Deployments → Redeploy)
```

### **Scenario 4: Rollback to Previous Version**

**If new deployment has issues:**

1. Go to: https://vercel.com/nashibrana25-code/mydigitaltwin-mcp-server/deployments
2. Find previous working deployment
3. Click ⋯ (three dots) → "Promote to Production"
4. Instant rollback (no downtime)

---

## 📈 Deployment History & Analytics

### **View Deployment History:**
```
Vercel Dashboard → Deployments

Shows:
- Commit message
- Deploy time
- Build duration
- Git branch
- Deployment status
- Live URL
```

### **Analytics & Monitoring:**
```
Vercel Dashboard → Analytics

Shows:
- Request count
- Response times
- Error rates
- Geographic distribution
- Bandwidth usage
```

---

## 🚨 Troubleshooting Deployments

### **Build Fails - TypeScript Error**

**Error in logs:**
```
Error: Type 'X' is not assignable to type 'Y'
```

**Fix:**
```powershell
# Test build locally first
pnpm build

# Fix TypeScript errors
# Push again
git add .
git commit -m "Fixed: TypeScript compilation errors"
git push origin main
```

### **Build Fails - Missing Dependencies**

**Error in logs:**
```
Error: Cannot find module '@upstash/vector'
```

**Fix:**
```powershell
# Ensure pnpm-lock.yaml is committed
git add pnpm-lock.yaml
git commit -m "Added missing lock file"
git push origin main
```

### **Runtime Error - Environment Variables**

**Error in logs:**
```
UPSTASH_VECTOR_REST_URL is undefined
```

**Fix:**
1. Vercel Dashboard → Settings → Environment Variables
2. Verify all 4 variables are set
3. Redeploy (Deployments → Redeploy)

### **Deployment Stuck - Build Timeout**

**If build takes >15 minutes:**
1. Check Vercel build logs for hanging process
2. Optimize build if needed (remove large dependencies)
3. Contact Vercel support if persistent

---

## ✅ Deployment Checklist

Before every push:

- [ ] Tested changes locally (`pnpm dev`)
- [ ] Build completes successfully (`pnpm build`)
- [ ] Descriptive commit message written
- [ ] Environment variables synced (if changed)
- [ ] No sensitive data in code
- [ ] TypeScript compilation passes
- [ ] MCP endpoints tested locally

After deployment:

- [ ] Deployment shows "Ready" in Vercel (2-3 min)
- [ ] Production health check passes
- [ ] MCP tools respond correctly
- [ ] No errors in Vercel function logs
- [ ] Response times acceptable (<5s)

---

## 🎓 Quick Reference Commands

### **Development Workflow:**
```powershell
# Start local server
pnpm dev

# Build for production
pnpm build

# Check git status
git status

# Commit changes
git add .
git commit -m "Your message"

# Push to GitHub (triggers deployment)
git push origin main
```

### **Testing Production:**
```powershell
# Health check
Invoke-RestMethod -Uri 'https://mydigitaltwin-mcp-server.vercel.app/api/mcp' -Method GET

# List MCP tools
$body = '{"jsonrpc":"2.0","method":"tools/list","id":1}'
Invoke-RestMethod -Uri 'https://mydigitaltwin-mcp-server.vercel.app/api/mcp' -Method POST -ContentType 'application/json' -Body $body
```

---

## 🔗 Important Links

- **Production URL:** https://mydigitaltwin-mcp-server.vercel.app
- **Vercel Dashboard:** https://vercel.com/nashibrana25-code/mydigitaltwin-mcp-server
- **GitHub Repository:** https://github.com/nashibrana25-code/mydigitaltwin-mcp-server
- **Deployment Logs:** https://vercel.com/nashibrana25-code/mydigitaltwin-mcp-server/deployments

---

**Your automatic deployment pipeline is ready! Every push to GitHub updates your live MCP server automatically.** 🚀

# 🚀 Quick Setup Guide - Complete Your Digital Twin Interview System

**Time Required:** ~10 minutes  
**Difficulty:** Easy  
**Status:** 3 steps to go live! 🎯

---

## ✅ What's Already Done

- ✅ MCP server code implemented
- ✅ Upstash Vector database configured
- ✅ Groq LLM integrated
- ✅ Profile data (`digitaltwin.json`) complete
- ✅ Job posting ready (`job-postings/job1.md`)
- ✅ **VS Code MCP configuration created** (`c:\Users\nashi\Week 5\.vscode\mcp.json`)

---

## 🎯 3 Steps to Complete Setup

### Step 1: Upload Your Profile to Vector Database (2 min)

Your profile exists but needs to be embedded into Upstash Vector for the MCP server to search it.

**Commands:**
```powershell
cd "C:\Users\nashi\Week 5"
& .venv\Scripts\Activate.ps1
python embed_digitaltwin.py
```

**Expected Output:**
```
🚀 Digital Twin Profile Ingestion
   ChromaDB → Upstash Vector Migration
========================================
📋 Validating configuration...
✓ Loaded profile data successfully
🔄 Converting profile to vector chunks...
✓ Created 25+ chunks from profile
📤 Uploading to Upstash Vector Database...
✅ Successfully uploaded 25+ chunks to Upstash!
📊 Final vector count: 25+
```

**What this does:**
- Reads your `digitaltwin.json` file
- Splits it into searchable chunks
- Uploads to Upstash Vector with auto-embedding
- Now MCP server can find relevant info when asked questions

---

### Step 2: Test MCP Server Startup (2 min)

Verify the MCP server can start and connect to services.

**Command:**
```powershell
cd "C:\Users\nashi\Week 5\digital-twin-mcp"
node start-server.js
```

**Expected Behavior:**
- Server should start (no crash)
- May see logs about initializing Upstash/Groq clients
- Press `Ctrl+C` to stop when done testing

**Alternative Test (Next.js dev server):**
```powershell
cd "C:\Users\nashi\Week 5\digital-twin-mcp"
pnpm dev
```

Then visit: http://localhost:3000/api/mcp

**Expected:** JSON response showing MCP server capabilities

---

### Step 3: Reload VS Code and Test Integration (5 min)

**A. Reload VS Code:**
1. Press `Ctrl+Shift+P` (Command Palette)
2. Type: `Reload Window`
3. Press Enter

**B. Verify MCP Server is Recognized:**

Look for MCP status indicator in VS Code status bar (bottom of window)

**C. Test with GitHub Copilot Chat:**

Open Copilot Chat and try:

```
@workspace What is my name and background?
```

**Expected Response:**
```
I'm Nashib Rana Magar, a 20-year-old Nepalese student 
currently in my 2nd year of Bachelor of IT at Victoria 
University in Sydney, Australia...
```

**D. Test Job-Specific Query:**

```
@workspace Based on my profile and the job posting in 
job-postings/job1.md, what are my strengths for this role?
```

**Expected Response:**
Analysis comparing your skills to Samsung Finance Analyst role.

---

## 🎬 Running Your First Interview Simulation

Once Steps 1-3 are complete, try this in Copilot Chat:

### HR Recruiter Initial Screen (15 min)

```
@workspace You are an experienced HR recruiter conducting an 
initial phone screen for the role in job-postings/job1.md. 
Use my digital twin MCP server data.

Key areas to assess:
- Basic qualifications
- Salary alignment
- Cultural fit
- Work authorization
- Availability

Conduct a 15-minute screening call with 5-6 questions. 
Provide pass/fail recommendation with reasoning.
```

**What happens:**
1. Copilot calls your MCP server via `query_digital_twin` tool
2. MCP server searches Upstash Vector for relevant profile info
3. Groq LLM generates personalized questions
4. You answer the questions
5. Copilot provides scoring and feedback

---

## 🧪 Verification Tests

### Test 1: Basic Profile Query
```
@workspace What are my technical skills?
```

**Should return:** Java, Python, PHP, SQL, web technologies

### Test 2: Experience Query
```
@workspace Tell me about my Library Management System project
```

**Should return:** PHP/MySQL project, Hogwarts theme, team collaboration

### Test 3: Salary Query
```
@workspace What are my salary expectations?
```

**Should return:** $30-35/hour for internship

### Test 4: Work Authorization
```
@workspace What is my visa status and work rights?
```

**Should return:** Student Visa, 48 hours/fortnight during semester

---

## 🐛 Troubleshooting

### Issue: "No results found" when querying

**Cause:** Profile not uploaded to Upstash Vector  
**Fix:** Run Step 1 (`python embed_digitaltwin.py`)

### Issue: VS Code doesn't recognize MCP server

**Cause:** `.vscode/mcp.json` not loaded or invalid  
**Fix:** 
1. Check file exists: `c:\Users\nashi\Week 5\.vscode\mcp.json`
2. Reload VS Code window
3. Check for JSON syntax errors

### Issue: MCP server crashes on startup

**Cause:** Environment variables not found  
**Fix:** Verify `.vscode/mcp.json` has correct `env` section with:
- `UPSTASH_VECTOR_REST_URL`
- `UPSTASH_VECTOR_REST_TOKEN`
- `GROQ_API_KEY`

### Issue: Answers are generic, not personalized

**Cause:** Vector search not finding good matches  
**Fix:** 
1. Ensure profile was uploaded (Step 1)
2. Check Upstash dashboard: https://console.upstash.com/vector
3. Verify vector count is 20+

---

## 📊 Verify Setup is Complete

**Checklist:**

- [x] VS Code MCP config created (`.vscode/mcp.json`) ✅ **DONE**
- [ ] Profile uploaded to Upstash Vector (Step 1)
- [ ] MCP server tested and working (Step 2)
- [ ] VS Code reloaded and recognizes MCP (Step 3)
- [ ] Basic queries return personalized answers
- [ ] Interview simulation produces relevant questions

---

## 🎯 Next Steps After Setup

### 1. Run All 6 Interview Personas

Test different interviewer types:
- HR/Recruiter (cultural fit)
- Technical Engineer (coding/systems)
- Hiring Manager (role fit)
- Project Manager (collaboration)
- People & Culture (values)
- Executive (strategic thinking)

### 2. Find Better Job Match

Samsung Finance Analyst isn't ideal for IT student. Search Seek for:
- Junior Developer
- Software Engineering Intern
- IT Support Analyst
- Graduate Developer Program

Save to: `job-postings/job2.md`

### 3. Enhance Your Profile

Based on interview feedback, add:
- Quantified project metrics (team size, impact numbers)
- More STAR format achievements
- Detailed technical proficiency levels
- Leadership examples
- Certifications with dates

### 4. Practice and Iterate

1. Run simulation
2. Get feedback
3. Update profile
4. Re-run `python embed_digitaltwin.py`
5. Repeat until scores improve

---

## 📚 Documentation

**Quick Help:**
- Full guide: `agents.md`
- Status report: `IMPLEMENTATION_STATUS.md`
- Test results: `TEST_REPORT.md`

**Interview Personas:**
See `agents.md` section: "Testing Different Interviewer Personas"

**Profile Enhancement:**
See `agents.md` section: "Critical Profile Enhancement Areas"

---

## 🎉 Success Indicators

**You're ready when:**

✅ Can ask MCP server questions about your profile  
✅ Responses are personalized and accurate  
✅ Interview simulations ask relevant questions  
✅ Feedback includes scores and improvement areas  
✅ Different personas produce different interview styles  

---

## 💡 Pro Tips

**For Best Results:**

1. **Start fresh chat for each persona**  
   Prevents answer contamination from previous interview

2. **Space out interviews**  
   Don't run all 6 in one session - vary your responses

3. **Take notes on feedback**  
   Track weak areas and update profile accordingly

4. **Re-embed after updates**  
   Run `python embed_digitaltwin.py` after changing `digitaltwin.json`

5. **Use specific job postings**  
   Better match = more realistic simulation

---

**Ready? Start with Step 1! 🚀**

```powershell
cd "C:\Users\nashi\Week 5"
& .venv\Scripts\Activate.ps1
python embed_digitaltwin.py
```


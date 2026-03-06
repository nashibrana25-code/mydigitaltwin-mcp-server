# Interview Simulation Guide

## How to Use This System

### Quick Start

**Option 1: VS Code GitHub Copilot (Recommended)**
```
@workspace You are [persona] conducting an interview for [role]. 
Use the job posting in job-postings/[filename] and my digital twin 
MCP server data. Conduct a [duration]-minute interview focusing on 
[focus areas]. Provide detailed feedback and scores.
```

**Option 2: Claude Desktop**
Open Claude Desktop with MCP server running and have natural conversation-style interviews.

---

## 6 Interview Simulation Scenarios

### Scenario 1: HR/Recruiter Initial Screen (15 minutes)

**Persona:** Professional HR Recruiter  
**Focus:** Cultural fit, basic qualifications, logistics  
**Format:** Phone screen style

**Prompt Template:**
```
@workspace You are an experienced HR recruiter at [COMPANY] conducting 
an initial phone screen for the [ROLE] position in job-postings/[FILE].

Assessment areas:
- Cultural fit and motivation
- Basic qualification verification  
- Salary expectations alignment
- Work authorization status
- Availability and start date
- Communication skills
- Red flags or concerns

Conduct a 15-minute screening call with 5-6 questions. After my 
responses, provide:
1. Pass/Fail recommendation
2. Scores (1-10) for: cultural fit, qualifications, communication
3. Specific strengths and concerns
4. Whether to advance to technical round
```

**Common Questions to Expect:**
- Tell me about yourself
- Why are you interested in this role?
- What are your salary expectations?
- What is your work authorization status?
- When can you start?
- Why are you leaving your current situation?

**Success Criteria:**
- ✅ Pass recommendation
- ✅ Score 7+ on all categories
- ✅ No major red flags identified
- ✅ Advancement to next round

---

### Scenario 2: Technical Interview (45 minutes)

**Persona:** Senior Data Analyst or Analytics Manager  
**Focus:** Technical competency, problem-solving  
**Format:** In-depth technical assessment

**Prompt Template:**
```
@workspace You are a Senior Data Analyst conducting a technical 
interview for the [ROLE] in job-postings/[FILE]. Use my digital twin 
data to understand my background.

Assessment areas:
- SQL and database knowledge (write queries)
- Python programming for data analysis
- Data analysis concepts and methodology
- Problem-solving approach
- Technical depth vs. breadth
- Ability to explain complex concepts
- Hands-on project experience

Conduct a 45-minute technical interview with:
- 3-4 concept questions
- 1-2 practical SQL query challenges
- 1 Python/data analysis scenario
- 1 case study or problem-solving exercise

After my responses, provide:
1. Technical competency rating (1-10) for each skill area
2. Specific strengths and weaknesses
3. Comparison to requirements in job posting
4. Recommended focus areas for improvement
5. Hiring recommendation with justification
```

**Common Question Types:**
- Explain difference between X and Y
- Write a SQL query to accomplish [task]
- How would you analyze [business problem]?
- Walk me through your [specific project]
- Troubleshooting/debugging scenarios

**Success Criteria:**
- ✅ Score 7+ on core required skills
- ✅ Score 5+ on preferred skills
- ✅ Demonstrates problem-solving process
- ✅ Can explain technical concepts clearly

---

### Scenario 3: Hiring Manager Interview (30 minutes)

**Persona:** Would-be direct manager  
**Focus:** Role fit, team dynamics, day-to-day expectations  
**Format:** Practical assessment of working relationship

**Prompt Template:**
```
@workspace You are the hiring manager for the [ROLE] in 
job-postings/[FILE]. This person would report directly to you and work 
on your team. Use my digital twin data.

Assessment areas:
- Direct role responsibilities alignment
- Ability to hit the ground running
- Learning agility for gaps
- Team fit and collaboration style
- Initiative and ownership mindset
- Project management and delivery
- How they handle feedback
- Day-to-day work style

Conduct a 30-minute interview with:
- 2-3 role-specific scenario questions
- 1-2 team collaboration questions
- 1 learning/development question
- 1 work style preference question

After responses, provide:
1. Role fit score (1-10)
2. Ramp-up time estimate
3. Strengths for this specific role
4. Concerns or gaps
5. Management approach needed
6. Hire/No hire recommendation
```

**Common Questions:**
- How would you approach [specific task from job description]?
- Tell me about managing multiple priorities
- Describe your ideal manager/work environment
- How do you handle feedback?
- Walk me through your typical work process

**Success Criteria:**
- ✅ Score 8+ for role fit
- ✅ Manager sees clear value-add
- ✅ Realistic ramp-up timeline
- ✅ Compatible work styles

---

### Scenario 4: Project Manager Interview (25 minutes)

**Persona:** PM who collaborates with analysts  
**Focus:** Collaboration, communication, delivery  
**Format:** Stakeholder management assessment

**Prompt Template:**
```
@workspace You are a Project Manager who will work closely with the 
person hired for [ROLE] in job-postings/[FILE]. You need analysts who 
can collaborate effectively, communicate clearly, and deliver on time.

Assessment areas:
- Cross-functional collaboration
- Communication clarity (technical to non-technical)
- Meeting deadlines and managing scope
- Proactive communication about blockers
- Stakeholder management
- Agile/project methodology familiarity
- Conflict resolution
- Documentation and knowledge sharing

Conduct a 25-minute interview with 5 scenario-based questions about:
- Working with non-technical stakeholders
- Handling competing priorities
- Managing expectations
- Escalating issues
- Team collaboration

Provide:
1. Collaboration effectiveness score (1-10)
2. Communication clarity rating
3. Strengths for PM/Analyst partnership
4. Potential collaboration challenges
5. Recommendation for working relationship
```

**Common Questions:**
- How do you explain technical findings to non-technical audiences?
- Tell me about managing competing deadlines
- Describe working with difficult stakeholders
- How do you handle scope creep?

**Success Criteria:**
- ✅ Score 7+ collaboration
- ✅ Clear communicator
- ✅ Project-minded approach
- ✅ PM confident in partnership

---

### Scenario 5: People & Culture Interview (20 minutes)

**Persona:** HR/Culture representative  
**Focus:** Values alignment, long-term fit, team contribution  
**Format:** Cultural assessment

**Prompt Template:**
```
@workspace You are the People & Culture representative assessing 
cultural fit for [ROLE] in job-postings/[FILE]. Your job is to ensure 
new hires align with company values and will thrive in the culture.

Assessment areas:
- Company values alignment and examples
- Diversity, equity, inclusion mindset
- Team culture contribution potential
- Long-term career goals alignment
- Learning and growth mindset
- Work-life balance approach
- Resilience and adaptability
- What motivates them

Conduct a 20-minute values-based interview with 4-5 questions about:
- Past examples of living our values
- Contribution to team culture
- Handling challenges
- Growth and development
- What success looks like

Provide:
1. Cultural fit score (1-10)
2. Values alignment assessment
3. Culture contribution potential
4. Long-term retention likelihood
5. Any concerns about fit
6. Recommendation with reasoning
```

**Common Questions:**
- What kind of team culture do you thrive in?
- Tell me about a time you championed [company value]
- How do you approach continuous learning?
- What does work-life balance mean to you?

**Success Criteria:**
- ✅ Score 8+ cultural fit
- ✅ Values clearly demonstrated
- ✅ Long-term alignment
- ✅ Positive culture contributor

---

### Scenario 6: Executive/Leadership Interview (25 minutes)

**Persona:** Senior leader (Director/VP level)  
**Focus:** Strategic thinking, business impact, leadership potential  
**Format:** High-level assessment

**Prompt Template:**
```
@workspace You are a Director/VP conducting a final interview for 
[ROLE] in job-postings/[FILE]. You assess strategic thinking, business 
acumen, and long-term potential.

Assessment areas:
- Strategic thinking beyond tactical execution
- Understanding of business impact
- Leadership potential (even for junior role)
- Ability to influence without authority
- Long-term vision and ambition
- Curiosity about the business
- Executive presence and communication
- Questions they ask (quality of thinking)

Conduct a 25-minute interview with 3-4 high-level questions:
- Business strategy and analytics role
- Problem-solving at strategic level
- Career ambitions and potential
- What they're curious about

Provide:
1. Strategic thinking score (1-10)
2. Business acumen level
3. Leadership potential assessment
4. Executive presence rating
5. Long-term value to organization
6. Final hire recommendation
```

**Common Questions:**
- How do you think analytics drives business value?
- Where do you see the analytics field heading?
- What business problems interest you most?
- How do you approach influencing decisions?

**Success Criteria:**
- ✅ Score 6+ leadership potential
- ✅ Strategic thinking evident
- ✅ Business-minded approach
- ✅ Executive impressed with potential

---

## Interview Simulation Workflow

### Before Simulation

**1. Choose Your Job Posting**
- Select from `job-postings/` folder
- Ensure job description is complete
- Note key requirements and culture

**2. Choose Interviewer Persona**
- Start with HR screen
- Progress through technical → hiring manager → panel
- Save executive for final practice

**3. Start New Chat Session**
- **CRITICAL**: Fresh chat for each persona
- Prevents answer contamination
- More realistic experience

**4. Prepare Mentally**
- Review job posting
- Have your digital twin profile fresh in mind
- Get into candidate mindset

### During Simulation

**1. Respond Authentically**
- Don't just say "I'm good at X"
- Use STAR format for behavioral questions
- Give specific examples
- Be conversational, not scripted

**2. Take Notes**
- Write down questions asked
- Note your responses (briefly)
- Track which answers felt strong/weak

**3. Engage Fully**
- Ask clarifying questions if needed
- Show enthusiasm and curiosity
- End with your own questions

### After Simulation

**1. Review Feedback Immediately**
- Read all scores and assessments
- Note specific strengths mentioned
- Identify gaps or weaknesses
- Record improvement recommendations

**2. Document in Simulation Log**
- Create file in `simulations/` folder
- Template: `YYYY-MM-DD-[persona]-[company]-[role].md`
- Include: questions, scores, feedback, insights

**3. Update Your Profile**
- Add missing information identified
- Strengthen weak areas with better examples
- Add quantified metrics where lacking
- Update `digitaltwin.json`

**4. Re-embed Profile**
```powershell
cd "C:\Users\nashi\Week 5"
& .venv\Scripts\Activate.ps1
python embed_digitaltwin.py
```

**5. Schedule Follow-up**
- Set date to re-test same persona (1-2 weeks later)
- Compare scores to measure improvement
- Track progress over time

---

## Simulation Log Template

Save in `job-research/simulations/YYYY-MM-DD-[persona]-[role].md`

```markdown
# Interview Simulation Log

**Date:** [Date]
**Persona:** [HR/Technical/Hiring Manager/etc.]
**Role:** [Job title]
**Company:** [Company name]
**Duration:** [Actual time spent]

---

## Pre-Interview

**Job Posting:** job-postings/[filename]
**Preparation:** [What you reviewed]
**Goals:** [What you wanted to practice]

---

## Questions Asked

1. [Question 1]
   - **My Answer:** [Brief summary]
   - **Quality:** [Strong/OK/Weak]

2. [Question 2]
   - **My Answer:** [Brief summary]
   - **Quality:** [Strong/OK/Weak]

[Continue for all questions...]

---

## Feedback Received

### Scores

| Category | Score (1-10) | Notes |
|----------|--------------|-------|
| [Category 1] | X/10 | [Feedback] |
| [Category 2] | X/10 | [Feedback] |

**Overall Recommendation:** [Pass/Fail or Hire/No Hire]

### Strengths Identified

- [Strength 1]
- [Strength 2]
- [Strength 3]

### Weaknesses/Gaps Identified

- [Gap 1]
- [Gap 2]
- [Gap 3]

### Specific Feedback

[Detailed feedback from simulation]

---

## My Reflections

### What Went Well

- [Success 1]
- [Success 2]

### What Needs Improvement

- [Area 1]: [How to improve]
- [Area 2]: [How to improve]

### Surprises

- [Unexpected question or feedback]

### Questions I Asked

1. [Your question 1]
2. [Your question 2]

---

## Action Items

- [ ] Update digitaltwin.json with [specific additions]
- [ ] Practice explaining [concept] more clearly
- [ ] Research [topic] for better understanding
- [ ] Add [missing metric] to project descriptions
- [ ] Re-run this simulation in [timeframe]

---

## Comparison to Previous Attempt

(For repeat simulations)

**Previous Score:** [X/10]  
**Current Score:** [Y/10]  
**Improvement:** [+/- Z points]

**What improved:** [Specific improvements]
**Still needs work:** [Ongoing gaps]

---

## Notes

[Any other observations, learnings, or context]
```

---

## Success Metrics

### Per Simulation

**Minimum Passing Scores:**
- HR Screen: Pass recommendation
- Technical: 7+ on core skills
- Hiring Manager: 8+ role fit
- Project Manager: 7+ collaboration
- People & Culture: 8+ cultural fit
- Executive: 6+ leadership potential

### Overall Progress

**Track across simulations:**
- Average scores trending up
- Fewer gaps identified over time
- Stronger specific examples
- More confident responses
- Better questions asked
- Positive interviewer sentiment

### Ready for Real Interviews When:

✅ Consistently passing all persona simulations  
✅ Scores averaging 8+ across categories  
✅ Can answer all common questions confidently  
✅ Have 5-6 strong STAR stories ready  
✅ Minimal "missing information" feedback  
✅ Positive hire recommendations from all personas  

---

## Tips for Effective Simulations

**Do:**
- ✅ Treat it like a real interview
- ✅ Speak your answers out loud (not just type)
- ✅ Time yourself
- ✅ Dress professionally (helps mindset)
- ✅ Review real job postings
- ✅ Take it seriously, get nervous even
- ✅ Learn from each iteration

**Don't:**
- ❌ Reuse same chat session for multiple personas
- ❌ Give one-word answers
- ❌ Skip the reflection phase
- ❌ Ignore gaps identified
- ❌ Rush through without preparation
- ❌ Avoid difficult questions
- ❌ Stop after one round

---

## Advanced: Industry-Specific Simulations

### For Finance/Banking Analytics Roles

Add to prompt:
```
Focus on:
- Financial metrics knowledge (revenue, margins, ROI)
- Regulatory compliance awareness
- Risk analysis concepts
- Stakeholder management in corporate environment
```

### For Tech Company Analytics Roles

Add to prompt:
```
Focus on:
- Product analytics concepts
- A/B testing methodology
- User behavior analysis
- Agile/SCRUM familiarity
- Technical depth in SQL/Python
```

### For Healthcare Analytics Roles

Add to prompt:
```
Focus on:
- Data privacy (HIPAA awareness)
- Healthcare metrics (patient outcomes, costs)
- Ethical data use
- Clinical vs. operational analytics
```

---

## Iteration Cycle

```
Week 1: Initial simulations (all 6 personas)
   ↓
Document all feedback
   ↓
Week 2: Update profile, practice weak areas
   ↓
Re-embed updated profile
   ↓
Week 3: Re-run simulations (compare scores)
   ↓
Measure improvement
   ↓
Week 4: Final polish and real applications
```

**Goal:** See measurable improvement in scores with each iteration cycle.

---

**Your interview simulation system is ready! Start with HR screen and work your way through all six personas. 🎯**

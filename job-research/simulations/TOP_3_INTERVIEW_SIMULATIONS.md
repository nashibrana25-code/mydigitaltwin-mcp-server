# Interview Simulation Scripts - Ready for Practice

## How to Use These Simulations

**For VS Code GitHub Copilot:**
```
@workspace Act as [Interviewer Type] for [Company Name] [Job Title]. 
Conduct a [Duration] interview using the script in 
job-research/simulations/[filename].md. Ask questions one at a time, 
wait for my responses, and provide feedback at the end.
```

**For Claude Desktop:**
```
Hi Claude, I want to practice for my interview with [Company Name] 
for the [Job Title] position. Can you act as the [Interviewer Type] 
and conduct a realistic interview? The job details are in 
job-postings/[jobX].md and my profile is in digitaltwin.json.

Ask me questions one at a time, wait for my responses, then provide 
constructive feedback on how I can improve each answer.
```

---

## 🎯 TOP PRIORITY: Job #2 - Data Analyst (Junior) - Advance Delivery

### Interview Simulation #1: Technical Screening (45 minutes)

**INTERVIEWER PERSONA:** Senior Data Analyst / Technical Team Lead  
**FOCUS:** SQL proficiency, data analysis skills, problem-solving  
**INTERVIEW TYPE:** Technical competency assessment

---

#### **Opening (5 minutes)**

**INTERVIEWER:** "Hi Nashib, thanks for joining us today. I'm [Name], Senior Data Analyst at Advance Delivery Consulting. This will be a technical interview focusing on your SQL skills, data analysis experience, and problem-solving approach. We'll spend about 45 minutes going through some questions and scenarios. Let's start with you telling me a bit about yourself and your interest in this data analyst role."

**YOUR RESPONSE:** [Use elevator pitch from master guide, emphasizing recent AI Data Analyst internship, SQL experience, and data profiling capabilities]

---

#### **SQL Technical Questions (20 minutes)**

**Q1:** "Let's start with SQL. Can you write a query to find all customers who made purchases in the last 30 days, showing their total spend? Assume tables: customers (customer_id, name, email) and orders (order_id, customer_id, order_date, amount)."

**EXPECTED APPROACH:**
```sql
SELECT 
    c.customer_id,
    c.name,
    c.email,
    SUM(o.amount) AS total_spend
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id
WHERE o.order_date >= DATEADD(day, -30, GETDATE())
GROUP BY c.customer_id, c.name, c.email
ORDER BY total_spend DESC;
```

**YOUR TALKING POINTS:**
- "I'd use an INNER JOIN since we only want customers who have orders"
- "DATEADD function for date arithmetic (or DATE_SUB in MySQL)"
- "GROUP BY with aggregation to sum amounts per customer"
- "Order by total spend descending to see top spenders first"

---

**Q2:** "Good. Now, how would you find duplicate email addresses in the customers table?"

**EXPECTED APPROACH:**
```sql
SELECT email, COUNT(*) as duplicate_count
FROM customers
GROUP BY email
HAVING COUNT(*) > 1;
```

**YOUR TALKING POINTS:**
- "Use GROUP BY with HAVING clause to filter aggregated results"
- "HAVING is used instead of WHERE because we're filtering on aggregate function"
- "In my Library Management System project, I used similar logic to prevent duplicate book ISBNs"

---

**Q3:** "Explain the difference between INNER JOIN, LEFT JOIN, and RIGHT JOIN with examples of when you'd use each."

**EXPECTED ANSWER:**
- **INNER JOIN:** Returns only matching rows from both tables
  - Use when: Need data that exists in both tables (e.g., orders with customer details)
  
- **LEFT JOIN:** Returns all rows from left table + matching from right (NULL if no match)
  - Use when: Need all records from first table regardless of matches (e.g., all customers, even those with no orders)
  
- **RIGHT JOIN:** Returns all rows from right table + matching from left (NULL if no match)
  - Use when: Opposite of LEFT JOIN (less common, can usually rewrite as LEFT JOIN)

**YOUR EXAMPLE:** "In my Library Management System, I used LEFT JOIN to show all books even if they weren't currently borrowed, and INNER JOIN to show only borrowed books with member details."

---

**Q4:** "How would you optimize a slow-running query?"

**EXPECTED APPROACH:**
1. Run EXPLAIN/execution plan to see query steps
2. Check if indexes exist on JOIN and WHERE columns
3. Avoid SELECT *, retrieve only needed columns
4. Use appropriate JOIN types
5. Consider breaking complex queries into temp tables
6. Review data types and ensure they match in JOINs

**YOUR EXPERIENCE:** "In my Digital Twin internship, I optimized vector database queries by adding proper indexing and implementing Redis caching, reducing query times from 2-3 seconds to under 1 second."

---

#### **Data Analysis Scenario (10 minutes)**

**INTERVIEWER:** "Let's move to a scenario. You're given a dataset of customer transactions for the last year. Management wants to know which products are selling best, which are declining, and where we should focus our inventory. How would you approach this analysis?"

**EXPECTED FRAMEWORK:**
1. **Understand Requirements:**
   - Define "selling best" (total revenue? units sold? profit margin?)
   - Time period granularity (monthly trends? seasonal?)
   - Segmentation needed (by region, customer type, etc.)?

2. **Data Exploration:**
   - Check data quality (missing values, outliers, duplicates)
   - Calculate summary statistics (total sales, average order value)
   - Identify unique products and transaction patterns

3. **Analysis Steps:**
   - Aggregate sales by product (total revenue, units sold)
   - Calculate month-over-month growth rates
   - Identify trending products (growing vs. declining)
   - Perform cohort or seasonal analysis if relevant

4. **Visualization & Insights:**
   - Top 10 products by revenue (bar chart)
   - Trend lines showing growth/decline over time
   - Category-level analysis if applicable
   - Recommendations with data backing

5. **Deliverable:**
   - Executive summary with key insights
   - Detailed data tables for reference
   - Clear recommendations on inventory focus

**YOUR CONNECTION:** "This is similar to how I approached cost optimization in my internship—I analyzed API usage patterns, identified redundant queries (40% were cacheable), and provided data-backed recommendations that resulted in 60% cost reduction."

---

#### **ETL & Data Quality (5 minutes)**

**Q5:** "The job description mentions ETL development and data migration. Can you explain what ETL is and describe any experience you have with data transformation?"

**EXPECTED ANSWER:**
**ETL = Extract, Transform, Load**

- **Extract:** Pull data from source systems (databases, APIs, files)
- **Transform:** Clean, validate, standardize, aggregate data
- **Load:** Insert transformed data into target system (data warehouse, database)

**YOUR EXPERIENCE:**
"While I haven't used enterprise ETL tools like SSIS or Informatica yet, I've performed ETL processes in my projects:

In my Digital Twin internship:
- **Extract:** Parsed JSON profile data from file system
- **Transform:** Chunked text into semantic segments, cleaned formatting, generated embeddings via API
- **Load:** Uploaded processed vectors to Upstash Vector database with metadata

I understand ETL concepts and data pipeline design. Given my database and Python experience, I'm confident I can quickly learn SSIS/Informatica on the job."

---

#### **Problem-Solving & Adaptability (5 minutes)**

**Q6:** "Tell me about a time you had to learn a new technical skill or tool quickly."

**USE STAR STORY #3:** Cybersecurity Lab - Wazuh & Snort IDS/IPS  
[Full story in master guide - emphasize 95% attack detection success and HD grade]

---

#### **Closing Questions (5 minutes)**

**INTERVIEWER:** "Do you have any questions for me?"

**YOUR STRATEGIC QUESTIONS:**
1. "What does a typical day or week look like for a junior data analyst in your team?"
2. "What data systems and tools does the team use daily? (SQL Server, Python, specific BI tools?)"
3. "Can you describe the onboarding and training process for someone new to SSIS/SSRS?"
4. "What types of projects would I be working on in the first 3-6 months?"
5. "How does the team balance client-facing work with internal analysis?"

---

#### **Interviewer Feedback & Scoring**

**Technical SQL Skills:** ___ / 10  
**Data Analysis Approach:** ___ / 10  
**Problem-Solving Ability:** ___ / 10  
**Communication Clarity:** ___ / 10  
**Learning Agility:** ___ / 10  
**Cultural Fit:** ___ / 10  

**Overall Recommendation:** 
- [ ] Strong Yes - Move to next round
- [ ] Yes - Proceed with reservations
- [ ] No - Not a fit at this time

**Feedback Notes:**
[Space for interviewer to provide specific feedback on strengths and areas for improvement]

---

### Interview Simulation #2: HR/Behavioral Round (30 minutes)

**INTERVIEWER PERSONA:** HR Recruiter / Talent Acquisition  
**FOCUS:** Cultural fit, work authorization, motivations, teamwork  
**INTERVIEW TYPE:** Behavioral screening

---

#### **Opening & Background (5 minutes)**

**INTERVIEWER:** "Hi Nashib, thanks for joining. I'm [Name] from our HR team. Today's conversation is about getting to know you better—your background, career goals, and what you're looking for. Let's start: tell me about yourself and why you're interested in data analyst roles."

**YOUR RESPONSE:** [Elevator pitch emphasizing career transition from IT student to data analytics, recent internship experience, passion for solving problems with data]

---

#### **Work Authorization & Logistics (5 minutes)**

**Q1:** "I see you're currently a student. Can you clarify your work authorization status and availability?"

**YOUR ANSWER:**
"Yes, I'm currently in my 2nd year of Bachelor of IT at Victoria University on a Student Visa (subclass 500). My work rights allow:
- **During semester:** 48 hours per fortnight (approximately 24 hours/week)
- **During university breaks:** Unlimited hours

My current semester ends in [Date], and I have a break until [Date], giving me full-time availability then. I'm also on track to pursue permanent residency pathways after graduation, making me a long-term investment.

For this role, I'm flexible with scheduling and can accommodate the team's needs within my work rights."

---

**Q2:** "When would you be available to start?"

**YOUR ANSWER:**
"I could start immediately for part-time hours (up to 24 hrs/week during semester), or if you prefer full-time, I have my semester break starting [Date] where I'm fully available. What timeline works best for your team?"

---

#### **Behavioral Questions (15 minutes)**

**Q3:** "Tell me about a time you worked in a team. What was your role and how did you handle any challenges?"

**USE STAR STORY #4:** Library Management System Project  
[Full story in master guide - emphasize HD grade, equal contribution, ahead of schedule delivery]

---

**Q4:** "Describe a situation where you had to adapt to a significant change. How did you handle it?"

**STAR RESPONSE:**
- **Situation:** Moving from Nepal to Australia in 2024 to pursue my IT degree - completely new country, education system, and professional culture
  
- **Task:** Adapt quickly to Australian academic expectations, cultural norms, and language differences while maintaining strong academic performance

- **Action:**
  1. Immersed myself in Australian culture through university events and local communities
  2. Sought feedback from professors early to understand academic expectations
  3. Joined study groups to learn from Australian students' approaches
  4. Balanced part-time work (20 hrs/week) to gain local work experience
  5. Embraced challenges as learning opportunities rather than obstacles

- **Result:**
  - Achieved **Dean's List standing** within first year
  - **High Distinction** in Database Systems
  - Built strong network of peers and mentors
  - Gained cross-cultural communication skills valuable in diverse workplaces
  - Developed resilience and adaptability that serve me in professional settings

**KEY MESSAGE:** "This experience taught me that I thrive in new environments and can quickly adapt to different working styles—skills directly applicable to joining new teams and learning new systems at Advance Delivery."

---

**Q5:** "Why are you interested in consulting vs. working directly for a company?"

**YOUR ANSWER:**
"I'm excited about consulting for three reasons:

1. **Accelerated Learning:** Consulting exposes you to multiple clients, industries, and business problems in shorter timeframes. As someone early in my career, this variety accelerates my learning curve compared to focusing on one company's systems.

2. **Diverse Challenges:** I enjoy problem-solving, and consulting offers different puzzles to solve. One week might be healthcare data, the next financial services—keeping work engaging and building versatile skills.

3. **Professional Development:** Consulting teaches you to communicate across different stakeholder types, adapt to various company cultures, and deliver results under pressure—skills that make you a stronger professional long-term.

Advance Delivery's focus on large Australian enterprises also means working with sophisticated data systems and experienced professionals I can learn from."

---

#### **Motivation & Career Goals (3 minutes)**

**Q6:** "Where do you see yourself in 3-5 years?"

**YOUR ANSWER:**
"In 3-5 years, I see myself as a confident data analyst who can:
- Lead end-to-end data analysis projects independently
- Mentor junior analysts and share knowledge
- Bridge technical and business stakeholders effectively
- Potentially specialize in a domain like healthcare or finance data

Short-term (1-2 years), I want to:
- Master SQL, ETL tools (SSIS/Informatica), and data visualization platforms
- Build deep consulting experience across multiple industries
- Earn relevant certifications (Microsoft Data Analyst, Tableau, etc.)

Advance Delivery's consulting environment is perfect for this growth trajectory because of the client variety and experienced team I'd learn from."

---

#### **Closing & Next Steps (2 minutes)**

**INTERVIEWER:** "Great! Do you have any questions about the role, company culture, or next steps?"

**YOUR QUESTIONS:**
1. "What's the team structure and who would I be working most closely with?"
2. "What does success look like for someone in this role after 6 months?"
3. "Can you describe Advance Delivery's approach to professional development and training?"
4. "What are the next steps in the interview process and the timeline?"

---

---

## 🔥 TOP PRIORITY #2: Job #6 - Graduate Analyst, Renewable Energy - CleanPeak Energy

### Interview Simulation #3: Hiring Manager Interview (40 minutes)

**INTERVIEWER PERSONA:** Commercial & Risk Team Manager  
**FOCUS:** Financial modeling, analytical thinking, energy industry interest  
**INTERVIEW TYPE:** Role fit and capabilities assessment

---

#### **Opening (5 minutes)**

**INTERVIEWER:** "Hi Nashib, I'm [Name], leading the Commercial & Risk team here at CleanPeak. This role is really about financial analysis for our electricity retail business—pricing proposals, risk analysis, and understanding our operating assets' profitability. Tell me, what attracts you to renewable energy and this graduate analyst role?"

**YOUR RESPONSE:**
"I'm excited about CleanPeak for three compelling reasons:

**1. Industry Impact:** Renewable energy is the future. Australia's transition to clean energy is one of the most important economic and environmental shifts happening now. Being part of a company building solar, battery, and thermal infrastructure means contributing to something bigger than just a job—it's about sustainable energy for the next generation.

**2. Perfect Skill Match:** My background uniquely aligns with this role:
- **Financial modeling:** In my AI internship, I built cost optimization models that reduced expenses by 60%—the same analytical thinking you need for electricity pricing proposals
- **Data analysis:** I'm proficient in Excel, Python, and SQL for analyzing complex datasets
- **Accounting foundation:** I'm CAN-Certified in Accounting Package software, giving me financial data structure understanding

**3. Learning Environment:** You specifically mention providing 'significant support and training'—as a graduate, that's exactly what I'm looking for. I want to learn from experienced professionals in the energy market while contributing my modern data analysis skills.

What excites me most is combining my technical analytical capabilities with real-world financial decision-making in a growth industry."

---

#### **Financial Modeling & Analysis (15 minutes)**

**Q1:** "Walk me through how you would approach building a financial model for an electricity pricing proposal."

**EXPECTED FRAMEWORK:**

**YOUR ANSWER:**
"Having built financial models for my internship project, I'd approach electricity pricing using this framework:

**1. Define Objectives & Inputs:**
- Understand customer requirements (load profile, contract term, volume)
- Identify key cost drivers: wholesale electricity costs, network charges, retailer margins, risks
- Gather market data: forward electricity prices, historical volatility, renewable energy certificates

**2. Build Revenue Model:**
- Calculate expected electricity consumption (MWh per month/year)
- Model pricing structure (fixed vs. variable components)
- Project revenue over contract term

**3. Build Cost Model:**
- Wholesale electricity costs (using forward curves or hedging strategies)
- Network & transmission charges (regulated fees)
- Renewable energy costs (LGCs, RECs)
- Operating costs and overhead allocation

**4. Risk Analysis:**
- Volume risk: What if customer usage differs from forecast?
- Price risk: What if wholesale prices spike?
- Scenario modeling: Best case / base case / worst case
- Sensitivity analysis: Impact of ±10% change in key variables

**5. Margin & Profitability:**
- Calculate gross and net margins
- Compare against company's risk management framework
- Ensure adequate buffer for unexpected costs

**6. Output & Presentation:**
- Clear pricing recommendation with rationale
- Risk summary and mitigation strategies
- Executive summary for decision-makers

**Example from my experience:** In my internship, I modeled API costs with variables like call frequency and caching hit rates, then tested scenarios to find the optimal configuration. It's the same principle—understanding cost drivers, modeling scenarios, and making data-backed recommendations."

**FOLLOW-UP:** "I acknowledge I'd need to learn energy market specifics—wholesale pricing mechanisms, forward contracts, renewable certificate trading—but my financial modeling foundation and analytical skills make that a very learnable domain."

---

**Q2:** "Let's say wholesale electricity prices suddenly spike 30% due to a gas shortage. How would you analyze the impact on our business?"

**YOUR ANALYTICAL APPROACH:**

**Step 1: Quantify Immediate Impact**
- Calculate additional cost: 30% increase × current wholesale exposure (unhedged volume)
- Identify which customer contracts are most affected (fixed-price contracts = higher risk)

**Step 2: Risk Breakdown**
- Hedged vs. unhedged positions: How much exposure is protected?
- Contract analysis: Which customers have pass-through clauses vs. fixed pricing?
- Time horizon: Is this a short-term spike or sustained increase?

**Step 3: Financial Modeling**
- Update profit forecasts with new wholesale prices
- Calculate margin compression on fixed-price contracts
- Model cash flow impact over next 3-6 months

**Step 4: Strategic Recommendations**
- Short-term: Increase hedging to lock in current prices before further increases
- Medium-term: Renegotiate contracts with flexible pricing customers
- Long-term: Assess if we need to adjust pricing for new contracts

**Step 5: Communication**
- Prepare board report showing exposure, impact, and mitigation plan
- Update stakeholders with scenario analysis

**Connection to your experience:** "In my internship, when I discovered API costs would exceed budget, I didn't just report the problem—I analyzed usage patterns, built scenarios, and implemented caching to reduce costs by 60%. Same analytical mindset: identify issue, quantify impact, propose solutions."

---

#### **Excel & Technical Skills (8 minutes)**

**Q3:** "Describe your Excel proficiency. Have you used PowerPivot or complex financial modeling features?"

**YOUR ANSWER:**
"My Excel skills are strong for a graduate level:

**Core Functions I Use Regularly:**
- VLOOKUP / INDEX-MATCH for data lookups
- SUMIFS, COUNTIFS, AVERAGEIFS for conditional aggregation
- Pivot tables for summarizing large datasets
- IF, IFS, nested IF statements for logic
- Data validation for input controls
- Charts and conditional formatting for visualization

**Financial Modeling Experience:**
- Built scenario models with multiple input variables
- Used data tables for sensitivity analysis
- Named ranges for clean formula references
- Percentage calculations, growth rates, variance analysis

**PowerPivot & Advanced Features:**
- I have basic exposure to PowerPivot from online learning
- Understand concept of data models and relationships
- Haven't built complex PowerPivot models yet, but eager to learn

**My Learning Approach:**
When I needed to master Docker, Nginx, and Redis for my internship (tools I'd never used), I learned them in 2 weeks through documentation and practice. I'd apply the same approach to mastering PowerPivot and advanced Excel modeling with your training and real project work.

**Bonus:** My Python skills mean I can automate repetitive Excel tasks and handle datasets too large for Excel using Pandas, making me more efficient than Excel-only analysts."

---

**Q4:** "Have you done any work with databases or SQL? How would you use SQL in this role?"

**YOUR ANSWER:**
"Yes, SQL is one of my core strengths:
- **1+ year hands-on experience** with MySQL and PostgreSQL
- Built database systems for academic projects (Library Management System)
- Used SQL extensively in my AI internship for data extraction and profiling

**How I'd use SQL at CleanPeak:**
1. **Data Extraction:** Pull electricity usage data, billing records, market prices from databases
2. **Analysis Queries:** Aggregate usage by customer segment, time period, or tariff type
3. **Report Automation:** Write queries that feed into Excel models or dashboards
4. **Performance Analysis:** Analyze operating assets' generation vs. forecast
5. **Data Quality:** Identify anomalies, missing data, or billing discrepancies

**Example Query:**
```sql
-- Top 10 customers by monthly electricity consumption
SELECT 
    customer_id, 
    customer_name,
    SUM(usage_kwh) as total_usage,
    AVG(usage_kwh) as avg_daily_usage
FROM electricity_usage
WHERE usage_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY customer_id, customer_name
ORDER BY total_usage DESC
LIMIT 10;
```

This SQL proficiency makes me more self-sufficient than typical finance graduates who rely on others to extract data."

---

#### **Industry Knowledge & Enthusiasm (5 minutes)**

**Q5:** "What do you know about the Australian energy market and wholesale electricity pricing?"

**HONEST BUT PREPARED ANSWER:**
"I'll be transparent: I'm not an energy market expert yet, but I've done initial research and here's what I understand:

**Australian Electricity Market Basics:**
- **NEM (National Electricity Market):** Connects five states (QLD, NSW, VIC, SA, TAS), spot market with 5-minute dispatch intervals
- **Wholesale pricing:** Determined by supply-demand balance, can be volatile (low demand + high renewables = low prices, peak demand + low wind/solar = high prices)
- **Renewable Energy Targets:** Australia's push for renewable penetration driving investment in solar, wind, and batteries

**CleanPeak's Position:**
- You build and own large-scale solar, battery, and thermal assets
- You're both a generator (selling electricity) and retailer (buying wholesale, selling to customers)
- Your batteries help manage price volatility by storing cheap energy and selling during peaks

**What I Need to Learn:**
- Forward contract structures and hedging strategies
- How renewable energy certificates (LGCs, STCs) work
- Network pricing and transmission constraints
- Specific CleanPeak asset portfolio and risk positions

**My Approach:** I'm a quick learner. I'd immerse myself in industry publications (RenewEconomy, AEMO reports), ask questions, and learn from the team. My analytical foundation means I'll understand the market mechanics quickly once exposed to them.

What I bring from day one is strong financial modeling and data analysis skills—the energy market knowledge can be learned, and you mentioned providing training."

---

#### **Behavioral & Culture Fit (5 minutes)**

**Q6:** "This role requires working in a fast-paced environment with evolving priorities. Tell me about a time you juggled multiple deadlines."

**STAR RESPONSE:**
- **Situation:** Final semester (Sem 2, 2025): Cybersecurity Lab project due, Library Management System project, and 10-week AI internship—all overlapping timelines

- **Task:** Deliver all three successfully while maintaining academic grades and internship quality

- **Action:**
  1. Created master timeline with all deadlines and milestones
  2. Prioritized by urgency and importance (internship production deadline was immovable)
  3. Worked in focused blocks: mornings on internship, afternoons on coursework
  4. Communicated with professors about internship commitments
  5. Used weekends for catching up on academic work
  6. Broke large projects into daily achievable tasks

- **Result:**
  - Delivered internship project successfully (production-ready, documented)
  - Achieved HD grade in Cybersecurity Lab
  - Completed Library Management System ahead of schedule
  - Maintained Dean's List standing
  - Learned effective time management and prioritization skills

**Key message:** "Fast-paced environments energize me. I thrive when there's variety and urgency—it forces focus and prevents complacency."

---

#### **Closing Questions (2 minutes)**

**YOUR STRATEGIC QUESTIONS:**
1. "Can you describe a typical pricing proposal project from start to finish? What's my role as graduate analyst?"
2. "What does the team structure look like? Who would I be learning from directly?"
3. "How does CleanPeak approach professional development for graduates? Are there rotations or mentorship programs?"
4. "What are the most challenging aspects of this role that I should prepare for?"
5. "What's the next step in the interview process?"

---

---

## 🎯 Practice Session Guide

### How to Run These Simulations Effectively

**Option 1: With a Friend/Mentor**
- Have them read the interviewer questions
- Answer out loud as if real interview
- Ask for honest feedback on:
  - Clarity of responses
  - Confidence level
  - Use of specific examples
  - Areas that seemed rehearsed vs. natural

**Option 2: Record Yourself**
- Use phone/laptop to video record
- Watch playback and critique:
  - Body language and eye contact
  - Pace of speech (too fast? too slow?)
  - Filler words ("um," "like," "you know")
  - Energy and enthusiasm level

**Option 3: With AI Assistant (Claude/Copilot)**
- Use the prompts at the top of this document
- Treat it like a real interview
- Ask for detailed feedback after each question
- Iterate on weak answers

---

### Simulation Success Metrics

After each practice session, rate yourself:

| Skill | Score (1-10) | Notes |
|-------|--------------|-------|
| **Preparation:** Did you know your STAR stories? | ___ | |
| **Technical Accuracy:** Were answers technically correct? | ___ | |
| **Clarity:** Were you easy to understand? | ___ | |
| **Confidence:** Did you sound certain vs. uncertain? | ___ | |
| **Examples:** Did you use specific, relevant examples? | ___ | |
| **Engagement:** Did you ask good questions? | ___ | |

**Target Scores:**
- **7+:** Ready to interview
- **5-6:** Need more practice on specific areas
- **<5:** Significant prep needed before real interview

---

### Final Tips for Interview Day

**✅ DO:**
- Arrive 10-15 minutes early (or log in 5 min early for video)
- Bring notepad and pen, extra resume copies
- Smile, make eye contact, show enthusiasm
- Use STAR method for behavioral questions
- Ask clarifying questions if needed
- Send thank-you email within 24 hours

**❌ DON'T:**
- Bad-mouth previous employers/professors
- Ramble without structure
- Lie about experience you don't have
- Ask about salary in first interview (unless they bring it up)
- Forget to prepare questions for them
- Show up without researching the company

---

**You've got this, Nashib! Practice these simulations multiple times until your STAR stories flow naturally. The more you rehearse, the more confident and authentic you'll sound in real interviews. Good luck! 🚀**

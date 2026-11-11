// src/data/knowledgeBase.ts
// TrustLens offline knowledge base: 40 entries + generic fallback + matcher.
// Source snippets are short PARAPHRASED summaries, not verbatim quotes.
// Time-sensitive facts are marked confidence "verify". Last reviewed: 11 Nov 2026.

import { TrustAnswer } from "../types/trustAnswer";

export type Confidence = "high" | "medium" | "low" | "verify";
export type ClaimStatus = "supported" | "partial" | "unverified" | "conflicting";
export type SourceType = "primary" | "secondary" | "general";
export type Stakes = "low" | "medium" | "high";

export interface KBSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  domain: string;
  snippet: string;
  type: SourceType;
}

export interface KBClaim {
  text: string;
  confidence: Confidence;
  status: ClaimStatus;
  sourceIds: string[];
  note?: string;
}

export interface KBEntry {
  id: string;
  topic: string;
  keywords: string[];
  questions: string[];
  directAnswer: string;
  details?: string;
  claims: KBClaim[];
  uncertainties: string[];
  nextSteps: string[];
  followUps: string[];
  stakes: Stakes;
}

/* ------------------------------ SOURCES ------------------------------ */
const s = (
  id: string, title: string, publisher: string, url: string,
  snippet: string, type: SourceType = "primary"
): KBSource => {
  let hostname = "official-portal.org";
  try {
    hostname = new URL(url).hostname;
  } catch (e) {
    // fallback if URL fails
  }
  return { id, title, publisher, url, domain: hostname, snippet, type };
};

export const SOURCES: Record<string, KBSource> = {
  gate27: s("gate27", "GATE 2027 official portal and information brochure", "IIT Madras (GATE 2027)", "https://gate2027.iitm.ac.in",
    "Official site for GATE 2027: brochure, eligibility, papers, schedule, GOAPS application portal."),
  iitm: s("iitm", "IIT Madras press release: organising institute for GATE 2027", "IIT Madras", "https://www.iitm.ac.in",
    "IIT Madras announced it is the organising institute for GATE 2027."),
  gateNews: s("gateNews", "GATE 2027 schedule and registration coverage", "Business Standard", "https://www.business-standard.com/education/news/gate-2027-registration-date-postponed-check-exam-schedule-new-paper-nc-126081400796_1.html",
    "News coverage of the GATE 2027 notification, exam schedule, fees, eligibility and the new Robotics paper.", "secondary"),
  catOff: s("catOff", "CAT official website", "IIMs (CAT)", "https://iimcat.ac.in",
    "Official CAT site with notification, pattern, eligibility, registration and scorecards.", "primary"),
  greOff: s("greOff", "GRE General Test", "ETS", "https://www.ets.org/gre",
    "Official GRE information: format, scoring scale, registration, score reporting and validity.", "primary"),
  gmatOff: s("gmatOff", "GMAT Focus Edition", "GMAC", "https://www.mba.com/exams/gmat-exam",
    "Official GMAT information: sections, scoring and score validity.", "primary"),
  nsp: s("nsp", "National Scholarship Portal", "Government of India", "https://scholarships.gov.in",
    "Central portal listing central and state scholarship schemes and application windows.", "primary"),
  aicte: s("aicte", "AICTE scholarship schemes", "AICTE", "https://www.aicte-india.org",
    "AICTE lists scholarship schemes for technical students; eligibility changes yearly.", "primary"),
  vidya: s("vidya", "Vidya Lakshmi education loan portal", "Government of India / banks", "https://www.vidyalakshmi.co.in",
    "Single portal to compare and apply for education loans from multiple banks.", "primary"),
  ugc: s("ugc", "UGC: academic integrity and plagiarism regulations", "University Grants Commission", "https://www.ugc.gov.in",
    "UGC regulations (2018) on promoting academic integrity and preventing plagiarism in higher education.", "primary"),
  apaAI: s("apaAI", "How to cite generative AI", "APA Style", "https://apastyle.apa.org",
    "APA publishes guidance on citing generative AI tools and disclosing their use.", "primary"),
  usStudent: s("usStudent", "Student visa (F-1) information", "U.S. Department of State", "https://travel.state.gov",
    "Official process for U.S. student visas: school-issued form, fee, interview, documents.", "primary"),
  ukStudent: s("ukStudent", "Student visa (UK)", "GOV.UK", "https://www.gov.uk/student-visa",
    "Official UK Student visa rules: sponsor confirmation, funds, English language, application steps.", "primary"),
  who: s("who", "World Health Organization health topics", "WHO", "https://www.who.int",
    "General, evidence-based health information; not a substitute for a clinician.", "primary"),
  nhs: s("nhs", "NHS health A to Z", "NHS (UK)", "https://www.nhs.uk",
    "Plain-language guidance on symptoms, self-care and when to seek medical help.", "primary"),
  whoMH: s("whoMH", "Mental health: strengthening our response", "WHO", "https://www.who.int/health-topics/mental-health",
    "Overview of mental health, common conditions, and how to seek support.", "primary"),
  telemanas: s("telemanas", "Tele-MANAS national mental health helpline", "Government of India", "https://telemanas.mohfw.gov.in",
    "Free national tele-mental-health service in India; check the site for current helpline numbers.", "primary"),
  sebi: s("sebi", "SEBI Investor portal", "SEBI", "https://investor.sebi.gov.in",
    "Regulator's investor education material, including mutual funds and SIPs.", "primary"),
  rbi: s("rbi", "RBI financial education", "Reserve Bank of India", "https://www.rbi.org.in",
    "RBI resources on banking, loans, credit and safe financial practice.", "primary"),
  cibil: s("cibil", "CIBIL credit score basics", "TransUnion CIBIL", "https://www.cibil.com",
    "Explains the 300-900 credit score, what affects it, and how to get your report.", "primary"),
  nist: s("nist", "AI Risk Management Framework", "NIST", "https://www.nist.gov/itl/ai-risk-management-framework",
    "Framework describing risks of AI systems, including inaccurate or fabricated outputs.", "primary"),
  googleAI: s("googleAI", "Gemini API: grounding with Google Search", "Google AI for Developers", "https://ai.google.dev",
    "Documents how grounding links model answers to web sources to improve factuality.", "primary"),
  learn: s("learn", "Evidence-based learning strategies", "Association for Psychological Science", "https://www.psychologicalscience.org",
    "Research summaries on retrieval practice and spaced repetition as effective study methods.", "secondary"),
  roadmap: s("roadmap", "Developer roadmaps", "roadmap.sh", "https://roadmap.sh",
    "Community-maintained learning paths for frontend, backend, DevOps and more.", "secondary"),
  mdn: s("mdn", "MDN Web Docs", "Mozilla", "https://developer.mozilla.org",
    "Reference documentation for HTML, CSS and JavaScript.", "primary"),
  cp: s("cp", "NPTEL courses", "IITs / IISc", "https://nptel.ac.in",
    "Free, IIT-created courses with optional certification exams.", "primary"),
  linkedin: s("linkedin", "LinkedIn profile tips", "LinkedIn", "https://www.linkedin.com/help/linkedin",
    "Guidance on building a complete profile that recruiters can find.", "secondary"),
  aicteInt: s("aicteInt", "AICTE Internship Portal", "AICTE", "https://internship.aicte-india.org",
    "Government portal listing internships for technical students.", "primary"),
  daad: s("daad", "Study in Germany", "DAAD", "https://www.daad.de/en",
    "Official German academic exchange service: programmes, scholarships, admission rules.", "primary"),
};

/* ------------------------------ HELPERS ------------------------------ */
const c = (
  text: string, confidence: Confidence, status: ClaimStatus, sourceIds: string[], note?: string
): KBClaim => ({ text, confidence, status, sourceIds, note });

/* ------------------------------- ENTRIES ------------------------------ */
export const KNOWLEDGE_BASE: KBEntry[] = [
  /* ===== GATE ===== */
  {
    id: "gate-3rd-year-eligibility",
    topic: "GATE eligibility",
    keywords: ["gate", "3rd year", "third year", "eligible", "eligibility", "apply", "pre final", "2027"],
    questions: [
      "Can I apply for GATE 2027 if I'm in my 3rd year?",
      "Am I eligible for GATE in third year of BTech?",
      "Who can appear for GATE?",
      "Can I apply for GATE if I am in 3rd year?",
      "Can third year engineering students write GATE?"
    ],
    directAnswer:
      "Yes, in general. GATE has allowed students in their 3rd year (third year) or higher of a bachelor's degree programme to appear [1], as well as those who already hold the degree. The catch for GATE 2027 is timing: registration opened in August-September 2026 and the deadlines (including the late-fee window) have most likely already passed [2], so if you missed it, your next realistic chance is the following GATE cycle.",
    details:
      "Eligibility rules are set in each year's information brochure, so always check the brochure for your degree and branch. Qualifying GATE does not by itself guarantee admission, a scholarship or a PSU job; each institute or organisation applies its own criteria.",
    claims: [
      c("Students in the third year or higher of a UG programme have been eligible to appear in GATE.", "high", "supported", ["gate27", "gateNews"], "Confirm exact wording and your branch in the 2027 brochure."),
      c("GATE 2027 is organised by IIT Madras.", "high", "supported", ["iitm", "gate27"]),
      c("GATE 2027 registration windows (including late fee) have likely closed as of November 2026.", "verify", "partial", ["gate27", "gateNews"], "Sources disagree on the final extended date (late Sept to early Oct 2026)."),
    ],
    uncertainties: [
      "Exact registration deadlines varied between news sources; only the official portal is authoritative.",
      "Your specific degree or branch may have extra conditions.",
    ],
    nextSteps: [
      "Open the official GATE 2027 portal and read the eligibility section of the brochure.",
      "If registration is closed, plan for the next GATE cycle and watch for its brochure release (usually July-August).",
    ],
    followUps: ["What are the GATE 2027 exam dates?", "How long is a GATE score valid?", "Should I do GATE or aim for placements?"],
    stakes: "high",
  },
  {
    id: "gate-2027-dates",
    topic: "GATE 2027 dates and organiser",
    keywords: ["gate 2027", "dates", "exam date", "schedule", "registration", "result", "iit madras", "organising"],
    questions: [
      "What are the GATE 2027 exam dates?",
      "Which IIT is conducting GATE 2027?",
      "When is the GATE 2027 result?",
    ],
    directAnswer:
      "IIT Madras is organising GATE 2027 [1]. The exam is scheduled over six days: 6, 7, 13, 14, 20 and 21 February 2027 [2], with results expected on 19 March 2027 [3]. Treat these as planned dates, because the official site states dates can change.",
    claims: [
      c("IIT Madras is the organising institute for GATE 2027.", "high", "supported", ["iitm", "gate27"]),
      c("Exam days are 6, 7, 13, 14, 20 and 21 February 2027.", "medium", "supported", ["gate27", "gateNews"], "Reported consistently across sources; confirm on the portal."),
      c("Results are expected on 19 March 2027.", "verify", "partial", ["gate27"], "Result dates are tentative until announced."),
    ],
    uncertainties: ["Dates are subject to change, and some sites wrongly list other institutes as organiser."],
    nextSteps: ["Check the official portal for the latest schedule.", "Download your admit card from GOAPS when released."],
    followUps: ["What is the GATE exam pattern?", "Which papers are there in GATE 2027?", "How long is a GATE score valid?"],
    stakes: "high",
  },
  {
    id: "gate-pattern-syllabus",
    topic: "GATE pattern and syllabus",
    keywords: ["gate", "pattern", "syllabus", "marks", "negative marking", "mcq", "msq", "nat", "papers"],
    questions: ["What is the GATE exam pattern?", "Is there negative marking in GATE?", "What is the GATE syllabus?"],
    directAnswer:
      "GATE is a computer-based test with around 30 papers, usually 3 hours long and carrying 100 marks [1]. Questions are a mix of multiple-choice (MCQ), multiple-select (MSQ) and numerical-answer (NAT) types, and a General Aptitude section is common to all papers. Negative marking applies to MCQs only [2]; MSQs and NATs have none. Each paper has its own syllabus listed in the brochure.",
    claims: [
      c("GATE 2027 is a CBT with about 30 test papers and a 3-hour duration.", "high", "supported", ["gate27"]),
      c("Question types are MCQ, MSQ and NAT; negative marking applies to MCQs.", "medium", "supported", ["gate27"], "Marking details can be revised; confirm in the 2027 brochure."),
      c("A new Robotics paper was reported for GATE 2027.", "medium", "partial", ["gateNews"], "Reported by news; verify in the brochure."),
    ],
    uncertainties: ["Marking scheme and syllabus can change between years."],
    nextSteps: ["Download your paper's syllabus from the official brochure.", "Practise with previous-year papers under timed conditions."],
    followUps: ["How should I prepare for GATE?", "Is GATE better than CAT for me?", "What can I do with a GATE score?"],
    stakes: "medium",
  },
  {
    id: "gate-score-uses",
    topic: "GATE score validity and uses",
    keywords: ["gate score", "validity", "valid", "mtech", "psu", "phd", "scholarship", "what after gate", "gate score validity period"],
    questions: ["How long is a GATE score valid?", "What can I do with a GATE score?", "Is GATE needed for PSU jobs?", "gate score validity period"],
    directAnswer:
      "A GATE score is valid for three years from the result date [1]. It is used for MTech/PhD admissions at IITs, NITs and other institutes, often with a monthly stipend for eligible candidates, and some PSUs use it for recruitment [2]. A good score opens doors but does not guarantee a seat or a job [3].",
    claims: [
      c("GATE scorecards are valid for three years.", "high", "supported", ["gate27"]),
      c("GATE scores are used for MTech/PhD admissions and some PSU recruitment.", "high", "supported", ["gate27", "gateNews"]),
      c("Each institute or PSU sets its own cut-offs and selection steps.", "high", "supported", ["gate27"]),
    ],
    uncertainties: ["PSU recruiting policies differ each year; not every PSU uses GATE every cycle."],
    nextSteps: ["Check the admissions page of the institute or PSU you are targeting.", "Track their GATE cut-off history."],
    followUps: ["Should I do MS abroad or MTech?", "What is the GATE exam pattern?", "How do I prepare for GATE?"],
    stakes: "medium",
  },
  {
    id: "gate-preparation",
    topic: "GATE preparation strategy",
    keywords: ["prepare", "preparation", "gate strategy", "how to study gate", "previous year", "mock test", "6 months", "prepare for gate cse in 6 months"],
    questions: ["How should I prepare for GATE?", "How many months do I need for GATE?", "Best strategy for GATE in 3rd year?", "how to prepare for gate cse in 6 months"],
    directAnswer:
      "Start with the official syllabus, build strong fundamentals in your core subjects, then practise previous-year questions and timed mock tests [1]. Many students spend 6-12 months, but it depends on your base and branch. Being in third year is an advantage because you can learn each subject alongside your college courses, and revise heavily in final year.",
    claims: [
      c("The official syllabus and previous-year papers are the most reliable guides for what to study.", "high", "supported", ["gate27"]),
      c("Retrieval practice and spaced repetition improve retention compared with passive re-reading.", "high", "supported", ["learn"]),
      c("6-12 months is a common preparation window, but it varies by person.", "low", "unverified", [], "Common student experience, not an official figure."),
    ],
    uncertainties: ["No single plan fits everyone; your branch and current level matter."],
    nextSteps: ["List your paper's subjects and rate your confidence in each.", "Schedule one timed mock test every 2 weeks."],
    followUps: ["Where can I find free GATE lectures?", "What is the GATE exam pattern?", "How do I make a study timetable?"],
    stakes: "low",
  },
  {
    id: "gate-vs-placement-vs-mba",
    topic: "GATE vs placements vs MBA",
    keywords: ["gate or placement", "gate vs cat", "mtech or job", "which path", "higher studies or job", "decision"],
    questions: ["Should I do GATE or aim for placements?", "GATE vs CAT which is better?", "Job or higher studies after BTech?"],
    directAnswer:
      "It depends on what you want in 5 years. GATE suits you if you want MTech, research, a PSU job or deep technical work; placements suit you if you want to start earning in industry quickly; CAT suits you if you are drawn to management [1]. You can keep options open: build core skills and projects for placements while preparing for one exam, instead of dropping everything for one path.",
    claims: [
      c("GATE, CAT and campus placements lead to different career routes (technical/research, management, industry).", "high", "supported", ["gate27", "catOff"]),
      c("Preparing for one exam alongside placements is feasible with a planned schedule.", "low", "unverified", [], "General advice, varies by student."),
    ],
    uncertainties: ["Salary and outcome comparisons vary widely by college, branch and year."],
    nextSteps: ["Write down your goal for 5 years from now, then pick the path that fits.", "Talk to 2-3 seniors who took each route."],
    followUps: ["What is CAT?", "How do I prepare for placements?", "MS abroad vs MTech?"],
    stakes: "medium",
  },

  /* ===== EXAMS ABROAD / MBA ===== */
  {
    id: "cat-basics",
    topic: "CAT basics",
    keywords: ["cat", "iim", "mba", "mba india", "varc", "dilr", "qa", "cat exam"],
    questions: ["What is CAT?", "Who can apply for CAT?", "What is the CAT exam pattern?"],
    directAnswer:
      "CAT (Common Admission Test) is the entrance exam conducted by the IIMs for MBA/PGDM admissions, and many other B-schools accept the score [1]. It tests three areas: Verbal Ability and Reading Comprehension, Data Interpretation and Logical Reasoning, and Quantitative Aptitude [2]. It is usually held once a year, around late November, and the score is valid for that admission cycle.",
    claims: [
      c("CAT is conducted by the IIMs and used for MBA/PGDM admissions.", "high", "supported", ["catOff"]),
      c("CAT has three sections: VARC, DILR and QA.", "high", "supported", ["catOff"]),
      c("Exact exam date, duration and eligibility change each year.", "verify", "partial", ["catOff"]),
    ],
    uncertainties: ["Pattern details and dates are set in each year's notification."],
    nextSteps: ["Read the latest CAT notification on the official site.", "Take a free mock test to see your baseline."],
    followUps: ["GATE or CAT, which is better?", "Do I need work experience for MBA?", "How do I prepare for CAT?"],
    stakes: "medium",
  },
  {
    id: "gre-basics",
    topic: "GRE basics",
    keywords: ["gre", "ets", "verbal", "quant", "awa", "ms abroad", "score"],
    questions: ["What is the GRE?", "Is GRE required for MS in the USA?", "How is GRE scored?"],
    directAnswer:
      "The GRE General Test, run by ETS, is a standardised exam used for graduate admissions abroad, mainly in the US [1]. It has Verbal Reasoning, Quantitative Reasoning and Analytical Writing sections, with Verbal and Quant each scored from 130 to 170. Many universities have made GRE optional or stopped requiring it [2], so check each programme.",
    claims: [
      c("GRE has Verbal, Quantitative and Analytical Writing sections; Verbal and Quant are scored 130-170.", "high", "supported", ["greOff"]),
      c("GRE scores are generally valid for five years.", "medium", "supported", ["greOff"]),
      c("Whether a programme requires GRE differs by university and by year.", "verify", "partial", ["greOff"]),
    ],
    uncertainties: ["Requirements change often; the programme website is the final authority."],
    nextSteps: ["Check the GRE policy on each target programme page.", "Take the official ETS practice test."],
    followUps: ["Is MS abroad worth it vs MTech?", "How do student visas work?", "How do I finance MS abroad?"],
    stakes: "medium",
  },
  {
    id: "gmat-basics",
    topic: "GMAT basics",
    keywords: ["gmat", "gmat focus", "mba abroad", "data insights"],
    questions: ["What is GMAT?", "GMAT vs GRE for MBA?", "How is GMAT Focus scored?"],
    directAnswer:
      "The GMAT is an exam used mainly for MBA and business master's admissions worldwide [1]. The current GMAT Focus Edition has Quantitative, Verbal and Data Insights sections, scored on a 205-805 scale [2]. Many business schools accept GRE as well, so check what your target schools prefer.",
    claims: [
      c("GMAT Focus has Quantitative, Verbal and Data Insights sections.", "high", "supported", ["gmatOff"]),
      c("GMAT Focus total scores range from 205 to 805.", "high", "supported", ["gmatOff"]),
      c("Many schools accept both GMAT and GRE.", "medium", "partial", ["gmatOff", "greOff"], "Varies by school."),
    ],
    uncertainties: ["Format and fees can change."],
    nextSteps: ["Check target schools' accepted tests.", "Try the official free GMAT practice material."],
    followUps: ["What is CAT?", "What is GRE?", "How do I finance an MBA abroad?"],
    stakes: "medium",
  },

  /* ===== CAREER / PLACEMENTS ===== */
  {
    id: "resume-tips",
    topic: "Resume tips for students",
    keywords: ["resume", "cv", "fresher", "ats", "resume tips", "projects", "ats friendly"],
    questions: ["How do I write a good resume as a fresher?", "What should a student resume include?", "Resume tips for placements", "How to make an ATS friendly resume for college placements?"],
    directAnswer:
      "Keep it to one page and put the strongest items first: education, projects, internships, skills, achievements [1]. For each project, state what you built, the tech you used and one measurable result (for example, 'cut load time by 40%'). Use a clean single-column layout, standard headings, and no photo or long paragraphs, which also keeps it readable by applicant tracking systems.",
    claims: [
      c("One-page, single-column resumes with standard headings are easiest for recruiters and ATS software to scan.", "medium", "supported", ["linkedin"], "Widely recommended practice."),
      c("Quantified results make project descriptions more convincing.", "medium", "partial", [], "General career-advice consensus."),
    ],
    uncertainties: ["Preferences vary by company and country."],
    nextSteps: ["Ask a senior or mentor to review your draft.", "Make sure every line on it is something you can explain in an interview."],
    followUps: ["How do I build a LinkedIn profile?", "How do I prepare for interviews?", "How do I get an internship?"],
    stakes: "low",
  },
  {
    id: "placement-prep",
    topic: "Campus placement preparation",
    keywords: ["placement", "campus", "prepare for placements", "aptitude", "coding round", "dsa", "company"],
    questions: ["How do I prepare for campus placements?", "What rounds are in placements?", "When should I start placement prep?"],
    directAnswer:
      "Most campus drives have an aptitude/online test, a coding or technical round, and HR/managerial interviews [1]. Start in third year: practise data structures and algorithms, revise core subjects (DBMS, OS, networks, your branch basics), build 2-3 solid projects, and practise aptitude and communication [2]. Consistent daily practice beats last-minute cramming.",
    claims: [
      c("Campus hiring typically includes an aptitude test, a technical round and an HR round.", "medium", "supported", [], "Common pattern; each company differs."),
      c("Core CS subjects and DSA are commonly tested for software roles.", "medium", "supported", ["roadmap"]),
    ],
    uncertainties: ["Each company's process and cut-offs differ and change yearly."],
    nextSteps: ["List the companies visiting your campus and read their past patterns.", "Set a daily 1-2 hour practice routine."],
    followUps: ["How do I learn DSA?", "How do I write a resume?", "How do I prepare for interviews?"],
    stakes: "medium",
  },
  {
    id: "internships",
    topic: "Finding internships",
    keywords: ["internship", "intern", "summer internship", "aicte internship", "get internship"],
    questions: ["How do I get an internship?", "Where can I find internships as a BTech student?", "Are internships necessary?"],
    directAnswer:
      "Look on your college placement cell, the AICTE internship portal, LinkedIn, and company career pages, and also reach out directly to startups and alumni with a short, specific email and a link to your projects [1]. Internships are not strictly necessary, but they give real experience and strongly help in placements.",
    claims: [
      c("The AICTE Internship Portal lists internships for technical students.", "high", "supported", ["aicteInt"]),
      c("Internships improve placement prospects.", "medium", "partial", [], "Common recruiter view, not guaranteed."),
    ],
    uncertainties: ["Be careful with 'paid to apply' internship offers; legitimate internships do not charge you to join."],
    nextSteps: ["Update your resume and GitHub, then apply to 5 internships a week.", "Verify any company before sharing documents or paying anything."],
    followUps: ["How do I write a resume?", "How do I build a GitHub profile?", "How do I prepare for interviews?"],
    stakes: "medium",
  },
  {
    id: "interview-prep",
    topic: "Interview preparation",
    keywords: ["interview", "hr interview", "technical interview", "tell me about yourself", "prepare interview"],
    questions: ["How do I prepare for interviews?", "How to answer 'tell me about yourself'?", "Common HR interview questions"],
    directAnswer:
      "For technical rounds, revise fundamentals and be ready to explain every project on your resume in depth [1]. For HR rounds, prepare a short 'about me' (who you are, what you have built, what you want next), examples of teamwork and failure, and why you want this company. Practise out loud or with a friend, because speaking clearly is a skill like any other [2].",
    claims: [
      c("Interviewers commonly probe the projects and skills listed on a resume.", "medium", "supported", [], "Common experience."),
      c("Practising answers aloud improves delivery.", "medium", "partial", ["learn"]),
    ],
    uncertainties: ["Formats vary by company and role."],
    nextSteps: ["Record yourself answering 5 common questions.", "Do one mock interview with a senior."],
    followUps: ["How do I write a resume?", "How do I learn DSA?", "How do I get internships?"],
    stakes: "low",
  },
  {
    id: "github-linkedin",
    topic: "GitHub and LinkedIn profile",
    keywords: ["github", "linkedin", "portfolio", "profile", "online presence"],
    questions: ["How do I build a GitHub profile?", "How do I make a good LinkedIn profile?", "Do recruiters check GitHub?"],
    directAnswer:
      "Keep 3-5 good projects pinned on GitHub, each with a clear README (what it does, screenshots, how to run it). On LinkedIn, add a professional photo, a headline that says what you do, your projects and skills, and connect with seniors and alumni [1]. Recruiters often look at both, but quality and clarity matter more than quantity.",
    claims: [
      c("A complete LinkedIn profile makes you easier for recruiters to find.", "medium", "supported", ["linkedin"]),
      c("A clear README makes a GitHub project far easier to evaluate.", "medium", "partial", [], "Widely recommended practice."),
    ],
    uncertainties: ["Not every recruiter checks these profiles."],
    nextSteps: ["Write a README for your best project today.", "Update your LinkedIn headline."],
    followUps: ["How do I write a resume?", "How do I get internships?", "Programming roadmap for beginners?"],
    stakes: "low",
  },
  {
    id: "cse-career",
    topic: "CSE career options",
    keywords: ["cse", "computer science", "software engineer", "career in cse", "data science", "web developer"],
    questions: ["What careers are there after CSE?", "Is CSE a good branch?", "CSE career options"],
    directAnswer:
      "CSE graduates can go into software development (web, mobile, backend), data science and machine learning, cybersecurity, cloud/DevOps, product or QA roles, or higher studies and research [1]. Pick one area, build projects in it, and learn the fundamentals deeply, since tools change but fundamentals stay.",
    claims: [
      c("CSE leads into software, data/AI, security, cloud and research roles.", "high", "supported", ["roadmap"]),
      c("Job demand and salaries change with the market and vary by company and location.", "high", "supported", [], "Verify with current job listings."),
    ],
    uncertainties: ["Hiring trends shift; check current data before deciding."],
    nextSteps: ["Pick one area for the next 3 months.", "Build and publish one project in it."],
    followUps: ["Programming roadmap for beginners?", "How do I learn DSA?", "GATE vs placements?"],
    stakes: "low",
  },
  {
    id: "ece-career",
    topic: "ECE career options",
    keywords: ["ece", "electronics", "vlsi", "embedded", "iot", "communication", "career in ece"],
    questions: ["What careers are there after ECE?", "Is ECE good for software jobs?", "ECE career options"],
    directAnswer:
      "ECE opens paths in VLSI and chip design, embedded systems, IoT, telecom and networking, signal processing, and also software roles if you add programming skills [1]. GATE is a popular route for core roles and PSUs [2]. Choose between core and software early, because the skills you build differ.",
    claims: [
      c("ECE graduates work in VLSI, embedded, telecom and also software.", "high", "supported", []),
      c("GATE is a common route into core ECE higher studies and PSUs.", "medium", "supported", ["gate27"]),
    ],
    uncertainties: ["Core job availability varies by region and year."],
    nextSteps: ["Do one embedded or VLSI mini-project.", "Learn a programming language alongside."],
    followUps: ["What is GATE?", "How do I prepare for placements?", "MS abroad vs MTech?"],
    stakes: "low",
  },
  {
    id: "mech-career",
    topic: "Mechanical career options",
    keywords: ["mechanical", "mech", "automobile", "design engineer", "cad", "manufacturing", "career in mechanical"],
    questions: ["What careers are there after mechanical engineering?", "Is mechanical a good branch?", "Mech career options"],
    directAnswer:
      "Mechanical engineers work in design (CAD/CAE), manufacturing, automotive, energy, HVAC, robotics and PSUs, and many move into data, product or management roles [1]. Learn tools like SolidWorks/AutoCAD/ANSYS, do hands-on projects, and consider GATE for PSUs and MTech [2].",
    claims: [
      c("Mechanical engineering leads to design, manufacturing, automotive, energy and robotics roles.", "high", "supported", []),
      c("GATE is widely used for PSU recruitment and MTech in mechanical streams.", "medium", "supported", ["gate27"]),
    ],
    uncertainties: ["Sector demand varies by region and economic conditions."],
    nextSteps: ["Learn one CAD tool and make a portfolio project.", "Look for factory or plant internships."],
    followUps: ["What is GATE?", "How do I get an internship?", "How do I write a resume?"],
    stakes: "low",
  },
  {
    id: "programming-roadmap",
    topic: "Programming roadmap",
    keywords: ["programming", "roadmap", "beginner", "learn coding", "start coding", "web development", "learn to code"],
    questions: ["Programming roadmap for beginners?", "How do I start learning to code?", "Which language should I learn first?"],
    directAnswer:
      "Start with one language (Python or JavaScript are good first choices), learn variables, control flow, functions and data structures, then build small projects [1]. After that, pick a direction: web (HTML, CSS, JavaScript, React), backend (APIs, databases), or data (Python, SQL, pandas). Building and finishing projects teaches more than watching tutorials.",
    claims: [
      c("Python and JavaScript are common beginner-friendly first languages.", "medium", "supported", ["roadmap"]),
      c("MDN is a reliable reference for HTML, CSS and JavaScript.", "high", "supported", ["mdn"]),
    ],
    uncertainties: ["The 'best' first language depends on your goal."],
    nextSteps: ["Choose a language and finish one small project in two weeks.", "Follow a structured roadmap rather than random videos."],
    followUps: ["How do I learn DSA?", "How do I build a GitHub profile?", "CSE career options?"],
    stakes: "low",
  },
  {
    id: "dsa-learning",
    topic: "Learning DSA",
    keywords: ["dsa", "data structures", "algorithms", "leetcode", "coding practice", "competitive programming"],
    questions: ["How do I learn DSA?", "How many LeetCode problems should I solve?", "DSA for placements"],
    directAnswer:
      "Learn each data structure (arrays, strings, linked lists, stacks, queues, trees, graphs, heaps, hash maps) and the key patterns (two pointers, sliding window, recursion, DP, BFS/DFS), then solve problems by topic [1]. There is no magic number of problems; consistent daily practice and understanding mistakes matters more than the count.",
    claims: [
      c("Pattern-based, topic-wise practice builds problem-solving skills more efficiently than random solving.", "medium", "partial", ["learn"]),
      c("There is no official required number of problems for interviews.", "high", "supported", [], "Varies by company."),
    ],
    uncertainties: ["Company interview difficulty varies a lot."],
    nextSteps: ["Pick one topic per week.", "After each problem, write down the pattern used."],
    followUps: ["How do I prepare for placements?", "Programming roadmap?", "How do I prepare for interviews?"],
    stakes: "low",
  },
  {
    id: "upskilling-courses",
    topic: "Online courses and certifications",
    keywords: ["course", "certification", "nptel", "coursera", "online course", "udemy", "worth it"],
    questions: ["Are online certifications worth it?", "Is NPTEL useful?", "Which online courses should I take?"],
    directAnswer:
      "Certificates help most when they come with real skills and a project you can show. NPTEL offers free IIT-made courses with optional proctored certification exams and can be useful for credits and GATE-relevant topics [1]. Recruiters care more about what you can build and explain than the number of certificates [2].",
    claims: [
      c("NPTEL offers free courses from IITs and IISc with optional certification exams.", "high", "supported", ["cp"]),
      c("Projects and demonstrable skills usually matter more than certificate count.", "medium", "partial", [], "Common recruiter view."),
    ],
    uncertainties: ["Value differs by employer and field."],
    nextSteps: ["Choose one course and finish it with a project.", "Check whether your college gives credits for NPTEL."],
    followUps: ["Programming roadmap?", "How do I build a GitHub profile?", "How do I get an internship?"],
    stakes: "low",
  },

  /* ===== HIGHER STUDIES / MONEY / VISA ===== */
  {
    id: "ms-abroad-vs-india",
    topic: "MS abroad vs studying in India",
    keywords: ["ms abroad", "study abroad", "ms in usa", "masters abroad", "abroad or india", "worth it"],
    questions: ["Is MS abroad worth it?", "MS abroad vs MTech in India?", "Should I study abroad after BTech?"],
    directAnswer:
      "MS abroad can offer strong research exposure and international careers, but it is expensive, requires careful planning, and outcomes depend on the university, field and job market [1]. MTech in India, especially via GATE at top institutes, is far cheaper and can be excellent for research or PSU routes. Decide using total cost, funding options, your goals and the post-study work rules of the country.",
    claims: [
      c("MS abroad typically costs much more than MTech in India, though assistantships and scholarships can offset it.", "medium", "supported", ["daad"]),
      c("Post-study work and visa rules differ by country and change over time.", "verify", "partial", ["usStudent", "ukStudent"]),
    ],
    uncertainties: ["Job outcomes, costs and immigration rules shift often; check current data."],
    nextSteps: ["Shortlist 8-10 programmes and compare total cost and funding.", "Talk to alumni from those programmes."],
    followUps: ["How do student visas work?", "How do I finance MS abroad?", "What is GRE?"],
    stakes: "high",
  },
  {
    id: "ms-vs-mtech",
    topic: "MS vs MTech",
    keywords: ["ms vs mtech", "mtech", "ms or mtech", "difference", "research"],
    questions: ["MS vs MTech which is better?", "What is the difference between MS and MTech?", "Should I do MTech?"],
    directAnswer:
      "MTech (in India) is usually a coursework-heavy degree, often entered through GATE, and may come with a stipend at government institutes [1]. MS abroad often has a stronger research or thesis option and international exposure, but costs more. Neither is automatically better; choose based on your goal (research, industry, PSU), budget and the specific programme.",
    claims: [
      c("MTech admissions at many Indian institutes use GATE scores.", "high", "supported", ["gate27"]),
      c("Funding and stipends differ by institute and programme.", "high", "supported", []),
    ],
    uncertainties: ["Programme quality varies far more than the degree label."],
    nextSteps: ["Compare 3 programmes of each type on curriculum, cost and placements.", "Check stipend rules at the institutes you like."],
    followUps: ["What can I do with a GATE score?", "MS abroad vs India?", "How do I finance higher studies?"],
    stakes: "medium",
  },
  {
    id: "scholarships-india",
    topic: "Scholarships for students in India",
    keywords: ["scholarship", "national scholarship portal", "nsp", "aicte pragati", "financial aid", "fee waiver"],
    questions: ["How do I find scholarships?", "What is the National Scholarship Portal?", "Scholarships for engineering students"],
    directAnswer:
      "The National Scholarship Portal (scholarships.gov.in) lists central and state scholarships [1], and AICTE and your own college also run schemes [2]. Eligibility usually depends on category, income, marks and course, and each scheme has its own deadline, so apply early with documents ready (income certificate, marksheets, bank details).",
    claims: [
      c("The National Scholarship Portal hosts many central and state scholarship applications.", "high", "supported", ["nsp"]),
      c("AICTE publishes scholarship schemes for technical students.", "high", "supported", ["aicte"]),
      c("Eligibility and deadlines change every year.", "verify", "partial", ["nsp", "aicte"]),
    ],
    uncertainties: ["Scholarship amounts and eligibility are revised often."],
    nextSteps: ["Create a profile on the portal and check schemes matching your category.", "Ask your college scholarship cell for deadlines."],
    followUps: ["How do education loans work?", "How do I finance MS abroad?", "What documents do I need?"],
    stakes: "high",
  },
  {
    id: "education-loan",
    topic: "Education loans in India",
    keywords: ["education loan", "student loan", "loan for study", "collateral", "interest", "emi", "moratorium", "vidya lakshmi"],
    questions: ["How do I get an education loan?", "Do I need collateral for an education loan?", "Is education loan a good idea?"],
    directAnswer:
      "Banks offer education loans for courses in India and abroad, and the Vidya Lakshmi portal lets you compare and apply to several banks at once [1]. Terms, collateral requirements, interest rates and repayment holidays differ by bank and loan size, so compare total cost before choosing [2]. Borrow only what you can realistically repay from your expected salary.",
    claims: [
      c("Vidya Lakshmi is a government portal to apply for education loans from multiple banks.", "high", "supported", ["vidya"]),
      c("Interest rates, collateral rules and moratorium periods vary by bank and amount.", "verify", "partial", ["rbi"]),
    ],
    uncertainties: ["Rates and government subsidy schemes change; ask banks for current terms."],
    nextSteps: ["Get written quotes from at least three banks.", "Calculate EMI against your expected starting salary."],
    followUps: ["How do I find scholarships?", "What is a credit score?", "How does a SIP work?"],
    stakes: "high",
  },
  {
    id: "student-visa-basics",
    topic: "Student visa basics",
    keywords: ["visa", "student visa", "f1", "f-1", "uk student visa", "i-20", "cas", "study permit"],
    questions: ["How do student visas work?", "What do I need for a US student visa?", "UK student visa requirements"],
    directAnswer:
      "In general you first get admission, then the university issues a document you need for the visa (for example the I-20 for a US F-1 visa or a CAS for the UK Student visa) [1, 2]. You then apply, show proof of funds and English ability if required, and may attend a biometric or interview step. Requirements, fees and processing times differ by country and change often, so follow only the official government page.",
    claims: [
      c("A US F-1 visa requires a school-issued I-20, a visa application and usually an interview.", "high", "supported", ["usStudent"]),
      c("The UK Student visa requires a confirmation of acceptance from a licensed sponsor and proof of funds.", "high", "supported", ["ukStudent"]),
      c("Rules, fees and timelines change frequently.", "verify", "partial", ["usStudent", "ukStudent"]),
    ],
    uncertainties: ["Immigration policy can change quickly; always check the official site and your university's international office."],
    nextSteps: ["Read your destination's official student-visa page.", "Beware of agents promising guaranteed visas."],
    followUps: ["MS abroad vs India?", "How do I finance MS abroad?", "What is GRE?"],
    stakes: "high",
  },

  /* ===== ACADEMIC INTEGRITY / AI USE ===== */
  {
    id: "academic-integrity",
    topic: "Academic integrity",
    keywords: ["academic integrity", "cheating", "malpractice", "ethics", "copying assignment", "honesty"],
    questions: ["What counts as academic dishonesty?", "Is it okay to copy assignments?", "What is academic integrity?"],
    directAnswer:
      "Academic integrity means doing your own work honestly and crediting others' ideas. Copying assignments, submitting others' work, fabricating data, cheating in exams or using tools your course forbids are all breaches and can lead to penalties from marks deductions to disciplinary action [1]. When unsure, ask your instructor what is allowed.",
    claims: [
      c("UGC has regulations to promote academic integrity and prevent plagiarism in Indian higher education.", "high", "supported", ["ugc"]),
      c("Permitted help differs by course; the instructor's policy is the rule that applies to you.", "high", "supported", []),
    ],
    uncertainties: ["Penalties depend on your institution's rules."],
    nextSteps: ["Read your college's academic-integrity policy.", "Ask your instructor if you are unsure about a tool or collaboration."],
    followUps: ["What counts as plagiarism?", "Can I use AI for assignments?", "How do I cite AI?"],
    stakes: "medium",
  },
  {
    id: "plagiarism",
    topic: "Plagiarism",
    keywords: ["plagiarism", "similarity", "turnitin", "copied", "paraphrase", "plagiarism percentage", "ugc plagiarism"],
    questions: ["What counts as plagiarism?", "What plagiarism percentage is allowed?", "How do I avoid plagiarism?"],
    directAnswer:
      "Plagiarism is presenting someone else's words, ideas or data as your own without credit [1]. Paraphrasing without citing is still plagiarism. The UGC 2018 regulations describe graded penalties by similarity level and treat a small similarity percentage as acceptable [2], but your institution's exact limits and exclusions may differ, so check your college's policy.",
    claims: [
      c("Presenting others' ideas or words without credit is plagiarism, even if paraphrased.", "high", "supported", ["ugc"]),
      c("UGC's 2018 regulations define similarity levels with escalating penalties.", "medium", "supported", ["ugc"], "Exact thresholds: confirm in the UGC document."),
    ],
    uncertainties: ["A low similarity score does not prove originality, and a high one is not always misconduct (quotes and references)."],
    nextSteps: ["Cite every source and use quotation marks for direct quotes.", "Run a similarity check before submission if your college provides one."],
    followUps: ["How do I cite AI?", "What is academic integrity?", "Can I use ChatGPT for my project?"],
    stakes: "medium",
  },
  {
    id: "citing-ai",
    topic: "Using and citing AI in coursework",
    keywords: ["cite ai", "citing chatgpt", "use ai assignment", "ai in college", "gemini assignment", "ai disclosure"],
    questions: ["How do I cite AI?", "Can I use ChatGPT for my assignment?", "Is using AI plagiarism?"],
    directAnswer:
      "First follow your course and college policy, since rules differ. Where AI use is allowed, disclose it and cite it using a style guide such as APA, which publishes guidance for generative AI [1]. Never present AI-generated text as entirely your own work, and verify any facts or references it gives you, because they can be wrong or invented [2].",
    claims: [
      c("APA Style publishes guidance on citing and disclosing generative AI.", "high", "supported", ["apaAI"]),
      c("AI tools can produce inaccurate or fabricated information, so outputs need verification.", "high", "supported", ["nist"]),
      c("Whether AI use is allowed depends on your instructor's and institution's policy.", "high", "supported", []),
    ],
    uncertainties: ["Citation formats are still evolving."],
    nextSteps: ["Check your syllabus or ask your instructor about AI rules.", "Keep a record of your prompts if disclosure is required."],
    followUps: ["How do I verify AI answers?", "Why do chatbots hallucinate?", "What counts as plagiarism?"],
    stakes: "medium",
  },

  /* ===== AI LITERACY ===== */
  {
    id: "ai-limitations",
    topic: "Limitations of AI chatbots",
    keywords: ["chatgpt", "limitations", "ai chatbot", "can ai be wrong", "trust ai", "llm", "mistakes"],
    questions: ["Can I trust ChatGPT answers?", "What are the limitations of AI chatbots?", "Can AI be wrong?"],
    directAnswer:
      "AI chatbots can sound confident while being wrong. They generate likely text from patterns, can lack current information, and may produce fabricated facts or sources [1]. They are useful for drafts, explanations and brainstorming, but for anything important (health, money, law, exams, deadlines) confirm with an authoritative source.",
    claims: [
      c("AI systems can generate inaccurate or fabricated outputs.", "high", "supported", ["nist"]),
      c("Grounding answers in web sources can improve factual accuracy but does not eliminate errors.", "medium", "supported", ["googleAI"]),
    ],
    uncertainties: ["Accuracy varies by model, topic and how recent the information is."],
    nextSteps: ["Cross-check key facts with an official source.", "Ask the chatbot to show sources, then open them."],
    followUps: ["How do I verify AI answers?", "Why do chatbots hallucinate?", "How should I cite AI?"],
    stakes: "medium",
  },
  {
    id: "verify-ai-answers",
    topic: "How to verify AI answers",
    keywords: ["verify", "fact check", "check ai", "verify answer", "how to verify", "is this true", "verify an ai answer"],
    questions: ["How do I verify AI answers?", "How can I fact-check a chatbot?", "How do I know if an AI answer is correct?", "How to verify an AI answer before trusting it?"],
    directAnswer:
      "Break the answer into individual claims, then check each against a primary source such as an official website, a regulation, a paper or a government page [1]. Be extra careful with numbers, dates, names, quotes and links, and for time-sensitive facts look for the current official notice. If you cannot find support for a claim, treat it as unverified.",
    claims: [
      c("Checking individual claims against primary sources is more reliable than judging an answer by how confident it sounds.", "high", "supported", ["nist"]),
      c("Numbers, dates and links are the most common places for AI errors.", "medium", "partial", ["nist"]),
    ],
    uncertainties: ["Even official pages can be outdated; check the date."],
    nextSteps: ["Open the cited source and confirm the claim appears there.", "For high-stakes topics, ask a human expert."],
    followUps: ["Can I trust ChatGPT?", "Why do chatbots hallucinate?", "How do I cite AI?"],
    stakes: "medium",
  },
  {
    id: "hallucination",
    topic: "AI hallucination",
    keywords: ["hallucination", "hallucinate", "made up", "fake sources", "fabricated", "fake citation"],
    questions: ["Why do chatbots hallucinate?", "What is an AI hallucination?", "Why does AI make up sources?"],
    directAnswer:
      "A hallucination is when an AI produces content that sounds plausible but is false, such as invented facts, quotes or references [1]. It happens because language models predict likely text rather than look up truth, and they may fill gaps with confident guesses. Grounding with real sources reduces it, but you should still verify important claims [2].",
    claims: [
      c("Language models can generate plausible but false statements, including non-existent references.", "high", "supported", ["nist"]),
      c("Source grounding can reduce but not remove such errors.", "medium", "supported", ["googleAI"]),
    ],
    uncertainties: ["Rates of hallucination differ by model and task."],
    nextSteps: ["Check that every cited link opens and actually says what is claimed.", "Prefer answers that show their sources."],
    followUps: ["How do I verify AI answers?", "Can I trust ChatGPT?", "Can I use AI for assignments?"],
    stakes: "low",
  },

  /* ===== HEALTH & WELLBEING (cautious) ===== */
  {
    id: "fever-basics",
    topic: "Fever and when to seek care",
    keywords: ["fever", "high temperature", "cold", "flu", "when to see doctor", "headache fever", "health basics"],
    questions: ["I have a fever, what should I do?", "When should I see a doctor for fever?", "Is fever dangerous?"],
    directAnswer:
      "A mild fever with a cold or flu often settles with rest and fluids [2], but this is general information and not a diagnosis. See a doctor promptly if the fever is very high, lasts more than about three days, or comes with trouble breathing, chest pain, severe headache, a stiff neck, confusion, a rash, dehydration, or if the person is a baby, elderly or has a long-term condition [1]. For medicines and doses, ask a pharmacist or doctor.",
    claims: [
      c("Persistent fever or fever with warning signs needs medical assessment.", "high", "supported", ["nhs", "who"]),
      c("Rest and fluids are standard self-care for mild viral illness.", "high", "supported", ["nhs"]),
    ],
    uncertainties: ["This cannot diagnose your condition; symptoms vary and fevers can have many causes."],
    nextSteps: ["Monitor symptoms and temperature, and rest and drink fluids.", "Contact a doctor or your campus health centre if symptoms worsen or are severe."],
    followUps: ["How much sleep do I need?", "How do I manage exam stress?", "When should I seek help for stress?"],
    stakes: "high",
  },
  {
    id: "sleep-exam",
    topic: "Sleep and exam performance",
    keywords: ["sleep", "all nighter", "exam sleep", "how much sleep", "night study", "tired"],
    questions: ["How much sleep do I need?", "Is all-night studying effective?", "Sleep before exams"],
    directAnswer:
      "Most adults need about 7-9 hours of sleep [1]. Sleep supports memory and concentration, so regularly skipping it before exams usually hurts more than the extra study time helps [2]. Aim for a steady schedule and revise earlier in the day rather than relying on all-nighters.",
    claims: [
      c("Adults generally need around 7-9 hours of sleep per night.", "high", "supported", ["nhs", "who"]),
      c("Sleep supports learning and memory consolidation.", "medium", "supported", ["learn"]),
    ],
    uncertainties: ["Individual needs vary; persistent sleep problems should be discussed with a clinician."],
    nextSteps: ["Set a fixed sleep and wake time this week.", "Move hard revision earlier in the day."],
    followUps: ["How do I manage exam stress?", "Best study techniques?", "How do I make a timetable?"],
    stakes: "medium",
  },
  {
    id: "stress-wellbeing",
    topic: "Managing stress and when to seek help",
    keywords: ["stress", "anxiety", "mental health", "overwhelmed", "burnout", "exam stress", "pressure", "counselling"],
    questions: ["How do I manage exam stress?", "I feel overwhelmed, what should I do?", "When should I seek help for stress?"],
    directAnswer:
      "Stress before exams is common. Helpful basics include regular sleep, movement, meals, breaking work into small tasks, and talking to someone you trust. If the feeling lasts for weeks, affects daily life, or you feel hopeless, please reach out to a counsellor, doctor or a helpline such as Tele-MANAS in India [1, 2]; you do not need to wait until it feels unbearable. If you feel you might harm yourself, contact local emergency services or a crisis line right away.",
    claims: [
      c("Persistent low mood or anxiety that affects daily functioning warrants professional support.", "high", "supported", ["whoMH"]),
      c("Tele-MANAS is a free national tele-mental-health service in India.", "medium", "supported", ["telemanas"], "Check the site for the current helpline number."),
    ],
    uncertainties: ["This is general information, not a diagnosis or treatment advice."],
    nextSteps: ["Talk to a friend, family member or your college counsellor today.", "Check the Tele-MANAS site for the current helpline number."],
    followUps: ["How much sleep do I need?", "Best study techniques?", "How do I make a study timetable?"],
    stakes: "high",
  },

  /* ===== MONEY BASICS ===== */
  {
    id: "sip-basics",
    topic: "SIP basics",
    keywords: ["sip", "mutual fund", "invest", "systematic investment plan", "investing", "start investing"],
    questions: ["How does a SIP work?", "Is SIP safe?", "Should students invest in mutual funds?"],
    directAnswer:
      "A SIP (Systematic Investment Plan) lets you invest a fixed amount in a mutual fund at regular intervals, such as monthly [1]. It spreads purchases over time, but returns are not guaranteed and your money can lose value, especially in the short term [2]. Build an emergency fund first, understand the fund's risk, and use regulated platforms. This is general information, not personal financial advice.",
    claims: [
      c("A SIP invests a fixed amount at regular intervals in a mutual fund.", "high", "supported", ["sebi"]),
      c("Mutual fund returns are not guaranteed and carry market risk.", "high", "supported", ["sebi"]),
    ],
    uncertainties: ["Past performance does not predict future returns."],
    nextSteps: ["Read SEBI's investor education material.", "Ask a SEBI-registered advisor for personal guidance."],
    followUps: ["How do I build an emergency fund?", "What is a credit score?", "How do education loans work?"],
    stakes: "high",
  },
  {
    id: "credit-score",
    topic: "Credit score basics",
    keywords: ["credit score", "cibil", "credit card", "credit report", "750", "build credit"],
    questions: ["What is a credit score?", "How do I build a credit score as a student?", "What is a good CIBIL score?"],
    directAnswer:
      "In India, a CIBIL credit score ranges from 300 to 900 and reflects how reliably you repay credit [1]. Scores around 750 and above are generally considered good by lenders [3]. Paying EMIs and card bills on time, keeping card usage low and not applying for many loans at once all help [2]. You can get your credit report from the credit bureaus.",
    claims: [
      c("CIBIL scores range from 300 to 900.", "high", "supported", ["cibil"]),
      c("Timely repayment and low credit utilisation improve credit scores.", "high", "supported", ["cibil", "rbi"]),
      c("A score of 750 or above is commonly viewed as good, but lenders set their own criteria.", "medium", "partial", ["cibil"]),
    ],
    uncertainties: ["Each lender uses its own approval criteria."],
    nextSteps: ["Check your free credit report periodically.", "Only borrow what you can repay on time."],
    followUps: ["How do education loans work?", "How do I save as a student?", "How does a SIP work?"],
    stakes: "medium",
  },
  {
    id: "student-budget",
    topic: "Budgeting and emergency fund for students",
    keywords: ["budget", "save money", "emergency fund", "pocket money", "student finance", "saving"],
    questions: ["How do I save money as a student?", "What is an emergency fund?", "How do I make a monthly budget?"],
    directAnswer:
      "Track what you spend for a month, split it into needs, wants and savings, and set a small automatic saving each month even if it is tiny. An emergency fund is money set aside for unexpected costs, commonly aimed at several months of essential expenses, and is built before risky investments [1]. Avoid unsafe loan apps and 'get rich quick' schemes [2].",
    claims: [
      c("An emergency fund covers unexpected expenses and should come before risky investing.", "high", "supported", ["rbi", "sebi"]),
      c("Unregulated lending apps can be harmful; use regulated lenders.", "high", "supported", ["rbi"]),
    ],
    uncertainties: ["Right savings targets depend on your situation."],
    nextSteps: ["Track expenses for 30 days.", "Set up a small recurring transfer to savings."],
    followUps: ["How does a SIP work?", "What is a credit score?", "How do education loans work?"],
    stakes: "medium",
  },

  /* ===== STUDY SKILLS ===== */
  {
    id: "study-techniques",
    topic: "Effective study techniques",
    keywords: ["study", "study techniques", "how to study", "memorise", "revision", "active recall", "spaced repetition"],
    questions: ["Best study techniques?", "How do I study effectively?", "How do I remember what I study?"],
    directAnswer:
      "The techniques with the best evidence are retrieval practice (testing yourself instead of re-reading), spaced repetition (reviewing at increasing intervals), and interleaving (mixing topics) [1]. Explain concepts in your own words and solve problems, not just highlight text [2]. Short, focused sessions with breaks beat long unfocused ones.",
    claims: [
      c("Retrieval practice and spaced repetition improve long-term retention.", "high", "supported", ["learn"]),
      c("Passive re-reading and highlighting are less effective than self-testing.", "high", "supported", ["learn"]),
    ],
    uncertainties: ["What works best varies by subject and person."],
    nextSteps: ["After each topic, close the book and write what you remember.", "Schedule revision at 1, 3 and 7 days."],
    followUps: ["How do I make a study timetable?", "How much sleep do I need?", "How do I prepare for GATE?"],
    stakes: "low",
  },
  {
    id: "time-management",
    topic: "Time management and timetables",
    keywords: ["timetable", "time management", "pomodoro", "procrastination", "schedule", "productivity", "focus"],
    questions: ["How do I make a study timetable?", "How do I stop procrastinating?", "What is the Pomodoro technique?"],
    directAnswer:
      "List your tasks and deadlines, put the hardest work in your most alert hours, and block fixed time for study, sleep, meals and rest. The Pomodoro technique uses about 25 minutes of focus followed by a 5-minute break [1]. Start with a tiny first step to beat procrastination [2], and review your plan weekly because plans need adjusting.",
    claims: [
      c("Pomodoro is a method of timed focus sessions with short breaks.", "high", "supported", [], "Widely documented technique."),
      c("Breaking tasks into small steps reduces the barrier to starting.", "medium", "partial", ["learn"]),
    ],
    uncertainties: ["Ideal session length differs by person."],
    nextSteps: ["Plan tomorrow tonight with 3 priorities.", "Try two Pomodoro sessions and adjust."],
    followUps: ["Best study techniques?", "How do I manage exam stress?", "How much sleep do I need?"],
    stakes: "low",
  },
  {
    id: "final-year-project",
    topic: "Final year project and research papers",
    keywords: ["final year project", "major project", "research paper", "read paper", "publish", "ieee", "project idea"],
    questions: ["How do I choose a final year project?", "How do I read a research paper?", "Should I publish a paper in BTech?"],
    directAnswer:
      "Pick a project that solves a real problem, is achievable in your timeframe and matches the skills you want to show; a smaller, finished and well-documented project beats an ambitious unfinished one [1]. To read a research paper, go abstract, then figures and conclusion, then introduction and methods, noting the problem, method and result. Publish only in genuine venues, and avoid paid 'quick publish' journals [2].",
    claims: [
      c("A finished, well-documented project is more valuable than an unfinished ambitious one.", "medium", "partial", [], "Common mentoring advice."),
      c("Predatory journals charge fees with little or no real peer review.", "high", "supported", ["ugc"], "UGC maintains its own list of approved journals; confirm there."),
    ],
    uncertainties: ["Your department may have its own rules for projects and publications."],
    nextSteps: ["Discuss 2-3 ideas with your guide early.", "Check venue legitimacy before submitting anywhere."],
    followUps: ["How do I build a GitHub profile?", "MS abroad vs MTech?", "Programming roadmap?"],
    stakes: "low",
  },
];

/* --------------------------- GENERIC FALLBACK --------------------------- */
export function genericFallback(question: string): KBEntry {
  return {
    id: "generic-fallback",
    topic: "General guidance",
    keywords: [],
    questions: [question],
    directAnswer:
      `I could not match this to a verified answer in our knowledge base right now, so I do not want to guess [1]. A reliable approach is to identify the official body or source that owns this information (an exam board, regulator, university or government site) and check it directly [1]. If you share a few more details, I can help you break your question into specific points to verify.`,
    claims: [
      {
        text: "Official sources are the most reliable place to confirm rules, dates, fees and eligibility.",
        confidence: "high",
        status: "supported",
        sourceIds: ["nist"],
      },
    ],
    uncertainties: ["This answer could not be verified live, and no matching verified entry was found."],
    nextSteps: ["Search for the official website of the organisation involved.", "Re-ask with more detail or try one of the suggested topics."],
    followUps: ["How do I verify AI answers?", "Can I apply for GATE if I'm in 3rd year?", "How do I prepare for placements?"],
    stakes: "medium",
  };
}

export function getHonestUnknownAnswer(question: string): TrustAnswer {
  return entryToTrustAnswer(genericFallback(question));
}

/* ------------------------------- MATCHER ------------------------------- */
const STOP = new Set(["the","a","an","is","are","i","me","my","in","on","of","to","for","do","does","can","how","what","if","it","and","or","be","am","should","with","about","at","you","your"]);
const norm = (t: string) =>
  t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w));

export function findBestEntry(question: string, threshold = 0.20): { entry: KBEntry; score: number } {
  const q = norm(question);
  const qSet = new Set(q);
  const qText = q.join(" ");
  let best: { entry: KBEntry; score: number } | null = null;

  for (const entry of KNOWLEDGE_BASE) {
    // keyword hits (phrase match weighted higher)
    let kw = 0;
    for (const k of entry.keywords) {
      const kn = norm(k).join(" ");
      if (kn && qText.includes(kn)) kw += kn.includes(" ") ? 2 : 1;
    }
    // best token overlap (Jaccard) against example questions
    let ov = 0;
    for (const ex of entry.questions) {
      const e = new Set(norm(ex));
      const inter = [...e].filter((w) => qSet.has(w)).length;
      const uni = new Set([...e, ...qSet]).size || 1;
      ov = Math.max(ov, inter / uni);
    }
    const score = Math.min(1, kw * 0.12) + ov * 0.7;
    if (!best || score > best.score) best = { entry, score };
  }
  if (best && best.score >= threshold) return best;
  return { entry: genericFallback(question), score: 0 };
}

/** Convert an entry into the shared TrustAnswer shape used by the UI. */
export function entryToTrustAnswer(entry: KBEntry): TrustAnswer {
  const used = new Map<string, KBSource>();
  entry.claims.forEach((cl) => cl.sourceIds.forEach((id) => SOURCES[id] && used.set(id, SOURCES[id])));
  const sourceList = [...used.values()];
  const idMap = new Map(sourceList.map((src, i) => [src.id, `S${i + 1}`]));
  return {
    provider: "offline" as const,
    directAnswer: entry.directAnswer,
    details: entry.details,
    claims: entry.claims.map((cl, i) => ({
      id: `C${i + 1}`,
      text: cl.text,
      confidence: cl.confidence,
      status: cl.status,
      sourceIds: cl.sourceIds.map((id) => idMap.get(id)!).filter(Boolean),
      note: cl.note,
    })),
    sources: sourceList.map((src) => ({
      id: idMap.get(src.id)!,
      title: src.title,
      publisher: src.publisher,
      url: src.url,
      domain: src.domain,
      snippet: src.snippet,
      type: src.type,
      retrievedAt: "2026-11-11",
    })),
    uncertainties: entry.uncertainties,
    nextSteps: entry.nextSteps,
    stakes: entry.stakes,
    followUps: entry.followUps,
  };
}

/**
 * Searches and returns a matching KnowledgeEntry answer or null if threshold is not met.
 */
export function findKnowledgeBaseMatch(query: string): TrustAnswer | null {
  const { entry, score } = findBestEntry(query);
  if (entry.id === "generic-fallback" || score === 0) {
    return null;
  }
  return entryToTrustAnswer(entry);
}

/**
 * Search offline knowledge base with fallback
 */
export function searchKnowledgeBase(query: string): TrustAnswer {
  const { entry } = findBestEntry(query);
  return entryToTrustAnswer(entry);
}

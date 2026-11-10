import { fileURLToPath } from 'node:url'
import { config } from './config.js'
import { openDb, tx } from './db.js'
import { hashPassword } from './lib/auth.js'
import { topicsService } from './services/topics.js'
import { usersService } from './services/users.js'

const SAMPLE = 'Sample date'
const SOURCES = [
  { key: 'brochure', title: 'GATE Information Brochure (sample entry)', type: 'Official brochure', publisher: 'Sample', isOfficial: true, trustScore: 90 },
  { key: 'a', title: 'Sample entry A (illustrative)', type: 'Mixed', publisher: 'Sample', isOfficial: false, trustScore: 50 },
  { key: 'b', title: 'Sample entry B (illustrative)', type: 'Mixed', publisher: 'Sample', isOfficial: false, trustScore: 50 }
]
const TOPICS = [
  { key: 'elig', name: 'Eligibility', subtitle: 'Who can apply', icon: 'cap', question: 'Can I apply for GATE 2027 if I’m in my 3rd year?',
    claim: '3rd-year students can apply for GATE 2027.', confidencePct: 86, confidenceLevel: 'High',
    explanation: 'The rule is stated clearly in one source, but 2027 rules aren’t published yet.',
    reasons: ['The rule appears in the eligibility section of the sample brochure.', 'Rules for 2027 are not yet published; this relies on earlier-cycle wording.', 'Only one source consulted, with no conflicting source found.'],
    answerHtml: 'Yes, <mark data-c>3rd-year students can apply for GATE 2027</mark>, as long as you meet the official eligibility criteria. <mark data-c>Final rules may change</mark> when the 2027 notification is released.',
    beforeYouAct: 'Do not submit a form or pay a fee until you have matched your degree, year and category with the official GATE 2027 notification.',
    evidence: [{ source: 'brochure', paragraph: 'Illustrative paraphrase: candidates in the third year of a qualifying degree programme may appear for the exam.', page: 'Page 4 (sample)', section: 'Eligibility' }] },
  { key: 'fee', name: 'Fee', subtitle: 'Costs & deadlines', icon: 'coin', question: 'How much is the GATE 2027 application fee?',
    claim: 'No fee information is available for GATE 2027.', confidencePct: 30, confidenceLevel: 'Low',
    explanation: 'No fee figure is available in the sample data.',
    reasons: ['The 2027 fee schedule is not published.', 'No source in the sample data states a fee.', 'Earlier-cycle fees may differ.'],
    answerHtml: '<mark data-c>No fee amount is available</mark> in the sample data. Check the official 2027 notification for the current schedule.',
    beforeYouAct: 'Do not pay any fee through a third-party site. Use only the official application portal.',
    noEvidenceNote: 'Nothing to show: no sample source covers fees.', evidence: [] },
  { key: 'conf', name: 'Conflict', subtitle: 'Sources disagree', icon: 'conflict', question: 'Two sources give different deadlines. Which is right?',
    claim: 'Sample sources give conflicting deadlines.', confidencePct: 55, confidenceLevel: 'Medium',
    explanation: 'Sources disagree, so confidence is reduced.',
    reasons: ['Two sample sources list different dates.', 'Neither source is marked as newer.', 'The official notification should settle it.'],
    answerHtml: '<mark data-c>The sources disagree</mark> and this sample can’t tell which is current. Treat the <mark data-c>official notification as the final word</mark>.',
    beforeYouAct: 'Do not rely on either date until you confirm it on the official website.',
    evidence: [
      { source: 'a', paragraph: 'Illustrative: entry A lists one date.', page: '—', section: 'Dates' },
      { source: 'b', paragraph: 'Illustrative: entry B lists a different date.', page: '—', section: 'Dates' }] },
  { key: 'unk', name: 'Unknown', subtitle: 'Not enough evidence', icon: 'help', question: 'Will GATE 2027 add a new paper?',
    claim: 'No evidence available.', confidencePct: 15, confidenceLevel: 'Low',
    explanation: 'No evidence supports any answer.',
    reasons: ['No sample source mentions new papers.', 'Announcements are not yet published.', 'Any answer would be speculation.'],
    answerHtml: '<mark data-c>TrustLens can’t answer this</mark> from the available evidence. Wait for the official announcement.',
    beforeYouAct: 'Be cautious of unofficial claims about new papers or changes.',
    noEvidenceNote: 'Nothing to show.', evidence: [] }
]
const CHECKLIST = ['Find the official source', 'Match degree, year and category', 'Compare published dates', 'Confirm before paying anything']

export async function seed(db) {
  const topics = topicsService(db)
  const users = usersService(db)
  tx(db, () => {
    if (!db.prepare('SELECT 1 FROM topics LIMIT 1').get()) {
      const ids = {}
      for (const s of SOURCES) ids[s.key] = topics.createSource(s)
      TOPICS.forEach((t, i) => {
        const row = topics.create({ ...t, sortOrder: i + 1 })
        for (const e of t.evidence) topics.attachEvidence(row.id, {
          sourceId: ids[e.source], paragraph: e.paragraph, page: e.page, section: e.section, publishedOn: SAMPLE, lastChecked: SAMPLE })
      })
    }
    if (!db.prepare('SELECT 1 FROM checklist_items LIMIT 1').get())
      CHECKLIST.forEach((label, i) => db.prepare('INSERT INTO checklist_items (label, position) VALUES (?, ?)').run(label, i))
  })
  if (config.adminEmail && config.adminPassword && !users.byEmail(config.adminEmail.toLowerCase())) {
    users.create({ email: config.adminEmail.toLowerCase(), name: 'Admin', passwordHash: await hashPassword(config.adminPassword), role: 'admin' })
    console.log(`[seed] admin account created for ${config.adminEmail}`)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = openDb(config.dbPath)
  await seed(db)
  console.log('[seed] done:', config.dbPath)
}

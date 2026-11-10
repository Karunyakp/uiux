import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'
import { marked } from 'marked'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const ARTIFACT_DIR = 'C:\\Users\\Karunyaayashu\\.gemini\\antigravity\\brain\\7eb51cfc-2267-4fea-9ad9-da27afa4c565'
const GUIDE_PATH = path.join(ARTIFACT_DIR, 'trustlens-sepm-viva-master-guide.md')
const OUTPUT_DIR = path.resolve('output')
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })

const OUTPUT_PDF_LOCAL = path.join(OUTPUT_DIR, 'TrustLens-SEPM-Viva-Master-Manual.pdf')
const OUTPUT_PDF_ARTIFACT = path.join(ARTIFACT_DIR, 'TrustLens-SEPM-Viva-Master-Manual.pdf')

async function main() {
  console.log('Reading master guide markdown...')
  const rawMd = fs.readFileSync(GUIDE_PATH, 'utf8')

  // Parse Markdown to HTML
  const parsedHtml = marked.parse(rawMd)

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TrustLens AI — SEPM (24CS51) Viva Master Manual</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1A2E3B;
      background: #FFFFFF;
      font-size: 11pt;
      line-height: 1.55;
      margin: 0;
      padding: 0;
    }

    /* Cover Page */
    .cover-page {
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 250mm;
      padding: 20mm 10mm 15mm 10mm;
      border: 3px double #102B46;
      border-radius: 4px;
      text-align: center;
      background: linear-gradient(180deg, #F9FBFC 0%, #FFFFFF 100%);
    }

    .cover-header {
      border-bottom: 2px solid #087F8C;
      padding-bottom: 15mm;
    }

    .college-name {
      font-size: 18pt;
      font-weight: 800;
      color: #102B46;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin: 0 0 6px 0;
    }

    .dept-name {
      font-size: 13pt;
      font-weight: 600;
      color: #087F8C;
      letter-spacing: 0.02em;
      margin: 0 0 4px 0;
    }

    .affil-name {
      font-size: 9.5pt;
      color: #556980;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0;
    }

    .cover-title-group {
      margin: 25mm 0;
    }

    .badge-label {
      display: inline-block;
      padding: 4px 14px;
      background: #E4F4EF;
      color: #087F8C;
      border: 1px solid #BCE5DB;
      border-radius: 20px;
      font-size: 10pt;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    .doc-main-title {
      font-size: 26pt;
      font-weight: 800;
      color: #102B46;
      margin: 0 0 10px 0;
      line-height: 1.2;
    }

    .doc-subtitle {
      font-size: 13pt;
      font-weight: 500;
      color: #36566F;
      max-width: 550px;
      margin: 0 auto;
      line-height: 1.45;
    }

    .cover-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      text-align: left;
      background: #F4F8FA;
      border: 1px solid #DCE5EC;
      border-radius: 8px;
      padding: 18px 24px;
      margin-bottom: 10mm;
    }

    .meta-box h4 {
      font-size: 9.5pt;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #718398;
      margin: 0 0 6px 0;
    }

    .meta-box p {
      font-size: 11pt;
      font-weight: 600;
      color: #102B46;
      margin: 0 0 4px 0;
    }

    .meta-box span {
      font-size: 9.5pt;
      color: #36566F;
      display: block;
    }

    .cover-footer {
      border-top: 1px solid #DCE5EC;
      padding-top: 8mm;
      font-size: 9.5pt;
      color: #718398;
    }

    /* Content Styling */
    h1 {
      font-size: 19pt;
      font-weight: 800;
      color: #102B46;
      border-bottom: 2px solid #087F8C;
      padding-bottom: 6px;
      margin-top: 24pt;
      margin-bottom: 14pt;
      page-break-after: avoid;
    }

    h2 {
      font-size: 14.5pt;
      font-weight: 700;
      color: #102B46;
      border-left: 4px solid #087F8C;
      padding-left: 10px;
      margin-top: 20pt;
      margin-bottom: 10pt;
      page-break-after: avoid;
    }

    h3 {
      font-size: 12pt;
      font-weight: 700;
      color: #087F8C;
      margin-top: 14pt;
      margin-bottom: 6pt;
      page-break-after: avoid;
    }

    h4 {
      font-size: 11pt;
      font-weight: 700;
      color: #102B46;
      margin-top: 12pt;
      margin-bottom: 4pt;
      page-break-after: avoid;
    }

    p {
      margin-top: 0;
      margin-bottom: 8pt;
      text-align: justify;
    }

    ul, ol {
      margin-top: 0;
      margin-bottom: 10pt;
      padding-left: 20px;
    }

    li {
      margin-bottom: 4pt;
    }

    b, strong {
      font-weight: 700;
      color: #102B46;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12pt 0;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }

    th {
      background: #102B46;
      color: #FFFFFF;
      font-weight: 600;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #102B46;
    }

    td {
      padding: 7px 10px;
      border: 1px solid #DCE5EC;
      vertical-align: top;
    }

    tr:nth-child(even) td {
      background: #F8FAFB;
    }

    /* Callouts & Quotes */
    blockquote {
      margin: 10pt 0;
      padding: 10px 16px;
      background: #F4F8FA;
      border-left: 4px solid #087F8C;
      border-radius: 0 6px 6px 0;
      color: #1E384F;
      font-size: 10pt;
      page-break-inside: avoid;
    }

    blockquote strong {
      color: #087F8C;
    }

    /* Code blocks */
    pre {
      background: #F4F7F9;
      border: 1px solid #D6E2E9;
      border-radius: 6px;
      padding: 10px 14px;
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: 8.5pt;
      line-height: 1.45;
      overflow-x: auto;
      margin: 10pt 0;
      page-break-inside: avoid;
      color: #102B46;
    }

    code {
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: 9pt;
      background: #EDF3F7;
      padding: 2px 5px;
      border-radius: 4px;
      color: #087F8C;
    }

    pre code {
      background: transparent;
      padding: 0;
      color: inherit;
    }

    /* Question-Answer Card Container */
    .qa-box {
      border: 1px solid #DCE5EC;
      border-left: 3.5px solid #087F8C;
      background: #FFFFFF;
      border-radius: 6px;
      padding: 10px 14px;
      margin: 10pt 0;
      page-break-inside: avoid;
    }

    .qa-title {
      font-weight: 700;
      color: #102B46;
      font-size: 11pt;
      margin-bottom: 6px;
    }

    /* Print Utilities */
    .avoid-break {
      page-break-inside: avoid;
    }

    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>

  <!-- COVER PAGE -->
  <div class="cover-page">
    <div class="cover-header">
      <div class="college-name">East Point College of Engineering &amp; Technology</div>
      <div class="dept-name">Department of Computer Science &amp; Engineering</div>
      <div class="affil-name">Autonomous Scheme Affiliated to VTU | Accredited by NAAC (A Grade) &amp; NBA</div>
    </div>

    <div class="cover-title-group">
      <span class="badge-label">Course Code: 24CS51 / BCS501</span>
      <h1 class="doc-main-title">TRUSTLENS AI</h1>
      <div class="doc-subtitle">Product-Based Comprehensive Technical Viva-Voce &amp; Project Evaluation Manual</div>
    </div>

    <div class="cover-meta-grid">
      <div class="meta-box">
        <h4>Subject Faculty &amp; Evaluators</h4>
        <p>Prof. Madhu Shree R</p>
        <span>Assistant Professor, Dept. of CSE</span>
        <p style="margin-top: 6px;">Dr. Chandramouli H / Dr. Pavan</p>
        <span>Associate Professor / Professor, Dept. of CSE</span>
      </div>

      <div class="meta-box">
        <h4>Student Candidate &amp; Course</h4>
        <p>V Semester B.E. (Computer Science)</p>
        <span>Academic Year: 2026 – 2027</span>
        <p style="margin-top: 6px;">Product: TrustLens AI</p>
        <span>Evidence-Aware AI Verification Engine</span>
      </div>
    </div>

    <div class="cover-footer">
      Covers Module 1 (SE Fundamentals &amp; Process Models), Module 2 (Agility &amp; XP Practice), and Module 3 (Project Management &amp; Control).
    </div>
  </div>

  <!-- DOCUMENT BODY -->
  <div class="main-content">
    ${parsedHtml}
  </div>

</body>
</html>`

  console.log('Launching browser via Microsoft Edge...')
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  })

  try {
    const page = await browser.newPage()
    await page.setContent(fullHtml, { waitUntil: 'load', timeout: 30000 })

    console.log('Rendering vector PDF with running header and footer...')
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '18mm',
        bottom: '18mm',
        left: '16mm',
        right: '16mm'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-family: 'Inter', sans-serif; font-size: 8pt; color: #718398; width: 100%; padding: 0 16mm; display: flex; justify-content: space-between; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">
          <span>EAST POINT COLLEGE OF ENGINEERING & TECHNOLOGY (EPCET) — DEPT OF CSE</span>
          <span>SEPM (24CS51) · TRUSTLENS AI VIVA MANUAL</span>
        </div>
      `,
      footerTemplate: `
        <div style="font-family: 'Inter', sans-serif; font-size: 8pt; color: #718398; width: 100%; padding: 0 16mm; display: flex; justify-content: space-between; border-top: 1px solid #E2E8F0; padding-top: 4px;">
          <span>Confidential — Candidate Viva Examination Prep</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `
    })

    fs.writeFileSync(OUTPUT_PDF_LOCAL, pdfBuffer)
    fs.writeFileSync(OUTPUT_PDF_ARTIFACT, pdfBuffer)

    console.log(`✅ Success! Viva PDF created:
  - ${OUTPUT_PDF_LOCAL} (${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB)
  - ${OUTPUT_PDF_ARTIFACT}`)
  } finally {
    await browser.close()
  }
}

main().catch(err => {
  console.error('Error generating PDF:', err)
  process.exit(1)
})

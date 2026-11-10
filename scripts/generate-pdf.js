import puppeteer from 'puppeteer-core'
import { PDFDocument } from 'pdf-lib'
import fs from 'node:fs'
import path from 'node:path'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const OUTPUT_DIR = path.resolve('output')
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })

async function generate() {
  console.log('Launching browser...')
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars']
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })

  const pdfDoc = await PDFDocument.create()

  async function addScreenshotPage(title, action, { fullPage = false } = {}) {
    console.log(`Capturing: ${title}...`)
    await action()
    await page.evaluate(() => document.fonts.ready)
    await new Promise(r => setTimeout(r, 600))

    const shotBuffer = await page.screenshot({ fullPage, type: 'png' })
    const img = await pdfDoc.embedPng(shotBuffer)
    const { width, height } = img.scale(0.5) // Adjust for deviceScaleFactor: 2

    const pdfPage = pdfDoc.addPage([width, height])
    pdfPage.drawImage(img, {
      x: 0,
      y: 0,
      width,
      height
    })
  }

  // 1. Landing Page (Full Tall View - exact same as Page 1 in user's prompt)
  await page.goto('http://localhost:5173/#/landing', { waitUntil: 'networkidle0' })
  await addScreenshotPage('Landing Page - Full', async () => {
    await page.goto('http://localhost:5173/#/landing', { waitUntil: 'networkidle0' })
  }, { fullPage: true })

  // 2. Landing Page - Hero Presentation View (16:10 slide)
  await addScreenshotPage('Landing Page - Hero View', async () => {
    await page.evaluate(() => window.scrollTo(0, 0))
  })

  // 3. Landing Page - Answer Types & Checklist (16:10 slide)
  await addScreenshotPage('Landing Page - Answer Types & Checklist', async () => {
    await page.evaluate(() => {
      const el = document.getElementById('answer-types')
      if (el) el.scrollIntoView({ behavior: 'instant' })
    })
  })

  // 4. Sign In Page (Default state - exact same as Page 2)
  await addScreenshotPage('Sign In Page', async () => {
    await page.goto('http://localhost:5173/#/signin', { waitUntil: 'networkidle0' })
    await page.evaluate(() => {
      const emailInput = document.getElementById('signin-email')
      if (emailInput) emailInput.value = 'you@example.com'
    })
  })

  // 5. Sign In Page (Error state - exact same as Page 3)
  await addScreenshotPage('Sign In Page - Error State', async () => {
    await page.goto('http://localhost:5173/#/signin', { waitUntil: 'networkidle0' })
    await page.evaluate(() => {
      const emailInput = document.getElementById('signin-email')
      const pwInput = document.getElementById('signin-password')
      if (emailInput) {
        emailInput.value = 'karunya@example.com'
        emailInput.dispatchEvent(new Event('input', { bubbles: true }))
      }
      if (pwInput) {
        pwInput.value = 'wrongpassword'
        pwInput.dispatchEvent(new Event('input', { bubbles: true }))
      }
    })
    // Submit form to trigger error banner
    await page.click('button.auth-submit-btn')
    await new Promise(r => setTimeout(r, 800))
  })

  // 6. Create Account Page (exact same as Page 4)
  await addScreenshotPage('Create Account Page', async () => {
    await page.goto('http://localhost:5173/#/register', { waitUntil: 'networkidle0' })
  })

  // 7. Interactive Dashboard - Home Topic View (GATE Eligibility)
  await addScreenshotPage('Dashboard - Home View', async () => {
    await page.goto('http://localhost:5173/#/app', { waitUntil: 'networkidle0' })
    await new Promise(r => setTimeout(r, 600))
  })

  // 8. Interactive Dashboard - Accessibility & Display Panel (matching uploaded design)
  await addScreenshotPage('Dashboard - Accessibility & Display Open', async () => {
    await page.evaluate(() => {
      const a11yBtn = document.querySelector('.a11y-trigger-btn, .a11y-btn')
      if (a11yBtn) a11yBtn.click()
    })
    await new Promise(r => setTimeout(r, 600))
  })

  // 9. Interactive Dashboard - Light Theme Mode
  await addScreenshotPage('Dashboard - Light Theme Mode', async () => {
    await page.evaluate(() => {
      const lightBtn = Array.from(document.querySelectorAll('.a11y-theme-btn')).find(b => b.textContent.includes('Light'))
      if (lightBtn) lightBtn.click()
    })
    await new Promise(r => setTimeout(r, 600))
  })

  // 10. Switch back to Dark Theme and test Verification Hub
  await addScreenshotPage('Dashboard - Verification Hub', async () => {
    await page.evaluate(() => {
      const darkBtn = Array.from(document.querySelectorAll('.a11y-theme-btn')).find(b => b.textContent.includes('Dark'))
      if (darkBtn) darkBtn.click()
      // Close a11y panel if open
      const closeBtn = document.querySelector('.a11y-close-btn')
      if (closeBtn) closeBtn.click()
      const btn = Array.from(document.querySelectorAll('.nav button')).find(b => b.textContent.includes('Verification Hub'))
      if (btn) btn.click()
    })
    await new Promise(r => setTimeout(r, 500))
  })

  // 11. Interactive Dashboard - Explore Topics
  await addScreenshotPage('Dashboard - Explore Topics', async () => {
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.nav button')).find(b => b.textContent.includes('Explore Topics'))
      if (btn) btn.click()
    })
    await new Promise(r => setTimeout(r, 500))
  })

  // Save the complete combined PDF
  const pdfBytes = await pdfDoc.save()
  const pdfPath = path.join(OUTPUT_DIR, 'TrustLens-Complete-UI.pdf')
  fs.writeFileSync(pdfPath, pdfBytes)
  console.log(`PDF successfully generated at: ${pdfPath} (${(pdfBytes.length / 1024 / 1024).toFixed(2)} MB)`)

  // Also create a separate PDF containing specifically the 4 pages from the user prompt
  const fourPagesDoc = await PDFDocument.create()
  const copiedPages = await fourPagesDoc.copyPages(pdfDoc, [0, 3, 4, 5])
  copiedPages.forEach(p => fourPagesDoc.addPage(p))
  const fourPagesBytes = await fourPagesDoc.save()
  const fourPagesPath = path.join(OUTPUT_DIR, 'TrustLens-Design-Pages.pdf')
  fs.writeFileSync(fourPagesPath, fourPagesBytes)
  console.log(`Design pages PDF generated at: ${fourPagesPath}`)

  await browser.close()
}

generate().catch(err => {
  console.error('Error generating PDF:', err)
  process.exit(1)
})

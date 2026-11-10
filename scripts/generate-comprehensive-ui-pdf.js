import puppeteer from 'puppeteer-core'
import { PDFDocument, rgb } from 'pdf-lib'
import fs from 'node:fs'
import path from 'node:path'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const ARTIFACT_DIR = 'C:\\Users\\Karunyaayashu\\.gemini\\antigravity\\brain\\7eb51cfc-2267-4fea-9ad9-da27afa4c565'
const OUTPUT_DIR = path.resolve('output')
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })

async function generate() {
  console.log('Launching browser for comprehensive UI PDF generation...')
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 })
  page.setDefaultTimeout(40000)

  const pdfDoc = await PDFDocument.create()

  async function addScreenshotPage(title, action, { fullPage = false } = {}) {
    console.log(`Capturing: ${title}...`)
    try {
      await action()
      await page.evaluate(() => document.fonts.ready)
      await new Promise(r => setTimeout(r, 600))

      const shotBuffer = await page.screenshot({ fullPage, type: 'png' })
      const img = await pdfDoc.embedPng(shotBuffer)
      const scaledWidth = img.width / 1.5
      const scaledHeight = img.height / 1.5

      const pdfPage = pdfDoc.addPage([scaledWidth, scaledHeight])
      pdfPage.drawImage(img, {
        x: 0,
        y: 0,
        width: scaledWidth,
        height: scaledHeight
      })
      console.log(`Added: ${title} (${scaledWidth.toFixed(0)}x${scaledHeight.toFixed(0)})`)
    } catch (err) {
      console.error(`Error capturing ${title}:`, err)
    }
  }

  // Initial load
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
  await new Promise(r => setTimeout(r, 800))

  async function goToRoute(hash) {
    await page.evaluate(h => {
      window.location.hash = h
    }, hash)
    await new Promise(r => setTimeout(r, 600))
  }

  // 1. Landing Page - Full View
  await goToRoute('#/landing')
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light')
    localStorage.setItem('trustlens_a11y_settings', JSON.stringify({
      theme: 'light',
      colorBlind: false,
      largeText: false,
      dyslexicFont: false,
      calmMotion: false,
      focusMode: false
    }))
  })
  await new Promise(r => setTimeout(r, 600))
  await addScreenshotPage('Landing Page — Full Complete View (With Back to Dashboard Button)', async () => {}, { fullPage: true })

  // 2. Sign In Page
  await addScreenshotPage('Sign In Page — With Back to Home Button', async () => {
    await goToRoute('#/signin')
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light')
      const emailInput = document.getElementById('signin-email')
      if (emailInput) emailInput.value = 'karunya@example.com'
    })
  })

  // 3. Create Account Page
  await addScreenshotPage('Create Account / Register Page — With Back to Sign In Button', async () => {
    await goToRoute('#/register')
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light')
    })
  })

  // 4. Dashboard — State A: New Chat Empty State
  await addScreenshotPage('Dashboard — State A: Fresh New Chat Workspace (ChatGPT Style)', async () => {
    await goToRoute('#/app')
    await page.evaluate(() => {
      localStorage.setItem('trustlens_a11y_settings', JSON.stringify({
        theme: 'light',
        colorBlind: false,
        largeText: false,
        dyslexicFont: false,
        calmMotion: false,
        focusMode: false
      }))
      document.documentElement.setAttribute('data-theme', 'light')
      const newChatBtn = document.querySelector('.newchat')
      if (newChatBtn) newChatBtn.click()
    })
    await new Promise(r => setTimeout(r, 600))
  })

  // 5. Dashboard — Composer File Attachment Tray
  await addScreenshotPage('Dashboard — Composer File Attachment Tray & Upload Preview', async () => {
    const testPdfPath = path.join(process.cwd(), 'scripts', 'test-files', 'Official_Guidelines_2026.pdf')
    const fileInput = await page.$('input[type="file"]')
    if (fileInput && fs.existsSync(testPdfPath)) {
      await fileInput.uploadFile(testPdfPath)
      await new Promise(r => setTimeout(r, 600))
    }
  })

  // 6. Dashboard — Animated AI Message Loading Indicator (TrustLens Verification Pulse)
  await addScreenshotPage('Dashboard — Verification Pulse Animated Loader (Light Mode)', async () => {
    const textarea = await page.$('.composer-textarea')
    if (textarea) {
      await textarea.type('What are the official eligibility requirements for third-year candidates?')
      await new Promise(r => setTimeout(r, 300))
      const sendBtn = await page.$('.composer-send-btn')
      if (sendBtn) await sendBtn.click()
    }
    // Capture immediately while loader is active
    await new Promise(r => setTimeout(r, 800))
  })

  // 7. Dashboard — Active Calibrated AI Response with 7 Action Buttons & Evidence
  await addScreenshotPage('Dashboard — Active Response (7 Action Toolbar Buttons & Evidence)', async () => {
    await page.waitForFunction(() => {
      const bubbles = document.querySelectorAll('.assistant-card')
      const last = bubbles[bubbles.length - 1]
      return last && !last.classList.contains('pending-card') && document.querySelectorAll('.v-pulse-card').length === 0
    }, { timeout: 25000 }).catch(() => {})
    await new Promise(r => setTimeout(r, 2000))
  })

  // 8. Dashboard — Report Issue Modal with 5 Categories
  await addScreenshotPage('Dashboard — Report an Issue Dialog (5 Categories + Details)', async () => {
    const actButtons = await page.$$('.assistant-card-actions .act-btn')
    if (actButtons.length >= 7) {
      await actButtons[6].click() // Report
      await new Promise(r => setTimeout(r, 600))
    }
  })

  // 9. Dashboard — Header More Options Dropdown
  await addScreenshotPage('Dashboard — Header More Options Menu (Export, Clear, Delete, Transcript)', async () => {
    // Close report first
    const closeReport = await page.$('.report-close-x')
    if (closeReport) await closeReport.click()
    await new Promise(r => setTimeout(r, 400))
    const moreBtn = await page.$('.conv-more-btn')
    if (moreBtn) await moreBtn.click()
    await new Promise(r => setTimeout(r, 500))
  })

  // 10. Dashboard — Accessibility & Display Settings Modal
  await addScreenshotPage('Dashboard — Accessibility & Display Settings Modal', async () => {
    const closeMore = await page.$('.conv-more-btn')
    if (closeMore) await closeMore.click()
    await new Promise(r => setTimeout(r, 300))
    const a11yBtn = await page.$('.a11y-header-btn')
    if (a11yBtn) await a11yBtn.click()
    await new Promise(r => setTimeout(r, 600))
  })

  // 11. Dashboard — User Profile & Statistics Modal
  await addScreenshotPage('Dashboard — User Profile & Account Statistics Modal', async () => {
    const closeA11y = await page.$('.a11y-close-btn')
    if (closeA11y) await closeA11y.click()
    await new Promise(r => setTimeout(r, 400))
    const profileBtn = await page.$('.side-user-info')
    if (profileBtn) await profileBtn.click()
    await new Promise(r => setTimeout(r, 600))
  })

  // 12. Dashboard — Settings & Data Management Modal
  await addScreenshotPage('Dashboard — Application Settings & Data Management Modal', async () => {
    const closeProfile = await page.$('.modal-close-btn')
    if (closeProfile) await closeProfile.click()
    await new Promise(r => setTimeout(r, 400))
    const settingsBtn = await page.$('.side-settings-btn')
    if (settingsBtn) await settingsBtn.click()
    await new Promise(r => setTimeout(r, 600))
  })

  // 13. Dashboard — Saved Answers & Audit History View
  await addScreenshotPage('Dashboard — Saved Answers & Audit History View', async () => {
    const closeSettings = await page.$('.modal-close-btn')
    if (closeSettings) await closeSettings.click()
    await new Promise(r => setTimeout(r, 400))
    const navButtons = Array.from(await page.$$('.side-nav-item'))
    for (const b of navButtons) {
      const text = await page.evaluate(el => el.textContent, b)
      if (text.includes('Saved Answers')) {
        await b.click()
        break
      }
    }
    await new Promise(r => setTimeout(r, 600))
  })

  // 14. Dashboard — Verification Hub View
  await addScreenshotPage('Dashboard — Verification Hub (Interactive Checklist & Progress)', async () => {
    const navButtons = Array.from(await page.$$('.side-nav-item'))
    for (const b of navButtons) {
      const text = await page.evaluate(el => el.textContent, b)
      if (text.includes('Verification Hub')) {
        await b.click()
        break
      }
    }
    await new Promise(r => setTimeout(r, 600))
  })

  // 15. Dashboard — Explore Topics View
  await addScreenshotPage('Dashboard — Explore Topics View', async () => {
    const navButtons = Array.from(await page.$$('.side-nav-item'))
    for (const b of navButtons) {
      const text = await page.evaluate(el => el.textContent, b)
      if (text.includes('Explore Topics')) {
        await b.click()
        break
      }
    }
    await new Promise(r => setTimeout(r, 600))
  })

  // 16. Dashboard — Interactive Feedback Form
  await addScreenshotPage('Dashboard — Interactive Feedback Form (5-Star Rating & Categories)', async () => {
    const navButtons = Array.from(await page.$$('.side-nav-item'))
    for (const b of navButtons) {
      const text = await page.evaluate(el => el.textContent, b)
      if (text.includes('Feedback')) {
        await b.click()
        break
      }
    }
    await new Promise(r => setTimeout(r, 600))
  })

  // 17. Dashboard — Verification Pulse Loader in Dark Mode (#102B46)
  await addScreenshotPage('Dashboard — Verification Pulse Loader (Dark Mode #102B46 Reference Match)', async () => {
    const backBtn = await page.$('.subview-back-btn')
    if (backBtn) await backBtn.click()
    await new Promise(r => setTimeout(r, 400))
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark')
    })
    await new Promise(r => setTimeout(r, 500))

    const textareaDark = await page.$('.composer-textarea')
    if (textareaDark) {
      await textareaDark.type('Is there any age limitation for general candidates?')
      await new Promise(r => setTimeout(r, 300))
      const sendBtn = await page.$('.composer-send-btn')
      if (sendBtn) await sendBtn.click()
    }
    await new Promise(r => setTimeout(r, 900))
  })

  // 18. Dashboard — OLED Pure Black Dark Mode
  await addScreenshotPage('Dashboard — OLED Pure Black Dark Mode (#000000)', async () => {
    await page.waitForFunction(() => {
      return document.querySelectorAll('.v-pulse-card').length === 0
    }, { timeout: 25000 }).catch(() => {})
    await new Promise(r => setTimeout(r, 1500))
  })

  const pdfBytes = await pdfDoc.save()
  const outPath1 = path.join(OUTPUT_DIR, 'TrustLens-Complete-UI.pdf')
  const outPath2 = path.join(ARTIFACT_DIR, 'TrustLens-Complete-UI.pdf')

  fs.writeFileSync(outPath1, pdfBytes)
  fs.writeFileSync(outPath2, pdfBytes)

  console.log(`\n🎉 Comprehensive PDF successfully saved to:\n  - ${outPath1}\n  - ${outPath2}`)
  await browser.close()
}

generate().catch(err => {
  console.error('PDF Generation failed:', err)
  process.exit(1)
})

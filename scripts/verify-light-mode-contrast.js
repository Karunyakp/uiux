import puppeteer from 'puppeteer-core'
import fs from 'fs'
import path from 'path'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const ARTIFACTS_DIR = 'C:\\Users\\Karunyaayashu\\.gemini\\antigravity\\brain\\7eb51cfc-2267-4fea-9ad9-da27afa4c565'

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// Convert rgb/rgba string to luminance
function getLuminance(rgbStr) {
  const match = rgbStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!match) return 1.0
  const [r, g, b] = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])].map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function getContrast(fg, bg) {
  const l1 = getLuminance(fg)
  const l2 = getLuminance(bg)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return ((lighter + 0.05) / (darker + 0.05)).toFixed(2)
}

async function run() {
  console.log('=== STARTING TRUSTLENS LIGHT MODE CONTRAST & VISIBILITY AUDIT ===')
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })
  }

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })

  console.log('1. Loading application in Light Mode...')
  await page.goto('http://localhost:5173/#/app', { waitUntil: 'networkidle2' })
  await sleep(1500)

  // Force Light Mode via data-theme attribute
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light')
  })
  await sleep(600)

  // Reset to clean new chat
  const newChatBtn = await page.$('.newchat')
  if (newChatBtn) await newChatBtn.click()
  await sleep(600)

  console.log('2. Inspecting Light Mode computed styles and WCAG contrast ratios...')
  const auditResults = await page.evaluate(() => {
    function getCss(sel) {
      const el = document.querySelector(sel)
      if (!el) return null
      const st = window.getComputedStyle(el)
      return {
        color: st.color,
        backgroundColor: st.backgroundColor,
        borderColor: st.borderColor,
        fontWeight: st.fontWeight,
        fontSize: st.fontSize
      }
    }

    return {
      sidebarBg: window.getComputedStyle(document.querySelector('.side')).backgroundColor,
      logoText: getCss('.side-brand-title'),
      logoTagline: getCss('.side-brand-tagline'),
      navLabel: getCss('.side-nav-item span'),
      navActive: getCss('.side-nav-item.is-active'),
      searchPlaceholder: window.getComputedStyle(document.querySelector('.side-search-input')).color,
      searchBg: window.getComputedStyle(document.querySelector('.side-search-input')).backgroundColor,
      searchBorder: window.getComputedStyle(document.querySelector('.side-search-input')).borderColor,
      dateLabel: getCss('.side-group-label'),
      convTitle: getCss('.side-conv-title'),
      guestName: getCss('.side-user-fullname'),
      guestPlan: getCss('.side-user-plan'),
      headerTitle: getCss('.conv-main-title'),
      headerSubtitle: getCss('.conv-subtitle-row'),
      headerActionBtn: getCss('.conv-action-btn'),
      headerA11yBtn: getCss('.a11y-header-btn'),
      headerSignInBtn: getCss('.conv-signin-btn'),
      welcomeHeading: getCss('.welcome-heading'),
      welcomeSubheading: getCss('.welcome-subheading'),
      composerCapsule: getCss('.composer-capsule'),
      composerTextarea: getCss('.composer-textarea'),
      evidenceHeading: getCss('.ev-minimal-title'),
      evidenceDesc: getCss('.ev-minimal-desc')
    }
  })

  console.log('\n--- AUDIT RESULTS (LIGHT MODE) ---')
  console.log('Sidebar Background:', auditResults.sidebarBg)
  console.log('Logo Text Color:', auditResults.logoText?.color, '-> Contrast on Sidebar:', getContrast(auditResults.logoText?.color || '', auditResults.sidebarBg) + ':1')
  console.log('Logo Tagline Color:', auditResults.logoTagline?.color, '-> Contrast on Sidebar:', getContrast(auditResults.logoTagline?.color || '', auditResults.sidebarBg) + ':1')
  console.log('Nav Label Color:', auditResults.navLabel?.color, '-> Contrast on Sidebar:', getContrast(auditResults.navLabel?.color || '', auditResults.sidebarBg) + ':1')
  console.log('Active Nav Bg/Color:', auditResults.navActive?.backgroundColor, auditResults.navActive?.color, '-> Contrast:', getContrast(auditResults.navActive?.color || '', auditResults.navActive?.backgroundColor || '') + ':1')
  console.log('Search Input Bg/Color:', auditResults.searchBg, auditResults.searchBorder)
  console.log('Guest Name Color:', auditResults.guestName?.color, '-> Contrast on Sidebar:', getContrast(auditResults.guestName?.color || '', auditResults.sidebarBg) + ':1')
  console.log('Header Title Color:', auditResults.headerTitle?.color)
  console.log('Header Subtitle Color:', auditResults.headerSubtitle?.color)
  console.log('Header Action Button Bg/Color/Border:', auditResults.headerActionBtn?.backgroundColor, auditResults.headerActionBtn?.color, auditResults.headerActionBtn?.borderColor)
  console.log('Composer Capsule Bg/Border:', auditResults.composerCapsule?.backgroundColor, auditResults.composerCapsule?.borderColor)
  console.log('Evidence Heading Color:', auditResults.evidenceHeading?.color)
  console.log('Evidence Desc Color:', auditResults.evidenceDesc?.color)

  // Capture Full Light Mode Empty State Overview
  console.log('\n3. Capturing Light Mode Dashboard Overview...')
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'light_mode_dashboard_overview.png') })

  // Send a question to capture active message state
  console.log('4. Submitting a question to capture active conversation state in Light Mode...')
  const textarea = await page.$('.composer-textarea')
  if (textarea) {
    await textarea.type('What is the eligibility requirement for GATE 2027 third-year candidates?')
    await sleep(300)
    const sendBtn = await page.$('.composer-send-btn')
    if (sendBtn) await sendBtn.click()
  }

  // Wait for AI response to complete
  await page.waitForFunction(() => {
    const bubbles = document.querySelectorAll('.assistant-card')
    const last = bubbles[bubbles.length - 1]
    return last && !last.querySelector('.v-pulse-card')
  }, { timeout: 30000 })
  await sleep(1500)

  // Inspect Active Conversation Text Colors
  const activeConversationAudit = await page.evaluate(() => {
    const getCss = sel => {
      const el = document.querySelector(sel)
      return el ? window.getComputedStyle(el) : null
    }
    return {
      userBubbleBg: getCss('.user-msg-bubble')?.backgroundColor,
      userBubbleText: getCss('.user-msg-text')?.color,
      userBubbleTime: getCss('.user-msg-time')?.color,
      assistantCardBg: getCss('.assistant-card')?.backgroundColor,
      assistantName: getCss('.assistant-name')?.color,
      assistantBody: getCss('.assistant-answer-body')?.color,
      metricSubtext: getCss('.metric-subtext')?.color,
      evidenceCardBg: getCss('.ev-source-card')?.backgroundColor,
      evidenceCardTitle: getCss('.ev-source-title')?.color,
      evidenceCardPub: getCss('.ev-source-publisher')?.color,
      selectedClaimQuote: getCss('.ev-claim-quote')?.color
    }
  })

  console.log('\n--- ACTIVE CONVERSATION AUDIT (LIGHT MODE) ---')
  console.log('User Bubble Bg:', activeConversationAudit.userBubbleBg, 'Text:', activeConversationAudit.userBubbleText, '-> Contrast:', getContrast(activeConversationAudit.userBubbleText || '', activeConversationAudit.userBubbleBg || '') + ':1')
  console.log('Assistant Body Color:', activeConversationAudit.assistantBody, 'on Card Bg:', activeConversationAudit.assistantCardBg, '-> Contrast:', getContrast(activeConversationAudit.assistantBody || '', activeConversationAudit.assistantCardBg || '') + ':1')
  console.log('Selected Claim Quote:', activeConversationAudit.selectedClaimQuote)
  console.log('Evidence Source Title:', activeConversationAudit.evidenceCardTitle, 'Publisher:', activeConversationAudit.evidenceCardPub)

  console.log('5. Capturing Light Mode Active Conversation & Evidence Screenshots...')
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'light_mode_workspace_and_messages.png') })

  // Capture isolated crops / regions for clear verification
  const sidebarEl = await page.$('.side')
  if (sidebarEl) {
    await sidebarEl.screenshot({ path: path.join(ARTIFACTS_DIR, 'light_mode_sidebar_contrast.png') })
  }

  const headerEl = await page.$('.conv-header')
  if (headerEl) {
    await headerEl.screenshot({ path: path.join(ARTIFACTS_DIR, 'light_mode_header_buttons.png') })
  }

  const evidenceEl = await page.$('.ev')
  if (evidenceEl) {
    await evidenceEl.screenshot({ path: path.join(ARTIFACTS_DIR, 'light_mode_evidence_panel.png') })
  }

  // 6. Switch to Dark Mode to verify Dark Mode is preserved properly
  console.log('\n6. Switching to Dark Mode to verify Theme Toggle and preservation...')
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
  })
  await sleep(1000)

  const darkModeAudit = await page.evaluate(() => {
    const getCss = sel => {
      const el = document.querySelector(sel)
      return el ? window.getComputedStyle(el) : null
    }
    return {
      mainBg: getCss('.workspace-central')?.backgroundColor,
      sidebarBg: getCss('.side')?.backgroundColor,
      cardBg: getCss('.assistant-card')?.backgroundColor,
      assistantBody: getCss('.assistant-answer-body')?.color,
      userBubbleBg: getCss('.user-msg-bubble')?.backgroundColor,
      userBubbleText: getCss('.user-msg-text')?.color,
      headerTitle: getCss('.conv-main-title')?.color,
      evidenceBg: getCss('.ev')?.backgroundColor
    }
  })

  console.log('Dark Mode Main Bg:', darkModeAudit.mainBg)
  console.log('Dark Mode Sidebar Bg:', darkModeAudit.sidebarBg)
  console.log('Dark Mode Card Bg:', darkModeAudit.cardBg)
  console.log('Dark Mode Assistant Text:', darkModeAudit.assistantBody)
  console.log('Dark Mode User Bubble Text:', darkModeAudit.userBubbleText)

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'dark_mode_preserved_dashboard.png') })

  // Switch back to Light Mode as Default
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light')
  })
  await sleep(500)

  await browser.close()
  console.log('=== VERIFICATION COMPLETED SUCCESSFULLY ===')
}

run().catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})

import puppeteer from 'puppeteer-core'
import path from 'path'
import fs from 'fs'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const ARTIFACTS_DIR = 'C:\\Users\\Karunyaayashu\\.gemini\\antigravity\\brain\\7eb51cfc-2267-4fea-9ad9-da27afa4c565'

async function verify() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new'
  })
  const page = await browser.newPage()

  const scenarios = [
    { name: 'desktop_light', width: 1366, height: 768, theme: 'light', file: 'signin_polished_desktop_1366_light.png' },
    { name: 'desktop_dark', width: 1366, height: 768, theme: 'dark', file: 'signin_polished_desktop_1366_dark.png' },
    { name: 'mobile_light', width: 390, height: 844, theme: 'light', file: 'signin_polished_mobile_390_light.png' },
    { name: 'mobile_dark', width: 390, height: 844, theme: 'dark', file: 'signin_polished_mobile_390_dark.png' }
  ]

  const results = []

  for (const s of scenarios) {
    await page.setViewport({ width: s.width, height: s.height, deviceScaleFactor: 2 })
    await page.goto('http://localhost:5173/#/signin', { waitUntil: 'networkidle0' })

    // Set theme
    await page.evaluate((th) => {
      document.documentElement.setAttribute('data-theme', th)
      localStorage.setItem('trustlens_theme', th)
    }, s.theme)

    await new Promise(r => setTimeout(r, 600))

    const metrics = await page.evaluate(() => {
      const nav = document.querySelector('.auth-top-nav-bar')
      const title = document.querySelector('.auth-title')
      const card = document.querySelector('.auth-card')
      const img = document.querySelector('.auth-inspection-img')
      const disc = document.querySelector('.auth-disc')
      const featureCards = document.querySelectorAll('.auth-feature-card')
      const googleBtn = document.querySelector('.auth-google-btn')
      const guestBtn = document.querySelector('.auth-guest-btn')
      const submitBtn = document.querySelector('.auth-submit-btn')
      const createAccLink = document.querySelector('.auth-switch-link')
      const scrollWidth = document.documentElement.scrollWidth
      const clientWidth = document.documentElement.clientWidth

      const navRect = nav ? nav.getBoundingClientRect() : null
      const titleRect = title ? title.getBoundingClientRect() : null
      const imgRect = img ? img.getBoundingClientRect() : null
      const cardRect = card ? card.getBoundingClientRect() : null

      return {
        hasHorizontalScroll: scrollWidth > clientWidth,
        scrollWidth,
        clientWidth,
        navBottom: navRect ? navRect.bottom : null,
        titleTop: titleRect ? titleRect.top : null,
        imgWidth: imgRect ? imgRect.width : null,
        imgHeight: imgRect ? imgRect.height : null,
        cardWidth: cardRect ? cardRect.width : null,
        cardHeight: cardRect ? cardRect.height : null,
        featureCardCount: featureCards.length,
        disclaimerText: disc ? disc.textContent.trim() : null,
        hasGoogleBtn: !!googleBtn,
        hasGuestBtn: !!guestBtn,
        hasSubmitBtn: !!submitBtn,
        hasCreateAccLink: !!createAccLink,
        googleBtnText: googleBtn ? googleBtn.innerText.trim() : null
      }
    })

    const filePath = path.join(ARTIFACTS_DIR, s.file)
    await page.screenshot({ path: filePath, fullPage: s.width < 500 })

    results.push({ scenario: s.name, metrics, screenshot: s.file })
  }

  await browser.close()
  console.log(JSON.stringify(results, null, 2))
}

verify().catch(console.error)

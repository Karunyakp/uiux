import puppeteer from 'puppeteer-core'
import path from 'path'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const ARTIFACT_DIR = 'C:\\Users\\Karunyaayashu\\.gemini\\antigravity\\brain\\7eb51cfc-2267-4fea-9ad9-da27afa4c565'

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const page = await browser.newPage()

  // 1. Desktop 1366x768 Light Mode
  await page.setViewport({ width: 1366, height: 768 })
  await page.goto('http://localhost:5173/#/signin', { waitUntil: 'load' })
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light')
    document.documentElement.setAttribute('data-theme-preference', 'light')
  })
  await new Promise(r => setTimeout(r, 600))
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'signin_current_desktop_light.png') })

  // 2. Desktop 1366x768 Dark Mode
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
    document.documentElement.setAttribute('data-theme-preference', 'dark')
  })
  await new Promise(r => setTimeout(r, 600))
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'signin_current_desktop_dark.png') })

  // 3. Mobile 390x844 Light Mode
  await page.setViewport({ width: 390, height: 844 })
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light')
    document.documentElement.setAttribute('data-theme-preference', 'light')
  })
  await new Promise(r => setTimeout(r, 600))
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'signin_current_mobile_light.png') })

  await browser.close()
  console.log('Current screenshots captured!')
}

capture().catch(console.error)

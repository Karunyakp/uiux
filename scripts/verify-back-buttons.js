import puppeteer from 'puppeteer-core'
import path from 'path'

const artifactDir = 'C:\\Users\\Karunyaayashu\\.gemini\\antigravity\\brain\\7eb51cfc-2267-4fea-9ad9-da27afa4c565'
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function run() {
  console.log('Testing Back Buttons across all pages...')
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })

  // 1. Landing Page
  console.log('1. Testing Landing Page back button...')
  await page.goto('http://localhost:5173/#/landing', { waitUntil: 'domcontentloaded' })
  await sleep(1000)
  const landingShot = path.join(artifactDir, 'page_landing_with_back_btn.png')
  await page.screenshot({ path: landingShot })
  console.log(`Saved Landing Page: ${landingShot}`)

  // 2. Sign In Page
  console.log('2. Testing Sign In Page back button...')
  await page.goto('http://localhost:5173/#/signin', { waitUntil: 'domcontentloaded' })
  await sleep(1000)
  const signinShot = path.join(artifactDir, 'page_signin_with_back_btn.png')
  await page.screenshot({ path: signinShot })
  console.log(`Saved Sign In Page: ${signinShot}`)

  // 3. Create Account Page
  console.log('3. Testing Create Account Page back button...')
  await page.goto('http://localhost:5173/#/register', { waitUntil: 'domcontentloaded' })
  await sleep(1000)
  const registerShot = path.join(artifactDir, 'page_register_with_back_btn.png')
  await page.screenshot({ path: registerShot })
  console.log(`Saved Create Account Page: ${registerShot}`)

  // 4. Explore Topics View
  console.log('4. Testing Explore Topics view back button...')
  await page.goto('http://localhost:5173/#/app', { waitUntil: 'domcontentloaded' })
  await sleep(1000)
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
    const btn = Array.from(document.querySelectorAll('.side-nav-item')).find(b => b.textContent.includes('Explore Topics'))
    if (btn) btn.click()
  })
  await sleep(800)
  const exploreShot = path.join(artifactDir, 'page_explore_with_back_btn.png')
  await page.screenshot({ path: exploreShot })
  console.log(`Saved Explore Topics: ${exploreShot}`)

  // 5. Verification Hub View
  console.log('5. Testing Verification Hub view back button...')
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.side-nav-item')).find(b => b.textContent.includes('Verification Hub'))
    if (btn) btn.click()
  })
  await sleep(800)
  const hubShot = path.join(artifactDir, 'page_hub_with_back_btn.png')
  await page.screenshot({ path: hubShot })
  console.log(`Saved Verification Hub: ${hubShot}`)

  // 6. Test clicking back button from Verification Hub to return to Home/Chat
  console.log('6. Testing clicking back button...')
  await page.click('.subview-back-btn')
  await sleep(800)
  const homeAfterBackShot = path.join(artifactDir, 'page_home_returned_via_back.png')
  await page.screenshot({ path: homeAfterBackShot })
  console.log(`Saved Home after Back: ${homeAfterBackShot}`)

  await browser.close()
  console.log('All page back button verifications completed successfully!')
}

run().catch(err => {
  console.error('Error running verification:', err)
  process.exit(1)
})

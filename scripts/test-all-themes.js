import puppeteer from 'puppeteer-core'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

async function run() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1366, height: 768, deviceScaleFactor: 1.5 })

  // Helper to set theme
  async function setTheme(theme) {
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t)
      localStorage.setItem('trustlens_theme', t)
    }, theme)
    await new Promise(r => setTimeout(r, 400))
  }

  // 1. Landing Page - Dark
  await page.goto('http://localhost:5173/#/landing', { waitUntil: 'networkidle0' })
  await setTheme('dark')
  await page.screenshot({ path: 'output/landing_dark.png' })
  console.log('Saved landing_dark.png')

  // 2. Landing Page - Light
  await setTheme('light')
  await page.screenshot({ path: 'output/landing_light.png' })
  console.log('Saved landing_light.png')

  // 3. Sign In Page - Dark
  await page.goto('http://localhost:5173/#/signin', { waitUntil: 'networkidle0' })
  await setTheme('dark')
  await page.screenshot({ path: 'output/signin_dark.png' })
  console.log('Saved signin_dark.png')

  // 4. Sign In Page - Light
  await setTheme('light')
  await page.screenshot({ path: 'output/signin_light.png' })
  console.log('Saved signin_light.png')

  // 5. Dashboard - Dark
  await page.goto('http://localhost:5173/#/app', { waitUntil: 'networkidle0' })
  await setTheme('dark')
  await page.screenshot({ path: 'output/dashboard_dark.png' })
  console.log('Saved dashboard_dark.png')

  // 6. Dashboard - Light
  await setTheme('light')
  await page.screenshot({ path: 'output/dashboard_light.png' })
  console.log('Saved dashboard_light.png')

  await browser.close()
  console.log('All screenshots captured successfully!')
}

run().catch(console.error)

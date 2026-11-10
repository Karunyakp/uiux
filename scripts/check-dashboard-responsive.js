import puppeteer from 'puppeteer-core'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

async function check() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new'
  })
  const page = await browser.newPage()

  for (const w of [1440, 1024, 768, 390]) {
    await page.setViewport({ width: w, height: 800 })
    await page.goto('http://localhost:5173/#/app', { waitUntil: 'load' })
    await new Promise(r => setTimeout(r, 600))

    const info = await page.evaluate(() => {
      const app = document.querySelector('.app-three-col')
      if (!app) return { error: 'No .app-three-col found' }
      const side = document.querySelector('.side')
      const ws = document.querySelector('.workspace-central, .workspace-col')
      const ev = document.querySelector('.ev')

      return {
        gridTemplateColumns: window.getComputedStyle(app).gridTemplateColumns,
        appWidth: app.getBoundingClientRect().width,
        sideWidth: side ? side.getBoundingClientRect().width : null,
        sideDisplay: side ? window.getComputedStyle(side).display : null,
        wsWidth: ws ? ws.getBoundingClientRect().width : null,
        evWidth: ev ? ev.getBoundingClientRect().width : null,
        evDisplay: ev ? window.getComputedStyle(ev).display : null,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      }
    })
    console.log(`[Width ${w}px]:`, info)
  }

  await browser.close()
}

check().catch(console.error)

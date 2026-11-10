import puppeteer from 'puppeteer-core'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

async function testChat() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto('http://localhost:5173/#/app', { waitUntil: 'domcontentloaded' })
  await new Promise(r => setTimeout(r, 2000))

  await page.type('.composer-textarea', 'What is Python programming?')
  await page.click('.composer-send-btn')

  // Check state every 2 seconds for 16 seconds
  for (let i = 0; i < 8; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const status = await page.evaluate(() => {
      const msgs = document.querySelectorAll('.chat-msg')
      const texts = Array.from(msgs).map(m => m.innerText.slice(0, 100))
      return { msgCount: msgs.length, texts }
    })
    console.log(`[T+${(i+1)*2}s]`, JSON.stringify(status))
  }
  await browser.close()
}

testChat()

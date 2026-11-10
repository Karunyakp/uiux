import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

async function run() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()
  
  // Image 2: Isolated character illustration on cream/beige background
  const imgUrl = 'file:///C:/Users/Karunyaayashu/.gemini/antigravity/brain/7eb51cfc-2267-4fea-9ad9-da27afa4c565/.user_uploaded/media_1794112282011_b7e3bfb1.jpg'

  await page.goto(imgUrl)
  await page.waitForFunction(() => {
    const img = document.querySelector('img')
    return img && img.complete && img.naturalWidth > 0
  })

  const result = await page.evaluate(() => {
    const img = document.querySelector('img')
    const canvas = document.createElement('canvas')
    const W = img.naturalWidth
    const H = img.naturalHeight
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)

    const imgData = ctx.getImageData(0, 0, W, H)
    const data = imgData.data

    // Helper: is this pixel background cream/light?
    // Cream colors in this image: R >= 210, G >= 200, B >= 180 and R ~ G
    const isBg = (x, y) => {
      if (x < 0 || x >= W || y < 0 || y >= H) return false
      const idx = (y * W + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      // Check for cream/light background or light grey artifacts at bottom corners
      const isCream = (r >= 200 && g >= 195 && b >= 170 && Math.abs(r - g) <= 30 && r > b)
      const isLightVignette = (r >= 215 && g >= 215 && b >= 215)
      return isCream || isLightVignette
    }

    // Breadth-First-Search Flood Fill from all 4 borders
    const visited = new Uint8Array(W * H)
    const queue = []

    // Push all border pixels that match background
    for (let x = 0; x < W; x++) {
      if (isBg(x, 0)) { queue.push((0 * W + x)); visited[0 * W + x] = 1 }
      if (isBg(x, H - 1)) { queue.push(((H - 1) * W + x)); visited[(H - 1) * W + x] = 1 }
    }
    for (let y = 0; y < H; y++) {
      if (isBg(0, y)) { queue.push((y * W + 0)); visited[y * W + 0] = 1 }
      if (isBg(W - 1, y)) { queue.push((y * W + (W - 1))); visited[y * W + (W - 1)] = 1 }
    }

    let head = 0
    while (head < queue.length) {
      const pos = queue[head++]
      const cx = pos % W
      const cy = Math.floor(pos / W)

      // Neighbors (4-way)
      const neighbors = [
        [cx - 1, cy],
        [cx + 1, cy],
        [cx, cy - 1],
        [cx, cy + 1]
      ]

      for (let i = 0; i < 4; i++) {
        const nx = neighbors[i][0]
        const ny = neighbors[i][1]
        if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
          const npos = ny * W + nx
          if (!visited[npos] && isBg(nx, ny)) {
            visited[npos] = 1
            queue.push(npos)
          }
        }
      }
    }

    // Now set alpha = 0 for all flood-filled background pixels
    for (let i = 0; i < W * H; i++) {
      if (visited[i]) {
        data[i * 4 + 3] = 0 // completely transparent!
      }
    }

    ctx.putImageData(imgData, 0, 0)
    return canvas.toDataURL('image/png')
  })

  const base64Data = result.replace(/^data:image\/png;base64,/, '')
  fs.writeFileSync('output/floodfill_character.png', Buffer.from(base64Data, 'base64'))
  console.log('Saved output/floodfill_character.png')
  await browser.close()
}

run().catch(console.error)

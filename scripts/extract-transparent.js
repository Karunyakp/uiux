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

    // Remove the "Evidence attached" label in top right
    ctx.clearRect(560, 0, W - 560, 45)

    const imgData = ctx.getImageData(0, 0, W, H)
    const data = imgData.data

    // Cream background classifier
    const isCream = (r, g, b) => {
      // Cream/beige is high brightness, slightly warm (r >= g >= b), low saturation
      return (r >= 200 && g >= 195 && b >= 170 && Math.abs(r - g) <= 32 && (r - b) >= 5 && (r - b) <= 65)
        || (r >= 225 && g >= 225 && b >= 225) // pure white/near-white vignette
    }

    const isBg = (x, y) => {
      if (x < 0 || x >= W || y < 0 || y >= H) return false
      const idx = (y * W + x) * 4
      return isCream(data[idx], data[idx + 1], data[idx + 2])
    }

    // BFS Flood Fill from outside
    const visited = new Uint8Array(W * H)
    const queue = []

    for (let x = 0; x < W; x++) {
      if (isBg(x, 0)) { queue.push((0 * W + x)); visited[0 * W + x] = 1 }
      if (isBg(x, H - 1)) { queue.push(((H - 1) * W + x)); visited[(H - 1) * W + x] = 1 }
    }
    for (let y = 0; y < H; y++) {
      if (isBg(0, y)) { queue.push((y * W + 0)); visited[y * W + 0] = 1 }
      if (isBg(W - 1, y)) { queue.push((y * W + (W - 1))); visited[y * W + (W - 1)] = 1 }
    }

    // Also seed the trapped cream spots:
    // 1. Between right jaw and hair (around x=415, y=300)
    for (let sx = 405; sx <= 425; sx++) {
      for (let sy = 285; sy <= 320; sy++) {
        if (!visited[sy * W + sx] && isBg(sx, sy)) {
          visited[sy * W + sx] = 1
          queue.push(sy * W + sx)
        }
      }
    }
    // 2. Between hair curl and right paper (around x=450-510, y=340-420)
    for (let sx = 445; sx <= 515; sx++) {
      for (let sy = 345; sy <= 420; sy++) {
        if (!visited[sy * W + sx] && isBg(sx, sy)) {
          visited[sy * W + sx] = 1
          queue.push(sy * W + sx)
        }
      }
    }

    let head = 0
    while (head < queue.length) {
      const pos = queue[head++]
      const cx = pos % W
      const cy = Math.floor(pos / W)

      const nbs = [
        [cx - 1, cy], [cx + 1, cy],
        [cx, cy - 1], [cx, cy + 1]
      ]

      for (let i = 0; i < 4; i++) {
        const nx = nbs[i][0]
        const ny = nbs[i][1]
        if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
          const npos = ny * W + nx
          if (!visited[npos] && isBg(nx, ny)) {
            visited[npos] = 1
            queue.push(npos)
          }
        }
      }
    }

    // Apply transparency to visited pixels
    for (let i = 0; i < W * H; i++) {
      if (visited[i]) {
        data[i * 4 + 3] = 0
      }
    }

    // Soft antialiasing on edges: if transparent pixel is adjacent to opaque pixel
    // soften the boundary
    ctx.putImageData(imgData, 0, 0)
    return canvas.toDataURL('image/png')
  })

  const base64Data = result.replace(/^data:image\/png;base64,/, '')
  fs.writeFileSync('output/clean_transparent_character.png', Buffer.from(base64Data, 'base64'))
  fs.writeFileSync('src/assets/hero-illustration-transparent.png', Buffer.from(base64Data, 'base64'))
  fs.writeFileSync('public/hero-illustration-transparent.png', Buffer.from(base64Data, 'base64'))

  console.log('Saved clean transparent character!')
  await browser.close()
}

run().catch(console.error)

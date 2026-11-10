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
  await page.goto('file:///C:/Users/Karunyaayashu/.gemini/antigravity/brain/7eb51cfc-2267-4fea-9ad9-da27afa4c565/.user_uploaded/media_1794112277264_b15771fc.png')
  await page.waitForFunction(() => {
    const img = document.querySelector('img')
    return img && img.complete && img.naturalWidth > 0
  })

  const result = await page.evaluate(() => {
    const img = document.querySelector('img')
    const canvas = document.createElement('canvas')
    
    // We crop right column from x=415 to 1024, y=55 to 575
    const cropX = 415
    const cropY = 55
    const cropW = 1024 - cropX // 609
    const cropH = 575 - cropY // 520

    canvas.width = cropW
    canvas.height = cropH
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)

    const imgData = ctx.getImageData(0, 0, cropW, cropH)
    const data = imgData.data

    // Let's inspect background color at the top-right corner of the crop (e.g. x=cropW-5, y=5)
    // and top-left corner (x=5, y=5)
    // In media_1794112277264_b15771fc.png, the navy background is:
    // r ~ 20-35, g ~ 50-75, b ~ 78-105.
    // Let's create a background classifier function for navy:
    const isNavyBg = (r, g, b) => {
      // Background has:
      // r: 16 to 40
      // g: 45 to 80
      // b: 72 to 115
      // and blue is strictly greater than green, which is strictly greater than red:
      // b > g && g > r && (b - r) >= 40 && (b - r) <= 90
      // Also, no high saturation teal or cyan (cyan has g > 110 and b > 130)
      if (r >= 12 && r <= 42 && g >= 40 && g <= 82 && b >= 68 && b <= 118) {
        if (b > g && g > r) {
          return true
        }
      }
      return false
    }

    // BFS Flood Fill from the perimeter
    const visited = new Uint8Array(cropW * cropH)
    const queue = []

    // Seed top and right edges
    for (let x = 0; x < cropW; x++) {
      const idxTop = 0 * cropW + x
      const rT = data[idxTop * 4], gT = data[idxTop * 4 + 1], bT = data[idxTop * 4 + 2]
      if (isNavyBg(rT, gT, bT)) {
        visited[idxTop] = 1
        queue.push(idxTop)
      }

      const idxBot = (cropH - 1) * cropW + x
      const rB = data[idxBot * 4], gB = data[idxBot * 4 + 1], bB = data[idxBot * 4 + 2]
      if (isNavyBg(rB, gB, bB)) {
        visited[idxBot] = 1
        queue.push(idxBot)
      }
    }

    for (let y = 0; y < cropH; y++) {
      const idxLeft = y * cropW + 0
      const rL = data[idxLeft * 4], gL = data[idxLeft * 4 + 1], bL = data[idxLeft * 4 + 2]
      if (isNavyBg(rL, gL, bL)) {
        visited[idxLeft] = 1
        queue.push(idxLeft)
      }

      const idxRight = y * cropW + (cropW - 1)
      const rR = data[idxRight * 4], gR = data[idxRight * 4 + 1], bR = data[idxRight * 4 + 2]
      if (isNavyBg(rR, gR, bR)) {
        visited[idxRight] = 1
        queue.push(idxRight)
      }
    }

    let head = 0
    while (head < queue.length) {
      const pos = queue[head++]
      const cx = pos % cropW
      const cy = Math.floor(pos / cropW)

      const nbs = [
        [cx - 1, cy], [cx + 1, cy],
        [cx, cy - 1], [cx, cy + 1]
      ]

      for (let i = 0; i < 4; i++) {
        const nx = nbs[i][0]
        const ny = nbs[i][1]
        if (nx >= 0 && nx < cropW && ny >= 0 && ny < cropH) {
          const npos = ny * cropW + nx
          if (!visited[npos]) {
            const r = data[npos * 4]
            const g = data[npos * 4 + 1]
            const b = data[npos * 4 + 2]
            if (isNavyBg(r, g, b)) {
              visited[npos] = 1
              queue.push(npos)
            }
          }
        }
      }
    }

    // Now make all visited pixels transparent
    let removedCount = 0
    for (let i = 0; i < cropW * cropH; i++) {
      if (visited[i]) {
        data[i * 4 + 3] = 0
        removedCount++
      }
    }

    // Soft antialiasing pass on the boundary:
    // If a non-transparent pixel is adjacent to a transparent pixel, check if it's very close to navy bg
    // to soften any harsh steps:
    for (let y = 1; y < cropH - 1; y++) {
      for (let x = 1; x < cropW - 1; x++) {
        const pos = y * cropW + x
        if (data[pos * 4 + 3] > 0) {
          const hasTransNeighbor = (
            data[(pos - 1) * 4 + 3] === 0 ||
            data[(pos + 1) * 4 + 3] === 0 ||
            data[(pos - cropW) * 4 + 3] === 0 ||
            data[(pos + cropW) * 4 + 3] === 0
          )
          if (hasTransNeighbor) {
            const r = data[pos * 4], g = data[pos * 4 + 1], b = data[pos * 4 + 2]
            // If it's a fringe pixel close to bg
            if (r < 50 && g < 90 && b < 130 && (b - r) > 35) {
              data[pos * 4 + 3] = Math.round(data[pos * 4 + 3] * 0.5)
            }
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0)
    return {
      dataUrl: canvas.toDataURL('image/png'),
      removedCount,
      totalPixels: cropW * cropH
    }
  })

  console.log('Flood fill result:', {
    removedCount: result.removedCount,
    totalPixels: result.totalPixels,
    percentRemoved: (result.removedCount / result.totalPixels * 100).toFixed(1) + '%'
  })

  const base64Data = result.dataUrl.replace(/^data:image\/png;base64,/, '')
  fs.writeFileSync('output/navy_transparent_illustration.png', Buffer.from(base64Data, 'base64'))
  console.log('Saved output/navy_transparent_illustration.png')
  await browser.close()
}

run().catch(console.error)

import assert from 'node:assert/strict'
import puppeteer from 'puppeteer-core'
import fs from 'fs'
import path from 'path'

const API_BASE = 'http://localhost:4000/api'
const FRONTEND_SIGNIN_URL = 'http://localhost:5173/#/signin'
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const ARTIFACTS_DIR = 'C:\\Users\\Karunyaayashu\\.gemini\\antigravity\\brain\\7eb51cfc-2267-4fea-9ad9-da27afa4c565'

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function runGoogleAuthTests() {
  console.log('=== STARTING TRUSTLENS AI GOOGLE AUTHENTICATION AUDIT & TESTS ===\n')
  const results = { passed: [], failed: [] }

  function record(name, pass, details = '') {
    if (pass) {
      console.log(`✅ [PASS] ${name}${details ? ` - ${details}` : ''}`)
      results.passed.push(name)
    } else {
      console.error(`❌ [FAIL] ${name}${details ? ` - ${details}` : ''}`)
      results.failed.push({ name, details })
    }
  }

  // --- TEST 1: Google OAuth Config Endpoint ---
  console.log('--- TEST 1: Google OAuth Config Endpoint ---')
  try {
    const res = await fetch(`${API_BASE}/auth/google/config`)
    assert.equal(res.status, 200)
    const json = await res.json()
    assert.ok(typeof json.configured === 'boolean')
    assert.ok(typeof json.clientId === 'string')
    record('Test 1: GET /api/auth/google/config', true, `Configured: ${json.configured}`)
  } catch (err) {
    record('Test 1: GET /api/auth/google/config', false, err.message)
  }

  // --- TEST 2: First-Time Google User Registration ---
  console.log('\n--- TEST 2: First-Time Google User Registration ---')
  const uniqueGoogleEmail = `alex.google.${Date.now()}@example.com`
  let userToken = null
  let userId = null
  try {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        devTest: true,
        email: uniqueGoogleEmail,
        name: 'Alex Google Explorer',
        googleId: `google_sub_${Date.now()}`
      })
    })
    assert.equal(res.status, 200)
    const json = await res.json()
    assert.ok(json.token)
    assert.ok(json.user)
    assert.equal(json.user.email, uniqueGoogleEmail)
    assert.equal(json.user.name, 'Alex Google Explorer')
    assert.equal(json.user.isGuest, false)
    userToken = json.token
    userId = json.user.id

    // Verify token works on protected /api/auth/me
    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${userToken}` }
    })
    assert.equal(meRes.status, 200)
    const meJson = await meRes.json()
    assert.equal(meJson.user.id, userId)
    record('Test 2: First-Time Google User Registration', true, `Created user #${userId} (${uniqueGoogleEmail})`)
  } catch (err) {
    record('Test 2: First-Time Google User Registration', false, err.message)
  }

  // --- TEST 3: Existing User Linking via Google Sign-In ---
  console.log('\n--- TEST 3: Existing User Linking via Google Sign-In ---')
  const existingEmail = `traditional.user.${Date.now()}@example.com`
  try {
    // 1. Traditional email/password registration
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Traditional User',
        email: existingEmail,
        password: 'Password12345!'
      })
    })
    assert.equal(regRes.status, 201)
    const regJson = await regRes.json()
    const originalUserId = regJson.user.id

    // 2. Sign in with Google using the same email
    const googleLoginRes = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        devTest: true,
        email: existingEmail,
        name: 'Traditional User Google',
        googleId: `google_link_${Date.now()}`
      })
    })
    assert.equal(googleLoginRes.status, 200)
    const googleJson = await googleLoginRes.json()
    assert.equal(googleJson.user.id, originalUserId, 'User ID should remain identical without duplicate accounts')
    assert.equal(googleJson.user.email, existingEmail)
    record('Test 3: Existing User Google Sign-In Linking', true, `Seamlessly linked to existing user #${originalUserId}`)
  } catch (err) {
    record('Test 3: Existing User Google Sign-In Linking', false, err.message)
  }

  // --- TEST 4: Guest Session Upgrade via Google Sign-In ---
  console.log('\n--- TEST 4: Guest Session Upgrade via Google Sign-In ---')
  const guestEmail = `upgraded.guest.${Date.now()}@example.com`
  try {
    // 1. Create a guest session
    const guestRes = await fetch(`${API_BASE}/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Guest Explorer' })
    })
    assert.equal(guestRes.status, 201)
    const guestJson = await guestRes.json()
    const guestToken = guestJson.token
    const guestId = guestJson.user.id
    assert.equal(guestJson.user.isGuest, true)

    // 2. Guest saves an answer
    const saveKey = `save_g_${Date.now()}`
    const saveRes = await fetch(`${API_BASE}/me/saved/${saveKey}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guestToken}`
      },
      body: JSON.stringify({ title: 'Guest Saved Item', content: 'Testing guest data retention' })
    })
    assert.equal(saveRes.status, 200)

    // 3. Guest signs in with Google
    const upgradeRes = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guestToken}`
      },
      body: JSON.stringify({
        devTest: true,
        email: guestEmail,
        name: 'Upgraded Google User',
        googleId: `google_upg_${Date.now()}`
      })
    })
    assert.equal(upgradeRes.status, 200)
    const upgJson = await upgradeRes.json()
    assert.equal(upgJson.user.id, guestId)
    assert.equal(upgJson.user.isGuest, false)

    // 4. Verify saved item retained
    const savedRes = await fetch(`${API_BASE}/me/saved`, {
      headers: { Authorization: `Bearer ${upgJson.token}` }
    })
    const savedJson = await savedRes.json()
    assert.ok(savedJson.keys.includes(saveKey))
    record('Test 4: Guest Session Upgrade to Google Account', true, `Retained user #${guestId} data and saved keys`)
  } catch (err) {
    record('Test 4: Guest Session Upgrade to Google Account', false, err.message)
  }

  // --- TEST 5: Input Validation & Error Handling ---
  console.log('\n--- TEST 5: Input Validation & Error Handling ---')
  try {
    // Missing body
    const emptyRes = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    assert.equal(emptyRes.status, 400)

    // Invalid credential string
    const badRes = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'invalid_mock_token_12345' })
    })
    assert.equal(badRes.status, 401)
    record('Test 5: Token Validation & Error Handling', true, 'Handled missing/invalid tokens with HTTP 400/401')
  } catch (err) {
    record('Test 5: Token Validation & Error Handling', false, err.message)
  }

  // --- TEST 6: Frontend UI Verification & Visual Evidence Capture ---
  console.log('\n--- TEST 6: Frontend UI Verification & Screenshot Capture ---')
  let browser
  try {
    browser = await puppeteer.launch({
      executablePath: EDGE_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
    })
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })

    await page.goto(FRONTEND_SIGNIN_URL, { waitUntil: 'networkidle2', timeout: 30000 })
    await sleep(1000)

    // Verify presence of Continue with Google button
    const googleBtn = await page.$('.auth-google-btn')
    assert.ok(googleBtn, 'Continue with Google button should exist in DOM')

    // Verify presence of official Google G SVG icon
    const gIcon = await page.$('.auth-google-btn .google-g-icon')
    assert.ok(gIcon, 'Google G SVG icon should be present inside button')

    // Verify text inside button
    const btnText = await page.evaluate(el => el.textContent.trim(), googleBtn)
    assert.match(btnText, /Continue with Google/i)

    // Verify presence of "or" divider
    const divider = await page.$('.auth-divider')
    assert.ok(divider, 'auth-divider should exist above Google button')

    // Capture Light Mode Screenshot
    const lightPath = path.join(ARTIFACTS_DIR, 'google_login_light_mode.png')
    await page.screenshot({ path: lightPath })
    console.log(`   Captured Light Mode screenshot: ${lightPath}`)

    // Toggle Dark Mode
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    await sleep(400)
    const darkPath = path.join(ARTIFACTS_DIR, 'google_login_dark_mode.png')
    await page.screenshot({ path: darkPath })
    console.log(`   Captured Dark Mode screenshot: ${darkPath}`)

    // Test Create Account page as well
    await page.goto('http://localhost:5173/#/register', { waitUntil: 'networkidle2', timeout: 30000 })
    await sleep(600)
    const regGoogleBtn = await page.$('.auth-google-btn')
    assert.ok(regGoogleBtn, 'Continue with Google button should also exist on Register page')
    const regPath = path.join(ARTIFACTS_DIR, 'google_register_page.png')
    await page.screenshot({ path: regPath })
    console.log(`   Captured Register Page screenshot: ${regPath}`)

    record('Test 6: Browser UI, G Logo & Responsive Screenshots', true, 'Light/Dark visual evidence captured')
  } catch (err) {
    record('Test 6: Browser UI, G Logo & Responsive Screenshots', false, err.message)
  } finally {
    if (browser) await browser.close()
  }

  console.log('\n==================================================')
  console.log(`GOOGLE AUTH AUDIT: ${results.passed.length} PASSED / ${results.failed.length} FAILED`)
  console.log('==================================================\n')

  if (results.failed.length > 0) {
    process.exit(1)
  }
}

runGoogleAuthTests().catch(err => {
  console.error('Fatal Google Auth test error:', err)
  process.exit(1)
})

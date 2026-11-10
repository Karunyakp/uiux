import test from 'node:test'
import assert from 'node:assert/strict'
import { openDb } from '../src/db.js'
import { createApp } from '../src/app.js'
import { seed } from '../src/seed.js'

function buildApp() {
  const db = openDb(':memory:')
  seed(db)
  return { app: createApp(db), db }
}

async function request(app, path, { method = 'GET', body, token } = {}) {
  const server = app.listen(0)
  const port = server.address().port
  try {
    const res = await fetch(`http://localhost:${port}/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    })
    const json = await res.json().catch(() => null)
    return { status: res.status, body: json }
  } finally {
    server.close()
  }
}

test('Chat API: validation and conversation flow', async t => {
  const { app } = buildApp()

  // 1. Empty message returns 400
  const emptyRes = await request(app, '/chat', {
    method: 'POST',
    body: { message: '   ' }
  })
  assert.equal(emptyRes.status, 400)
  assert.match(emptyRes.body.error, /Message is required/i)

  // 2. Chat endpoint exists and returns proper validation or error response
  // (without a valid Gemini API key it returns 503 NO_API_KEY gracefully)
  const chatRes = await request(app, '/chat', {
    method: 'POST',
    body: { message: 'What is cloud computing?' }
  })
  // Either 200 (if API key present), 503 (no-key), or 502 (offline/unreachable)
  assert.ok([200, 502, 503].includes(chatRes.status))
  if (chatRes.status === 503) {
    assert.match(chatRes.body.error, /GEMINI_API_KEY/i)
  } else if (chatRes.status === 502) {
    assert.match(chatRes.body.error, /Gemini API/i)
  }

  // 3. Conversation routes exist
  const convsRes = await request(app, '/conversations')
  assert.equal(convsRes.status, 200)
  assert.ok(Array.isArray(convsRes.body.conversations))
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { openDb } from '../src/db.js'
import { seed } from '../src/seed.js'
import { createApp } from '../src/app.js'
import { hashPassword, signToken, verifyToken } from '../src/lib/auth.js'
import { computeConfidence } from '../src/lib/confidence.js'
import { usersService } from '../src/services/users.js'

const db = openDb(':memory:')
await seed(db)
const app = createApp(db, { staticDir: null })
let ipN = 0
const nextIp = () => `10.0.0.${++ipN}`

/** Drives the Express app in-process (no network needed). */
function call(method, url, { body, token, ip = '9.9.9.9' } = {}) {
  return new Promise(resolve => {
    const [pathname, search = ''] = url.split('?')
    const req = {
      method, url, ip, headers: token ? { authorization: `Bearer ${token}` } : {},
      body,
      rawBody: body === undefined ? '' : JSON.stringify(body), query: Object.fromEntries(new URLSearchParams(search)), params: {}
    }
    const res = {
      statusCode: 200, headers: {}, headersSent: false,
      status(c) { this.statusCode = c; return this },
      setHeader(k, v) { this.headers[k] = v },
      json(o) { this.headersSent = true; resolve({ status: this.statusCode, body: o, headers: this.headers }) },
      end() { this.headersSent = true; resolve({ status: this.statusCode, body: null, headers: this.headers }) }
    }
    app.handle(req, res)
  })
}
const guest = async ip => (await call('POST', '/api/auth/guest', { body: {}, ip })).body

test('health + 404 + security headers', async () => {
  const r = await call('GET', '/api/health')
  assert.equal(r.status, 200); assert.equal(r.body.status, 'ok')
  assert.equal(r.headers['X-Content-Type-Options'], 'nosniff')
  assert.equal((await call('GET', '/api/nope')).status, 404)
})

test('topics are served in the dashboard shape', async () => {
  const { body } = await call('GET', '/api/topics')
  assert.deepEqual(body.order, ['elig', 'fee', 'conf', 'unk'])
  const e = body.topics.elig
  assert.equal(e.lvl, 'High'); assert.equal(e.pct, 86); assert.equal(e.n1, 1); assert.equal(e.why.length, 3)
  assert.match(e.a, /<mark data-c>/); assert.equal(e.src, 'GATE Information Brochure (sample entry)')
  assert.equal(body.topics.fee.src, 'No source found'); assert.equal(body.topics.fee.n1, 0)
  assert.equal(body.topics.conf.n1, 2); assert.equal(body.topics.conf.type, 'Mixed')
  const s = await call('GET', '/api/topics?q=deadline')
  assert.deepEqual(s.body.order, ['conf'])
  assert.equal((await call('GET', '/api/topics/elig')).body.evidence[0].source.isOfficial, true)
  assert.equal((await call('GET', '/api/topics/zzz')).status, 404)
})

test('guest session, saved answers, auth required', async () => {
  assert.equal((await call('GET', '/api/me/saved')).status, 401)
  const { token, user } = await guest(nextIp())
  assert.equal(user.isGuest, true)
  assert.deepEqual((await call('PUT', '/api/me/saved/elig', { token })).body.keys, ['elig'])
  assert.deepEqual((await call('PUT', '/api/me/saved/elig', { token })).body.keys, ['elig'])
  assert.deepEqual((await call('DELETE', '/api/me/saved/elig', { token })).body.keys, [])
  assert.equal((await call('PUT', '/api/me/saved/zzz', { token })).status, 404)
  assert.equal((await call('GET', '/api/me/saved', { token: token + 'x' })).status, 401)
})

test('register upgrades the guest and keeps data; login works', async () => {
  const ip = nextIp()
  const { token } = await guest(ip)
  await call('PUT', '/api/me/saved/fee', { token })
  const reg = await call('POST', '/api/auth/register', { token, ip, body: { name: 'Karunya', email: 'K@Example.com', password: 'longpassword1' } })
  assert.equal(reg.status, 201); assert.equal(reg.body.user.isGuest, false); assert.equal(reg.body.user.email, 'k@example.com')
  assert.deepEqual((await call('GET', '/api/me/saved', { token: reg.body.token })).body.keys, ['fee'])
  assert.equal((await call('POST', '/api/auth/register', { ip, body: { name: 'X', email: 'k@example.com', password: 'longpassword1' } })).status, 409)
  assert.equal((await call('POST', '/api/auth/register', { ip, body: { name: 'X', email: 'bad', password: 'longpassword1' } })).status, 400)
  assert.equal((await call('POST', '/api/auth/register', { ip, body: { name: 'X', email: 'x@y.co', password: 'short' } })).status, 400)
  assert.equal((await call('POST', '/api/auth/login', { ip, body: { email: 'k@example.com', password: 'longpassword1' } })).status, 200)
  assert.equal((await call('POST', '/api/auth/login', { ip, body: { email: 'k@example.com', password: 'wrong-password' } })).status, 401)
  assert.equal((await call('POST', '/api/auth/login', { ip, body: { email: 'nobody@example.com', password: 'whatever123' } })).status, 401)
})

test('reports, feedback, notifications, checklist', async () => {
  const { token } = await guest(nextIp())
  assert.equal((await call('POST', '/api/reports', { token, body: { topicKey: 'elig', kind: 'bogus' } })).status, 400)
  assert.equal((await call('POST', '/api/reports', { token, body: { topicKey: 'nope', kind: 'wrong' } })).status, 404)
  assert.equal((await call('POST', '/api/reports', { token, body: { topicKey: 'elig', kind: 'outdated', details: 'old' } })).status, 201)
  assert.equal((await call('POST', '/api/feedback', { token, body: { message: '' } })).status, 400)
  assert.equal((await call('POST', '/api/feedback', { token, body: { message: 'Nice', rating: 9 } })).status, 400)
  assert.equal((await call('POST', '/api/feedback', { token, body: { message: 'Nice', rating: 5 } })).status, 201)
  const n = (await call('GET', '/api/notifications', { token })).body
  assert.equal(n.unread, 2)
  await call('POST', '/api/notifications/read', { token })
  assert.equal((await call('GET', '/api/notifications', { token })).body.unread, 0)
  const items = (await call('GET', '/api/checklist', { token })).body.items
  assert.equal(items.length, 4); assert.ok(items.every(i => !i.done))
  const upd = await call('PUT', `/api/checklist/${items[1].id}`, { token, body: { done: true } })
  assert.equal(upd.body.items[1].done, true)
  assert.equal((await call('PUT', '/api/checklist/999', { token, body: { done: true } })).status, 404)
  assert.equal((await call('PUT', `/api/checklist/${items[0].id}`, { token, body: { done: 'yes' } })).status, 400)
})

test('follow-ups are grounded or honestly unanswered', async () => {
  const { token } = await guest(nextIp())
  const a = await call('POST', '/api/topics/elig/followups', { token, body: { question: 'Can third year students apply for GATE 2027?' } })
  assert.equal(a.status, 201); assert.equal(a.body.matchedKey, 'elig'); assert.equal(a.body.grounded, true)
  assert.doesNotMatch(a.body.answer, /<mark/)
  const b = await call('POST', '/api/topics/elig/followups', { token, body: { question: 'What is the best pizza topping?' } })
  assert.equal(b.body.grounded, false); assert.equal(b.body.level, 'Low'); assert.equal(b.body.matchedKey, null)
  assert.equal((await call('GET', '/api/topics/elig/followups', { token })).body.followups.length, 2)
  assert.equal((await call('POST', '/api/topics/elig/followups', { token, body: {} })).status, 400)
})

test('admin: access control, topic CRUD, sanitising, evidence + confidence, reports', async () => {
  const { token: userToken } = await guest(nextIp())
  assert.equal((await call('GET', '/api/admin/stats')).status, 401)
  assert.equal((await call('GET', '/api/admin/stats', { token: userToken })).status, 403)

  const admin = usersService(db).create({ email: 'admin@x.io', name: 'Admin', role: 'admin', passwordHash: await hashPassword('adminpass123') })
  const aT = signToken({ sub: admin.id }, 600)
  const mk = await call('POST', '/api/admin/topics', { token: aT, body: {
    key: 'dates', name: 'Dates', question: 'When is the exam?', claim: 'Exam date unknown.', icon: 'help',
    answerHtml: '<script>alert(1)</script><mark data-c>Unknown</mark>', reasons: ['One', 'Two'] } })
  assert.equal(mk.status, 201)
  assert.ok(!mk.body.a.includes('<script>')); assert.ok(mk.body.a.includes('<mark data-c>Unknown</mark>'))
  assert.equal((await call('POST', '/api/admin/topics', { token: aT, body: { key: 'dates', name: 'D', question: 'q', claim: 'c', answerHtml: 'a' } })).status, 409)
  assert.equal((await call('POST', '/api/admin/topics', { token: aT, body: { key: 'Bad Key!', name: 'D', question: 'q', claim: 'c', answerHtml: 'a' } })).status, 400)

  const src = (await call('POST', '/api/admin/sources', { token: aT, body: { title: 'Official site', type: 'Website', isOfficial: true, trustScore: 95 } })).body.id
  const ev = await call('POST', '/api/admin/topics/dates/evidence', { token: aT, body: { sourceId: src, paragraph: 'Exam in Feb.', recomputeConfidence: true } })
  assert.equal(ev.body.n1, 1); assert.equal(ev.body.lvl, 'High')
  await call('PUT', '/api/admin/topics/dates', { token: aT, body: { status: 'draft' } })
  assert.ok(!(await call('GET', '/api/topics')).body.order.includes('dates'))
  assert.equal((await call('GET', '/api/topics/dates')).status, 404)
  assert.ok((await call('GET', '/api/admin/topics', { token: aT })).body.order.includes('dates'))
  assert.equal((await call('DELETE', '/api/admin/topics/dates', { token: aT })).status, 204)

  const rep = await call('POST', '/api/reports', { token: userToken, body: { topicKey: 'elig', kind: 'wrong' } })
  const list = (await call('GET', '/api/admin/reports?status=open', { token: aT })).body.reports
  assert.ok(list.some(r => r.id === rep.body.id))
  await call('PATCH', `/api/admin/reports/${rep.body.id}`, { token: aT, body: { status: 'resolved' } })
  const notes = (await call('GET', '/api/notifications', { token: userToken })).body.notifications
  assert.ok(notes.some(n => n.title === 'Your report was reviewed'))
  assert.ok((await call('GET', '/api/admin/stats', { token: aT })).body.topics >= 4)
})

test('tokens: tamper + expiry; confidence scoring', () => {
  const t = signToken({ sub: 1 }, 60)
  assert.equal(verifyToken(t).sub, 1)
  assert.equal(verifyToken(t.slice(0, -2) + 'xx'), null)
  assert.equal(verifyToken(signToken({ sub: 1 }, -10)), null)
  assert.equal(verifyToken(t, 'other-secret'), null)
  assert.equal(computeConfidence({ sources: [] }).level, 'Low')
  const good = computeConfidence({ sources: [{ trust_score: 90, is_official: 1 }] })
  const bad = computeConfidence({ sources: [{ trust_score: 90, is_official: 1 }], conflicting: true })
  assert.ok(good.pct > bad.pct); assert.equal(good.level, 'High')
})

test('rate limiting kicks in on auth endpoints', async () => {
  const ip = nextIp(); let last
  for (let i = 0; i < 22; i++) last = await call('POST', '/api/auth/login', { ip, body: { email: 'a@b.co', password: 'xxxxxxxx' } })
  assert.equal(last.status, 429)
})

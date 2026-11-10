import express from 'express'
import { requireAuth } from '../lib/auth.js'
import { HttpError, wrap } from '../lib/http.js'
import { str } from '../lib/validate.js'
import { rateLimit } from '../lib/ratelimit.js'

export function topicRoutes({ topics, engagement, assistant, trustlens }) {
  const r = express.Router()

  r.get('/topics', (req, res) => {
    res.json(topics.list({ q: typeof req.query.q === 'string' ? req.query.q.slice(0, 100) : '' }))
  })

  r.get('/topics/:key', (req, res) => {
    const t = topics.get(String(req.params.key).toLowerCase())
    if (!t) throw new HttpError(404, 'Topic not found')
    res.json(t)
  })

  r.get('/sources', (req, res) => res.json({ sources: topics.listSources() }))

  r.get('/topics/:key/followups', requireAuth, (req, res) => {
    const tid = engagement.topicId(req.params.key.toLowerCase())
    if (!tid) throw new HttpError(404, 'Topic not found')
    res.json({ followups: engagement.followups(req.user.id, tid) })
  })

  r.post('/topics/:key/followups', requireAuth, rateLimit({ windowMs: 60_000, max: 20, name: 'followup' }), wrap(async (req, res) => {
    const key = req.params.key.toLowerCase()
    const tid = engagement.topicId(key)
    if (!tid) throw new HttpError(404, 'Topic not found')
    const question = str(req.body?.question, 'question', { max: 500 })

    const result = assistant.answer(question)

    const id = engagement.addFollowup(req.user.id, tid, question, result)
    res.status(201).json({ id, question, ...result })
  }))
  return r
}

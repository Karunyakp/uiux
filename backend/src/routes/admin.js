import express from 'express'
import { requireAdmin } from '../lib/auth.js'
import { HttpError, wrap } from '../lib/http.js'
import { bool, int, key as vKey, oneOf, str } from '../lib/validate.js'

const ICONS = ['cap', 'coin', 'conflict', 'help', 'shield', 'compass', 'check', 'flag', 'spark', 'eye']

function topicInput(b, partial) {
  const o = {}
  const set = (k, v) => { if (v !== undefined) o[k] = v }
  const opt = (name, fn) => { if (!partial || b[name] !== undefined) set(name, fn()) }
  opt('name', () => str(b.name, 'name', { max: 80 }))
  opt('question', () => str(b.question, 'question', { max: 300 }))
  opt('claim', () => str(b.claim, 'claim', { max: 300 }))
  opt('answerHtml', () => str(b.answerHtml, 'answerHtml', { max: 3000 }))
  for (const [k, max] of [['subtitle', 120], ['beforeYouAct', 1000], ['explanation', 1000], ['noEvidenceNote', 300]])
    if (b[k] !== undefined) o[k] = str(b[k], k, { max, optional: true }) ?? ''
  if (b.icon !== undefined) o.icon = oneOf(b.icon, 'icon', ICONS)
  if (b.status !== undefined) o.status = oneOf(b.status, 'status', ['published', 'draft'])
  if (b.sortOrder !== undefined) o.sortOrder = int(b.sortOrder, 'sortOrder', { min: 0, max: 10000 })
  if (b.confidencePct !== undefined) o.confidencePct = int(b.confidencePct, 'confidencePct', { min: 0, max: 100 })
  if (b.confidenceLevel !== undefined) o.confidenceLevel = oneOf(b.confidenceLevel, 'confidenceLevel', ['High', 'Medium', 'Low'])
  if (b.reasons !== undefined) {
    if (!Array.isArray(b.reasons) || b.reasons.length > 8) throw new HttpError(400, 'reasons must be a list of up to 8 items')
    o.reasons = b.reasons.map((x, i) => str(x, `reasons[${i}]`, { max: 300 }))
  }
  return o
}

export function adminRoutes({ topics, engagement }) {
  const r = express.Router()
  r.use('/admin', requireAdmin)

  r.get('/admin/stats', (req, res) => res.json(engagement.stats()))

  r.get('/admin/topics', (req, res) => res.json(topics.list({ includeDrafts: true })))

  r.post('/admin/topics', wrap(async (req, res) => {
    const b = req.body || {}
    const key = vKey(b.key)
    if (topics.rawByKey(key)) throw new HttpError(409, 'A topic with this key already exists')
    const t = topics.create({ key, ...topicInput(b, false) })
    engagement.audit(req.user.id, 'topic.create', { key })
    res.status(201).json(topics.get(t.key, { includeDrafts: true }))
  }))

  r.put('/admin/topics/:key', wrap(async (req, res) => {
    const t = topics.update(req.params.key.toLowerCase(), topicInput(req.body || {}, true))
    if (!t) throw new HttpError(404, 'Topic not found')
    engagement.audit(req.user.id, 'topic.update', { key: t.key })
    res.json(topics.get(t.key, { includeDrafts: true }))
  }))

  r.delete('/admin/topics/:key', (req, res) => {
    if (!topics.remove(req.params.key.toLowerCase())) throw new HttpError(404, 'Topic not found')
    engagement.audit(req.user.id, 'topic.delete', { key: req.params.key })
    res.status(204).end()
  })

  r.post('/admin/sources', (req, res) => {
    const b = req.body || {}
    const id = topics.createSource({
      title: str(b.title, 'title', { max: 200 }),
      type: str(b.type, 'type', { max: 60, optional: true }) ?? 'Other',
      publisher: str(b.publisher, 'publisher', { max: 120, optional: true }),
      url: str(b.url, 'url', { max: 500, optional: true }),
      isOfficial: b.isOfficial === undefined ? false : bool(b.isOfficial, 'isOfficial'),
      trustScore: b.trustScore === undefined ? 50 : int(b.trustScore, 'trustScore', { min: 0, max: 100 })
    })
    engagement.audit(req.user.id, 'source.create', { id })
    res.status(201).json({ id })
  })

  /** Attach a source to a topic as evidence, then optionally recompute the topic's confidence from its sources. */
  r.post('/admin/topics/:key/evidence', (req, res) => {
    const t = topics.rawByKey(req.params.key.toLowerCase())
    if (!t) throw new HttpError(404, 'Topic not found')
    const b = req.body || {}
    const sourceId = int(b.sourceId, 'sourceId', { min: 1 })
    if (!topics.sourceExists(sourceId)) throw new HttpError(404, 'Source not found')
    topics.attachEvidence(t.id, {
      sourceId,
      paragraph: str(b.paragraph, 'paragraph', { max: 1500 }),
      page: str(b.page, 'page', { max: 60, optional: true }) ?? '—',
      section: str(b.section, 'section', { max: 120, optional: true }) ?? '—',
      publishedOn: str(b.publishedOn, 'publishedOn', { max: 40, optional: true }) ?? '—',
      lastChecked: str(b.lastChecked, 'lastChecked', { max: 40, optional: true }) ?? '—'
    })
    if (b.recomputeConfidence) topics.recomputeConfidence(t.id, b.conflicting === true)
    engagement.audit(req.user.id, 'evidence.attach', { topic: t.key, sourceId })
    res.status(201).json(topics.get(t.key, { includeDrafts: true }))
  })

  r.get('/admin/reports', (req, res) => {
    const status = req.query.status === undefined ? null : oneOf(req.query.status, 'status', ['open', 'resolved', 'dismissed'])
    res.json({ reports: engagement.reports(status) })
  })
  r.patch('/admin/reports/:id', (req, res) => {
    const id = int(req.params.id, 'id', { min: 1 })
    const status = oneOf(req.body?.status, 'status', ['open', 'resolved', 'dismissed'])
    if (!engagement.setReportStatus(id, status)) throw new HttpError(404, 'Report not found')
    engagement.audit(req.user.id, 'report.status', { id, status })
    res.json({ id, status })
  })
  r.get('/admin/feedback', (req, res) => res.json({ feedback: engagement.feedbackList() }))
  return r
}

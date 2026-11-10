import express from 'express'
import { requireAuth } from '../lib/auth.js'
import { HttpError } from '../lib/http.js'
import { bool, int, oneOf, str } from '../lib/validate.js'
import { rateLimit } from '../lib/ratelimit.js'

export function meRoutes({ engagement, db }) {
  const r = express.Router()
  r.use(['/me', '/reports', '/feedback', '/checklist', '/notifications'], requireAuth)

  const defaultTopicId = () => {
    try {
      const row = db ? db.prepare('SELECT id FROM topics ORDER BY id ASC LIMIT 1').get() : null
      return row?.id ?? 1
    } catch {
      return 1
    }
  }

  const resolveTopicId = key => {
    if (!key) return defaultTopicId()
    const id = engagement.topicId(String(key).toLowerCase())
    return id || defaultTopicId()
  }

  r.get('/me/saved', (req, res) => res.json({
    keys: engagement.savedKeys(req.user.id),
    items: engagement.savedList ? engagement.savedList(req.user.id) : []
  }))

  r.put('/me/saved/:key', (req, res) => {
    const key = req.params.key
    const body = req.body || {}
    const tid = engagement.topicId(String(key).toLowerCase())
    if (!tid && !body.title && !body.content) {
      throw new HttpError(404, 'Topic not found')
    }
    engagement.saveItem(req.user.id, key, {
      title: body.title || key,
      content: body.content || '',
      metadata: body.metadata || null
    })
    res.json({
      keys: engagement.savedKeys(req.user.id),
      items: engagement.savedList ? engagement.savedList(req.user.id) : []
    })
  })

  r.delete('/me/saved/:key', (req, res) => {
    engagement.unsaveItem(req.user.id, req.params.key)
    res.json({
      keys: engagement.savedKeys(req.user.id),
      items: engagement.savedList ? engagement.savedList(req.user.id) : []
    })
  })

  const writes = rateLimit({ windowMs: 60_000, max: 30, name: 'writes' })

  r.post('/reports', writes, (req, res) => {
    const topicKey = req.body?.topicKey ? str(req.body.topicKey, 'topicKey', { max: 80, optional: true }) : null
    let tid
    if (topicKey) {
      tid = engagement.topicId(String(topicKey).toLowerCase())
      if (!tid) {
        if (topicKey.startsWith('msg_') || topicKey.startsWith('asst_') || topicKey.startsWith('conv_')) {
          tid = defaultTopicId()
        } else {
          throw new HttpError(404, 'Topic not found')
        }
      }
    } else {
      tid = defaultTopicId()
    }

    const rawKind = str(req.body?.kind, 'kind', { max: 40 })
    const validKinds = [
      'wrong', 'outdated', 'missing',
      'incorrect_info', 'missing_evidence', 'incorrect_source', 'misleading_confidence', 'other'
    ]
    if (!validKinds.includes(rawKind)) {
      throw new HttpError(400, `kind must be one of: ${validKinds.join(', ')}`)
    }

    const kindMap = {
      incorrect_info: 'wrong',
      missing_evidence: 'missing',
      incorrect_source: 'wrong',
      misleading_confidence: 'outdated',
      other: 'wrong',
      wrong: 'wrong',
      outdated: 'outdated',
      missing: 'missing'
    }
    const safeKind = kindMap[rawKind] || 'wrong'
    const rawDetails = req.body?.details ? str(req.body.details, 'details', { max: 2000, optional: true }) : ''
    const fullDetails = `[Category: ${rawKind}] ${rawDetails}`.trim()
    const id = engagement.addReport(req.user.id, tid, safeKind, fullDetails)
    engagement.notify(req.user.id, 'Report received', `Thanks, report #${id} is in the review queue.`)
    res.status(201).json({ id, status: 'open' })
  })

  r.post('/feedback', writes, (req, res) => {
    const category = req.body?.category ? `[${req.body.category}] ` : ''
    const rawMsg = str(req.body?.message, 'message', { max: 2000 })
    const message = `${category}${rawMsg}`
    const rating = int(req.body?.rating, 'rating', { min: 1, max: 5, optional: true })
    res.status(201).json({ id: engagement.addFeedback(req.user.id, message, rating) })
  })

  r.get('/checklist', (req, res) => res.json({ items: engagement.checklist(req.user.id) }))
  r.put('/checklist/:id', (req, res) => {
    const id = int(req.params.id, 'id', { min: 1 })
    const done = bool(req.body?.done, 'done')
    if (!engagement.setChecklist(req.user.id, id, done)) throw new HttpError(404, 'Checklist item not found')
    res.json({ items: engagement.checklist(req.user.id) })
  })

  r.get('/notifications', (req, res) => {
    const notifications = engagement.notifications(req.user.id)
    res.json({ notifications, unread: notifications.filter(n => !n.isRead).length })
  })
  r.post('/notifications/read', (req, res) => res.json({ updated: engagement.markAllRead(req.user.id) }))
  return r
}

import express from 'express'
import crypto from 'node:crypto'
import { HttpError, wrap } from '../lib/http.js'
import { str } from '../lib/validate.js'
import { rateLimit } from '../lib/ratelimit.js'

export function chatRoutes({ trustlens, conversations }) {
  const r = express.Router()

  // Main Chat API Endpoint (Phase 4)
  r.post('/chat', rateLimit({ windowMs: 60_000, max: 30, name: 'chat' }), wrap(async (req, res) => {
    const rawMessage = req.body?.message
    if (!rawMessage || typeof rawMessage !== 'string' || !rawMessage.trim()) {
      throw new HttpError(400, 'Message is required and cannot be empty.')
    }
    const message = str(rawMessage, 'message', { min: 1, max: 2000 })

    const userId = req.user?.id ?? null
    let conversationId = req.body?.conversationId
    if (typeof conversationId !== 'string' || !conversationId.trim()) {
      conversationId = crypto.randomUUID()
    }

    // Ensure conversation exists in DB
    let conv = conversations.get(conversationId, userId)
    if (!conv) {
      const cleanTitle = message.trim().length > 50
        ? (message.trim().slice(0, 50).lastIndexOf(' ') > 20
            ? message.trim().slice(0, message.trim().slice(0, 50).lastIndexOf(' '))
            : message.trim().slice(0, 50)) + '…'
        : message.trim()
      conv = conversations.create({
        id: conversationId,
        userId,
        title: cleanTitle
      })
    }

    // Retrieve prior messages for context
    const dbMessages = conversations.getMessages(conversationId)
    const history = dbMessages.map(m => ({
      role: m.role,
      content: m.content
    }))

    const rawAttachments = Array.isArray(req.body?.attachments) ? req.body.attachments : []
    const validatedAttachments = []
    const allowedMimes = [
      'application/pdf', 'text/plain', 'text/markdown', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'application/octet-stream'
    ]
    const maxFileSize = 10 * 1024 * 1024 // 10MB
    if (rawAttachments.length > 5) {
      throw new HttpError(400, 'Maximum of 5 attachments allowed per message.')
    }
    for (const att of rawAttachments) {
      if (!att || typeof att !== 'object') continue
      const name = String(att.name || 'document').slice(0, 150)
      const size = Number(att.size) || 0
      const type = String(att.type || 'application/octet-stream').toLowerCase()
      if (size > maxFileSize) {
        throw new HttpError(400, `Attachment "${name}" exceeds 10MB limit.`)
      }
      if (!allowedMimes.includes(type) && !name.match(/\.(pdf|docx|doc|txt|png|jpe?g|webp)$/i)) {
        throw new HttpError(400, `Unsupported attachment type for "${name}".`)
      }
      validatedAttachments.push({
        name,
        size,
        type,
        data: typeof att.data === 'string' ? att.data : (typeof att.dataUrl === 'string' ? att.dataUrl : '')
      })
    }

    // Record incoming user message
    conversations.addMessage({
      conversationId,
      role: 'user',
      content: message,
      structuredData: validatedAttachments.length > 0
        ? { attachments: validatedAttachments.map(a => ({ name: a.name, type: a.type, size: a.size })) }
        : null
    })

    // Analyze with TrustLens & Gemini Engine
    const calibration = await trustlens.analyzeQuestion({
      message,
      history,
      attachments: validatedAttachments
    })

    // Record assistant response with calibration metadata
    conversations.addMessage({
      conversationId,
      role: 'assistant',
      content: calibration.answer,
      structuredData: calibration
    })

    // Return unified structured response
    res.json({
      conversationId,
      answer: calibration.answer,
      answerHtml: calibration.answerHtml,
      confidence: calibration.confidence,
      why: calibration.why,
      claims: calibration.claims,
      sources: calibration.sources,
      uncertainties: calibration.uncertainties,
      conflicts: calibration.conflicts,
      warnings: calibration.warnings,
      before_you_act: calibration.beforeYouAct,
      recommended_actions: calibration.recommendedActions,
      verification_status: calibration.verificationStatus,
      ui: calibration.ui
    })
  }))

  // List conversations
  r.get('/conversations', wrap(async (req, res) => {
    const userId = req.user?.id
    if (!userId) {
      return res.json({ conversations: [] })
    }
    const list = conversations.list(userId)
    res.json({ conversations: list })
  }))

  // Retrieve single conversation history
  r.get('/conversations/:id', wrap(async (req, res) => {
    const convId = req.params.id
    const userId = req.user?.id ?? null
    const conv = conversations.get(convId, userId)
    if (!conv) throw new HttpError(404, 'Conversation not found')
    const messages = conversations.getMessages(convId)
    res.json({ conversation: conv, messages })
  }))

  // Delete conversation
  r.delete('/conversations/:id', wrap(async (req, res) => {
    const convId = req.params.id
    const userId = req.user?.id ?? null
    const conv = conversations.get(convId, userId)
    if (!conv) throw new HttpError(404, 'Conversation not found')
    conversations.delete(convId, userId)
    res.json({ ok: true })
  }))

  // Rename conversation
  r.patch('/conversations/:id', wrap(async (req, res) => {
    const convId = req.params.id
    const userId = req.user?.id ?? null
    const conv = conversations.get(convId, userId)
    if (!conv) throw new HttpError(404, 'Conversation not found')
    const title = (req.body?.title || '').trim().slice(0, 100)
    if (!title) throw new HttpError(400, 'Title cannot be empty')
    conversations.rename(convId, userId, title)
    res.json({ ok: true, id: convId, title })
  }))

  return r
}

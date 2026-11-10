import crypto from 'node:crypto'

function formatTitle(text, max = 50) {
  const clean = (text || '').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut) + '…'
}

export function conversationsService(db) {
  const insertConv = db.prepare(`
    INSERT INTO conversations (id, user_id, title, topic_key, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `)
  const updateConv = db.prepare(`
    UPDATE conversations SET updated_at = datetime('now'), title = COALESCE(?, title) WHERE id = ?
  `)
  const selectConv = db.prepare(`
    SELECT * FROM conversations WHERE id = ? AND (user_id = ? OR user_id IS NULL)
  `)
  const listConvs = db.prepare(`
    SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 30
  `)
  const listGuestConvs = db.prepare(`
    SELECT * FROM conversations WHERE user_id IS NULL ORDER BY updated_at DESC LIMIT 30
  `)
  const insertMsg = db.prepare(`
    INSERT INTO chat_messages (conversation_id, role, content, structured_data, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `)
  const selectMsgs = db.prepare(`
    SELECT id, role, content, structured_data, created_at FROM chat_messages
    WHERE conversation_id = ? ORDER BY id ASC
  `)
  const deleteConv = db.prepare(`
    DELETE FROM conversations WHERE id = ? AND (user_id = ? OR user_id IS NULL)
  `)

  return {
    create({ id, userId, title = 'New Conversation', topicKey = null }) {
      const convId = id || crypto.randomUUID()
      insertConv.run(convId, userId ?? null, title, topicKey)
      return { id: convId, userId, title, topicKey }
    },

    get(id, userId) {
      const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id)
      if (!conv) return null
      if (conv.user_id && userId && conv.user_id !== userId) return null
      return conv
    },

    list(userId) {
      if (!userId) return []
      return listConvs.all(userId)
    },

    addMessage({ conversationId, role, content, structuredData = null }) {
      const sJson = structuredData ? JSON.stringify(structuredData) : null
      const res = insertMsg.run(conversationId, role, content, sJson)
      // Auto-set title from first user message if needed
      if (role === 'user') {
        const titleSnippet = formatTitle(content, 50)
        updateConv.run(titleSnippet, conversationId)
      } else {
        updateConv.run(null, conversationId)
      }
      return { id: res.lastInsertRowid, conversationId, role, content }
    },

    getMessages(conversationId) {
      const rows = selectMsgs.all(conversationId)
      return rows.map(r => ({
        id: r.id,
        role: r.role,
        content: r.content,
        structuredData: r.structured_data ? JSON.parse(r.structured_data) : null,
        createdAt: r.created_at
      }))
    },

    delete(id, userId) {
      if (userId) {
        return db.prepare('DELETE FROM conversations WHERE id = ? AND (user_id = ? OR user_id IS NULL)').run(id, userId)
      }
      return db.prepare('DELETE FROM conversations WHERE id = ? AND user_id IS NULL').run(id)
    },

    rename(id, userId, title) {
      if (userId) {
        return db.prepare(`
          UPDATE conversations SET title = ?, updated_at = datetime('now')
          WHERE id = ? AND (user_id = ? OR user_id IS NULL)
        `).run(title, id, userId)
      }
      return db.prepare(`
        UPDATE conversations SET title = ?, updated_at = datetime('now')
        WHERE id = ? AND user_id IS NULL
      `).run(title, id)
    }
  }
}

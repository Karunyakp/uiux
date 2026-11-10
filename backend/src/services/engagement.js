import { tx } from '../db.js'

export function engagementService(db) {
  const topicId = key => db.prepare('SELECT id FROM topics WHERE key = ?').get(key)?.id ?? null

  const self = {
    topicId,
    // saved answers
    savedKeys: uid => {
      const tKeys = db.prepare(`SELECT t.key FROM saved_answers s JOIN topics t ON t.id = s.topic_id WHERE s.user_id = ?`).all(uid).map(r => r.key)
      const iKeys = db.prepare(`SELECT item_key FROM saved_items WHERE user_id = ?`).all(uid).map(r => r.item_key)
      return Array.from(new Set([...tKeys, ...iKeys]))
    },
    save: (uid, tid) => db.prepare('INSERT OR IGNORE INTO saved_answers (user_id, topic_id) VALUES (?, ?)').run(uid, tid),
    unsave: (uid, tid) => db.prepare('DELETE FROM saved_answers WHERE user_id = ? AND topic_id = ?').run(uid, tid),
    saveItem: (uid, key, { title = '', content = '', metadata = null } = {}) => {
      const tid = topicId(String(key).toLowerCase())
      if (tid) {
        db.prepare('INSERT OR IGNORE INTO saved_answers (user_id, topic_id) VALUES (?, ?)').run(uid, tid)
      }
      db.prepare(`INSERT OR REPLACE INTO saved_items (user_id, item_key, title, content, metadata) VALUES (?, ?, ?, ?, ?)`).run(
        uid,
        String(key),
        title,
        content,
        metadata ? JSON.stringify(metadata) : null
      )
    },
    unsaveItem: (uid, key) => {
      const tid = topicId(String(key).toLowerCase())
      if (tid) {
        db.prepare('DELETE FROM saved_answers WHERE user_id = ? AND topic_id = ?').run(uid, tid)
      }
      db.prepare('DELETE FROM saved_items WHERE user_id = ? AND item_key = ?').run(uid, String(key))
    },
    savedList: uid => {
      return db.prepare(`SELECT id, item_key AS itemKey, title, content, metadata, created_at AS createdAt FROM saved_items WHERE user_id = ? ORDER BY id DESC`).all(uid).map(r => ({
        ...r,
        metadata: r.metadata ? JSON.parse(r.metadata) : null
      }))
    },

    // reports & feedback
    addReport: (uid, tid, kind, details) => Number(db.prepare('INSERT INTO reports (user_id, topic_id, kind, details) VALUES (?, ?, ?, ?)')
      .run(uid, tid, kind, details).lastInsertRowid),
    addFeedback: (uid, message, rating) => Number(db.prepare('INSERT INTO feedback (user_id, message, rating) VALUES (?, ?, ?)')
      .run(uid, message, rating).lastInsertRowid),

    // follow-ups
    addFollowup: (uid, tid, question, r) => Number(db.prepare(`INSERT INTO followups
      (user_id, topic_id, question, answer, matched_topic_key, confidence_level, grounded) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(uid, tid, question, r.answer, r.matchedKey, r.level, r.grounded ? 1 : 0).lastInsertRowid),
    followups: (uid, tid) => db.prepare(`SELECT id, question, answer, matched_topic_key AS matchedKey,
      confidence_level AS level, grounded, created_at AS createdAt FROM followups
      WHERE user_id = ? AND topic_id = ? ORDER BY id`).all(uid, tid).map(f => ({ ...f, grounded: !!f.grounded })),

    // verification checklist
    checklist: uid => db.prepare(`SELECT i.id, i.label, COALESCE(p.done, 0) AS done FROM checklist_items i
      LEFT JOIN checklist_progress p ON p.item_id = i.id AND p.user_id = ? ORDER BY i.position`).all(uid)
      .map(i => ({ ...i, done: !!i.done })),
    setChecklist(uid, itemId, done) {
      if (!db.prepare('SELECT 1 FROM checklist_items WHERE id = ?').get(itemId)) return false
      db.prepare(`INSERT INTO checklist_progress (user_id, item_id, done) VALUES (?, ?, ?)
        ON CONFLICT (user_id, item_id) DO UPDATE SET done = excluded.done`).run(uid, itemId, done ? 1 : 0)
      return true
    },

    // notifications
    notify: (uid, title, body = '') => db.prepare('INSERT INTO notifications (user_id, title, body) VALUES (?, ?, ?)').run(uid, title, body),
    notifications: uid => db.prepare(`SELECT id, title, body, is_read AS isRead, created_at AS createdAt FROM notifications
      WHERE user_id = ? ORDER BY id DESC LIMIT 50`).all(uid).map(n => ({ ...n, isRead: !!n.isRead })),
    markAllRead: uid => db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(uid).changes,

    audit: (uid, action, meta) => db.prepare('INSERT INTO audit_log (user_id, action, meta) VALUES (?, ?, ?)')
      .run(uid ?? null, action, meta ? JSON.stringify(meta) : null),

    // admin
    reports: status => db.prepare(`SELECT r.id, r.kind, r.details, r.status, r.created_at AS createdAt,
      t.key AS topicKey, u.id AS userId, u.name AS userName FROM reports r
      JOIN topics t ON t.id = r.topic_id JOIN users u ON u.id = r.user_id
      WHERE (? IS NULL OR r.status = ?) ORDER BY r.id DESC LIMIT 200`).all(status, status),
    setReportStatus(id, status) {
      return tx(db, () => {
        const r = db.prepare('SELECT user_id, status FROM reports WHERE id = ?').get(id)
        if (!r) return false
        db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(status, id)
        if (r.status !== status && status !== 'open')
          self.notify(r.user_id, 'Your report was reviewed', `Report #${id} was marked ${status}.`)
        return true
      })
    },
    feedbackList: () => db.prepare(`SELECT f.id, f.message, f.rating, f.created_at AS createdAt, u.name AS userName
      FROM feedback f JOIN users u ON u.id = f.user_id ORDER BY f.id DESC LIMIT 200`).all(),
    stats: () => ({
      users: db.prepare('SELECT COUNT(*) AS n FROM users WHERE is_guest = 0').get().n,
      guests: db.prepare('SELECT COUNT(*) AS n FROM users WHERE is_guest = 1').get().n,
      topics: db.prepare('SELECT COUNT(*) AS n FROM topics').get().n,
      sources: db.prepare('SELECT COUNT(*) AS n FROM sources').get().n,
      openReports: db.prepare("SELECT COUNT(*) AS n FROM reports WHERE status = 'open'").get().n,
      feedback: db.prepare('SELECT COUNT(*) AS n FROM feedback').get().n,
      followups: db.prepare('SELECT COUNT(*) AS n FROM followups').get().n,
      ungroundedFollowups: db.prepare('SELECT COUNT(*) AS n FROM followups WHERE grounded = 0').get().n
    })
  }
  return self
}

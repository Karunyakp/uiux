import { tx } from '../db.js'
import { computeConfidence, levelFor } from '../lib/confidence.js'
import { sanitizeAnswerHtml } from '../lib/text.js'

export function topicsService(db) {
  const reasons = id => db.prepare('SELECT text FROM topic_reasons WHERE topic_id = ? ORDER BY position').all(id).map(r => r.text)
  const evidenceFor = id => db.prepare(`
    SELECT e.id, e.paragraph, e.page, e.section, e.published_on, e.last_checked,
           s.id AS source_id, s.title, s.type, s.publisher, s.url, s.is_official, s.trust_score
    FROM evidence e JOIN sources s ON s.id = e.source_id WHERE e.topic_id = ? ORDER BY e.id`).all(id)

  /** Shape used by the React dashboard. */
  function toUi(t) {
    const ev = evidenceFor(t.id)
    const first = ev[0]
    const types = [...new Set(ev.map(e => e.type))]
    return {
      key: t.key, n: t.name, s: t.subtitle, ic: t.icon, q: t.question, claim: t.claim,
      lvl: t.confidence_level, pct: t.confidence_pct, ex: t.explanation,
      why: reasons(t.id), a: t.answer_html, by: t.before_you_act,
      src: !first ? 'No source found' : ev.length === 1 ? first.title : `${first.title} + ${ev.length - 1} more`,
      type: !first ? '—' : types.length === 1 ? types[0] : 'Mixed',
      para: first ? first.paragraph : t.no_evidence_note,
      page: first?.page ?? '—', sec: first?.section ?? '—',
      pub: first?.published_on ?? '—', chk: first?.last_checked ?? '—',
      n1: ev.length
    }
  }

  const self = {
    toUi,
    reasons,
    evidenceFor,
    rawByKey: key => db.prepare('SELECT * FROM topics WHERE key = ?').get(key),
    rawPublished: () => db.prepare("SELECT * FROM topics WHERE status = 'published' ORDER BY sort_order, id").all(),

    list({ q = '', includeDrafts = false } = {}) {
      const rows = includeDrafts
        ? db.prepare('SELECT * FROM topics ORDER BY sort_order, id').all()
        : self.rawPublished()
      const needle = q.trim().toLowerCase()
      const hit = rows.filter(t => !needle || `${t.question} ${t.claim} ${t.name}`.toLowerCase().includes(needle))
      const topics = {}
      for (const t of hit) topics[t.key] = toUi(t)
      return { order: hit.map(t => t.key), topics }
    },

    get(key, { includeDrafts = false } = {}) {
      const t = self.rawByKey(key)
      if (!t || (t.status !== 'published' && !includeDrafts)) return null
      return { ...toUi(t), evidence: evidenceFor(t.id).map(e => ({
        id: e.id, paragraph: e.paragraph, page: e.page, section: e.section,
        publishedOn: e.published_on, lastChecked: e.last_checked,
        source: { id: e.source_id, title: e.title, type: e.type, publisher: e.publisher, url: e.url, isOfficial: !!e.is_official }
      })) }
    },

    recomputeConfidence(topicId, conflicting = false) {
      const srcs = evidenceFor(topicId)
      const { pct, level } = computeConfidence({ sources: srcs, conflicting })
      db.prepare("UPDATE topics SET confidence_pct = ?, confidence_level = ?, updated_at = datetime('now') WHERE id = ?").run(pct, level, topicId)
      return { pct, level }
    },

    create(d) {
      return tx(db, () => {
        const pct = d.confidencePct ?? 15
        const r = db.prepare(`INSERT INTO topics
          (key, name, subtitle, icon, question, claim, answer_html, before_you_act, explanation, no_evidence_note,
           confidence_pct, confidence_level, sort_order, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
          d.key, d.name, d.subtitle ?? '', d.icon ?? 'help', d.question, d.claim, sanitizeAnswerHtml(d.answerHtml),
          d.beforeYouAct ?? '', d.explanation ?? '', d.noEvidenceNote ?? 'Nothing to show.',
          pct, d.confidenceLevel ?? levelFor(pct),
          d.sortOrder ?? (db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM topics').get().n),
          d.status ?? 'published')
        const id = Number(r.lastInsertRowid)
        ;(d.reasons ?? []).forEach((text, i) =>
          db.prepare('INSERT INTO topic_reasons (topic_id, position, text) VALUES (?, ?, ?)').run(id, i, text))
        return self.rawByKey(d.key)
      })
    },

    update(key, d) {
      const t = self.rawByKey(key)
      if (!t) return null
      return tx(db, () => {
        const map = {
          name: 'name', subtitle: 'subtitle', icon: 'icon', question: 'question', claim: 'claim',
          beforeYouAct: 'before_you_act', explanation: 'explanation', noEvidenceNote: 'no_evidence_note',
          sortOrder: 'sort_order', status: 'status', confidencePct: 'confidence_pct', confidenceLevel: 'confidence_level'
        }
        const sets = []; const vals = []
        for (const [k, col] of Object.entries(map)) if (d[k] !== undefined) { sets.push(`${col} = ?`); vals.push(d[k]) }
        if (d.answerHtml !== undefined) { sets.push('answer_html = ?'); vals.push(sanitizeAnswerHtml(d.answerHtml)) }
        if (d.confidencePct !== undefined && d.confidenceLevel === undefined) { sets.push('confidence_level = ?'); vals.push(levelFor(d.confidencePct)) }
        if (sets.length) db.prepare(`UPDATE topics SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...vals, t.id)
        if (d.reasons) {
          db.prepare('DELETE FROM topic_reasons WHERE topic_id = ?').run(t.id)
          d.reasons.forEach((text, i) =>
            db.prepare('INSERT INTO topic_reasons (topic_id, position, text) VALUES (?, ?, ?)').run(t.id, i, text))
        }
        return self.rawByKey(key)
      })
    },

    remove: key => db.prepare('DELETE FROM topics WHERE key = ?').run(key).changes > 0,

    // Sources & evidence
    listSources: () => db.prepare('SELECT id, title, type, publisher, url, is_official AS isOfficial, trust_score AS trustScore FROM sources ORDER BY id').all()
      .map(s => ({ ...s, isOfficial: !!s.isOfficial })),
    createSource: s => {
      const r = db.prepare('INSERT INTO sources (title, type, publisher, url, is_official, trust_score) VALUES (?, ?, ?, ?, ?, ?)')
        .run(s.title, s.type ?? 'Other', s.publisher ?? null, s.url ?? null, s.isOfficial ? 1 : 0, s.trustScore ?? 50)
      return Number(r.lastInsertRowid)
    },
    attachEvidence(topicId, e) {
      db.prepare(`INSERT INTO evidence (topic_id, source_id, paragraph, page, section, published_on, last_checked)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (topic_id, source_id) DO UPDATE SET paragraph = excluded.paragraph, page = excluded.page,
          section = excluded.section, published_on = excluded.published_on, last_checked = excluded.last_checked`)
        .run(topicId, e.sourceId, e.paragraph, e.page, e.section, e.publishedOn, e.lastChecked)
    },
    sourceExists: id => !!db.prepare('SELECT 1 FROM sources WHERE id = ?').get(id)
  }
  return self
}

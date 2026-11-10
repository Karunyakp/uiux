import { stripTags, tokens } from '../lib/text.js'

const NOT_FOUND = 'TrustLens can’t answer this from the available evidence. Check the official source before acting on any claim about it.'

/**
 * Evidence-first follow-up answering. It only ever repeats what a published topic already states;
 * if nothing matches closely enough it says so instead of guessing.
 */
export function assistantService(topics) {
  return {
    answer(question) {
      const qt = tokens(question)
      let best = null
      if (qt.length) {
        for (const t of topics.rawPublished()) {
          const doc = new Set(tokens(`${t.question} ${t.claim} ${t.name} ${stripTags(t.answer_html)}`))
          const overlap = qt.filter(w => doc.has(w)).length
          const score = overlap / qt.length
          if (overlap >= 2 && score >= 0.4 && (!best || score > best.score)) best = { t, score }
        }
      }
      if (!best) return { answer: NOT_FOUND, matchedKey: null, level: 'Low', pct: 15, grounded: false }
      const ui = topics.toUi(best.t)
      const plain = stripTags(ui.a)
      const sources = ui.n1 ? `Sources consulted: ${ui.n1}.` : 'No supporting source was found.'
      return {
        answer: `Closest match: “${ui.n}”. ${plain} ${sources} Confirm with the official notification before acting.`,
        matchedKey: ui.key, level: ui.lvl, pct: ui.pct, grounded: ui.n1 > 0
      }
    }
  }
}

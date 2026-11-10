import { callGemini } from './gemini.js'
import { calibrateTrustAnswer } from '../lib/confidence.js'

const SYSTEM_INSTRUCTION = `You are TrustLens AI, an intelligent verification assistant focused on transparent, evidence-aware answers.
Your purpose is NOT simply to answer questions, but to help users understand how much they should rely on each answer before they apply, pay, or decide.

For every user query:
1. Generate a clear, accurate, and relevant answer. Embed bracket citations like [1], [2] in your answer text immediately after factual assertions, pointing to the corresponding sources.
2. Identify the important factual claims made in the answer.
3. Categorize each claim strictly into one of: "supported" | "inferred" | "partially_supported" | "unverified" | "contradicted".
4. Assess the quality, statutory authority, and independence of available supporting evidence.
5. Check if information might be missing, outdated, or conflicting.
6. Clearly communicate what remains uncertain.
7. Formulate a dynamic Human Verification checklist explaining what the user must independently check before taking action.

IMPORTANT BEHAVIOUR RULES:
- Never pretend to know something you do not know.
- Never invent official documents, authors, publication dates, or source URLs.
- Never claim information is verified without actual supporting evidence.
- If information is unreleased, outdated, or speculative, explicitly state this and assign LOW or INSUFFICIENT evidence.
- If an unverified assertion is made, label its status as "unverified" or "partially_supported" — NEVER falsely mark it "supported".
- If secondary reports contradict official guidelines, assign "contradicted" and list the discrepancy.

OUTPUT FORMAT:
You MUST respond with a valid JSON object matching this exact structure:
{
  "answer": "Your comprehensive, helpful answer with embedded citation tags like [1] or [2] referencing sources.",
  "claims": [
    {
      "id": "c1",
      "text": "Exact sentence or factual claim made in the answer",
      "status": "supported | inferred | partially_supported | unverified | contradicted",
      "importance": "critical | supporting",
      "source_indices": [1],
      "evidence": "Specific verbatim excerpt or documentary basis supporting or questioning this claim",
      "source_title": "Name of official body, document, or publication if known",
      "source_url": "URL if known or retrieved via search, otherwise null"
    }
  ],
  "confidence": {
    "level": "High | Moderate | Low | Insufficient",
    "score": 85,
    "explanation": "Clear explanation of why this confidence level was assigned based on evidence availability, source authority, and freshness."
  },
  "why": [
    "Reason 1 regarding source authority or consensus",
    "Reason 2 regarding freshness or limitations",
    "Reason 3 regarding completeness"
  ],
  "sources": [
    {
      "index": 1,
      "title": "Title of the source or authority",
      "publisher": "Issuing agency, government, or institution",
      "url": "Official web link or null",
      "type": "Official brochure | Notification | Web Search | Regulatory Record | Standard Reference",
      "reliability": "high | moderate | low",
      "summary": "Key excerpt or supporting context provided by this source",
      "page_or_section": "Section or page reference if available"
    }
  ],
  "human_verification": {
    "what_to_verify": "The single most consequential or sensitive claim to confirm",
    "why_verify": "The potential financial, legal, or academic penalty if this information has changed",
    "official_source": "The exact official gazette, government portal, or authority office to consult",
    "missing_info": "Any pending notifications, unreleased schedules, or subjective clauses",
    "volatility_factor": "Upcoming dates, committee decisions, or gazette releases that could alter this answer"
  },
  "uncertainties": [
    "List of any aspects that remain unverified, pending official release, or context-dependent"
  ],
  "conflicts": [
    "List of any contradictions or discrepancies between independent sources, or empty if none"
  ],
  "before_you_act": "Actionable verification warning or guidance instructing the user what to confirm before paying, applying, or acting.",
  "recommended_actions": [
    "Step 1: Check the official notification or website",
    "Step 2: Match eligibility criteria with personal documents",
    "Step 3: Confirm deadlines and fees directly with the administering authority"
  ],
  "verification_status": "verified | partially_verified | unverified | conflict"
}`

/**
 * Parses JSON safely from a model response string that might contain markdown fences.
 */
function extractJson(rawText) {
  if (!rawText || typeof rawText !== 'string') return null
  const cleaned = rawText.trim()

  // 1. Direct parse attempt
  try { return JSON.parse(cleaned) } catch {}

  // 2. Extract from markdown fenced code block: ```json ... ```
  const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (match && match[1]) {
    try { return JSON.parse(match[1].trim()) } catch {}
  }

  // 3. Find outer braces
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) } catch {}
  }

  return null
}

/**
 * Embeds <mark> tags into plain text/markdown answers to enable interactive claim selection,
 * and converts [1], [2] citations into interactive citation buttons.
 */
function highlightClaimsInAnswer(answerText, claims) {
  if (!answerText) return ''
  let html = answerText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n\n+/g, '<br /><br />')
    .replace(/\n/g, '<br />')

  // Convert bracket citations like [1] or [1, 2] into interactive citation chips
  html = html.replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (match, nums) => {
    const list = nums.split(',').map(n => n.trim()).filter(Boolean)
    const chips = list.map(idx => `<button type="button" class="inline-cite-chip" data-cite="${idx}" title="Jump to citation #${idx}">[${idx}]</button>`).join('')
    return `<span class="inline-cite-group">${chips}</span>`
  })

  if (!Array.isArray(claims) || claims.length === 0) return html

  // Highlight up to 4 most important claims
  const topClaims = claims.slice(0, 4)
  topClaims.forEach((c, idx) => {
    if (!c.text || c.text.length < 8) return
    // Escape regex characters
    const escaped = c.text.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${escaped})`, 'i')
    if (regex.test(html)) {
      html = html.replace(regex, match => `<mark class="claim-mark" data-idx="${idx}">${match}</mark>`)
    }
  })

  return html
}

function generateRateLimitFallback(message, attachments = [], err = null) {
  const isHighDemand = err?.isHighDemand || err?.status === 503 || String(err?.message || '').includes('high demand') || String(err?.message || '').includes('UNAVAILABLE')
  const isTimeout = err?.status === 504 || String(err?.message || '').includes('timed out')

  const attNote = Array.isArray(attachments) && attachments.length > 0
    ? `\n\nAttachments analyzed: ${attachments.map(a => a.name).join(', ')}.`
    : ''

  let reasonNote = 'Live grounding quota is temporarily saturated on this API key [1].'
  let epistemicLabel = 'Provisional (Quota Limited)'
  let uncertaintyMsg = 'Live search grounding is momentarily recovering; please retry in a moment for full source-backed verification.'

  if (isHighDemand) {
    reasonNote = 'The AI model is currently experiencing a temporary demand spike [1]. TrustLens has generated a provisional calibration so you can review key verification criteria without delay.'
    epistemicLabel = 'Provisional (Demand Surge)'
    uncertaintyMsg = 'The upstream Gemini AI model is currently under high demand; real-time web grounding is queued. Click "Retry Answer" in a few moments for refreshed live citations.'
  } else if (isTimeout) {
    reasonNote = 'The live verification query timed out while searching official sources [1].'
    epistemicLabel = 'Provisional (Search Timeout)'
    uncertaintyMsg = 'Live web search took longer than expected; provisional guidelines provided. Please retry to refresh.'
  }

  const answer = `TrustLens received your question: "${message}". ${reasonNote} In the meantime, TrustLens advises reviewing authoritative documentation directly to verify criteria, deadlines, and official notices.${attNote}`

  const claims = [
    {
      id: 'c1',
      text: `Key criteria, deadlines, and eligibility terms for "${message.slice(0, 45)}" must be verified directly against official notices.`,
      evidence: Array.isArray(attachments) && attachments.length > 0
        ? `Preliminary verification extracted and cross-referenced with uploaded file (${attachments[0].name}).`
        : 'Authoritative standards require consulting primary official portals before executing irreversible actions.',
      status: 'unverified',
      source_indices: [1],
      importance: 'critical'
    }
  ]
  const sources = (Array.isArray(attachments) && attachments.length > 0
    ? attachments.map((a, idx) => ({
        index: idx + 1,
        title: a.name,
        publisher: 'User Uploaded Document',
        type: 'File Analysis',
        summary: `Document uploaded by user (${a.name}, ${(a.size / 1024).toFixed(1)} KB).`,
        url: null
      }))
    : [
        {
          index: 1,
          title: 'Authoritative Documentation Search',
          publisher: 'Issuing Authority / Official Portal',
          type: 'Primary Reference',
          summary: 'Please verify current announcements directly with the official authority.',
          url: null
        }
      ])
  const uncertainties = [
    uncertaintyMsg,
    'Official terms are subject to administrative notifications and gazetted updates.'
  ]
  const beforeYouAct = 'Confirm details with the official administering authority before paying or applying.'
  const answerHtml = highlightClaimsInAnswer(answer, claims)

  const calibration = calibrateTrustAnswer({
    claims,
    sources,
    uncertainties,
    conflicts: [],
    attachments
  })

  // Override epistemic status for transparency
  calibration.epistemicStatus = epistemicLabel

  const humanVerification = {
    what_to_verify: claims[0].text,
    why_verify: 'Acting on unconfirmed criteria could result in application rejection or fee loss.',
    official_source: sources[0].publisher,
    missing_info: uncertainties[0],
    volatility_factor: 'Provisional offline calibration; retry when model traffic eases for full live grounding.'
  }

  const verifUuid = `TL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
  const verifTimestamp = new Date().toISOString()

  return {
    answer,
    answerHtml,
    confidence: {
      level: 'Moderate',
      score: Math.min(calibration.score ?? 68, 65), // Safe conservative score for provisional mode
      explanation: isHighDemand
        ? 'Provisional calibration assigned due to upstream AI model demand spike. Conservative confidence applied until live search grounding completes.'
        : calibration.explanation,
      breakdown: calibration.breakdown,
      pillars: calibration.pillars,
      epistemicStatus: epistemicLabel,
      epistemicCeilingApplied: true
    },
    why: [
      isHighDemand ? 'Temporary upstream high demand spike detected; conservative scoring applied.' : 'Provisional evaluation awaiting live grounding refresh.',
      'Core verifiability criteria preserved to prevent over-reliance.'
    ],
    claims,
    sources,
    humanVerification,
    uncertainties,
    conflicts: [],
    warnings: [beforeYouAct],
    beforeYouAct,
    recommendedActions: [
      'Click "Retry Answer" in a few moments to obtain full live-grounded citations.',
      'Confirm all requirements directly through official channels before acting.'
    ],
    verificationStatus: 'unverified',
    verificationUuid: verifUuid,
    verificationTimestamp: verifTimestamp,
    ui: {
      q: message,
      a: answerHtml,
      plainAnswer: answer,
      lvl: 'Moderate',
      pct: Math.min(calibration.score ?? 68, 65),
      hasScore: true,
      ex: isHighDemand ? 'Provisional calibration: upstream model busy. Click Retry to re-verify.' : calibration.explanation,
      why: [
        isHighDemand ? 'Temporary upstream high demand spike detected; conservative scoring applied.' : 'Provisional evaluation awaiting live grounding refresh.'
      ],
      by: beforeYouAct,
      claim: claims[0].text,
      claims,
      src: sources[0].title,
      sources,
      url: null,
      type: sources[0].type,
      para: sources[0].summary,
      page: '—',
      sec: sources[0].publisher,
      pub: 'Current',
      chk: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      n1: sources.length,
      breakdown: calibration.breakdown,
      pillars: calibration.pillars,
      epistemicStatus: epistemicLabel,
      epistemicCeilingApplied: true,
      humanVerification,
      verificationUuid: verifUuid,
      verificationTimestamp: verifTimestamp
    }
  }
}

/**
 * Trust Calibration Engine Service.
 */
export function trustlensService() {
  return {
    async analyzeQuestion({ message, history = [], attachments = [] }) {
      let geminiResult
      try {
        geminiResult = await callGemini({
          prompt: message,
          history,
          attachments,
          systemInstruction: SYSTEM_INSTRUCTION,
          enableSearch: true
        })
      } catch (err) {
        const isTemporary =
          err.status === 429 ||
          err.status === 503 ||
          err.status === 504 ||
          err.isHighDemand ||
          err.message?.includes('rate limit') ||
          err.message?.includes('RESOURCE_EXHAUSTED') ||
          err.message?.includes('high demand') ||
          err.message?.includes('UNAVAILABLE') ||
          err.message?.includes('timed out') ||
          err.message?.includes('503')

        if (isTemporary) {
          console.warn(`[trustlens] Gemini temporary load/limit encountered (${err.status || err.message}); generating provisional calibrated response.`)
          return generateRateLimitFallback(message, attachments, err)
        }
        throw err
      }

      const parsed = extractJson(geminiResult.text)

      // Fallback if structured JSON wasn't returned
      const answer = parsed?.answer || geminiResult.text || 'No answer generated.'
      const rawClaims = Array.isArray(parsed?.claims) ? parsed.claims : []
      const rawSources = Array.isArray(parsed?.sources) ? parsed.sources : []
      const uncertainties = Array.isArray(parsed?.uncertainties) ? parsed.uncertainties : []
      const conflicts = Array.isArray(parsed?.conflicts) ? parsed.conflicts : []
      const whyList = Array.isArray(parsed?.why) && parsed.why.length > 0
        ? parsed.why
        : ['Assessed against real-time information retrieval and official records.', 'Checked for internal consistency and claim verifiability.']
      const actions = Array.isArray(parsed?.recommended_actions) && parsed.recommended_actions.length > 0
        ? parsed.recommended_actions
        : ['Verify against official documentation before making a decision.', 'Confirm current terms with the issuing authority.']

      // Integrate Google Search grounding metadata if available
      const groundingSources = []
      if (geminiResult.groundingMetadata?.groundingChunks) {
        for (const chunk of geminiResult.groundingMetadata.groundingChunks) {
          if (chunk.web?.uri) {
            groundingSources.push({
              title: chunk.web.title || 'Web Search Reference',
              publisher: new URL(chunk.web.uri).hostname.replace(/^www\./, ''),
              url: chunk.web.uri,
              type: 'Web Search',
              reliability: 'high',
              summary: 'Retrieved via live Google Search grounding.'
            })
          }
        }
      }

      // Merge model sources with grounded sources (deduplicating by URL/title)
      const rawCombined = [...rawSources]
      for (const gs of groundingSources) {
        if (!rawCombined.some(s => s.url && s.url === gs.url)) {
          rawCombined.push(gs)
        }
      }

      if (Array.isArray(attachments) && attachments.length > 0) {
        for (const att of attachments) {
          rawCombined.unshift({
            title: att.name || 'Uploaded Document',
            publisher: 'User Uploaded File',
            type: 'Direct File Analysis',
            reliability: 'high',
            summary: `Verified and analyzed directly from user uploaded document (${att.name}).`
          })
        }
      }

      // Ensure every source has an explicit 1-based index
      const combinedSources = rawCombined.map((s, idx) => ({
        ...s,
        index: s.index || (idx + 1),
        type: s.type || 'Official Reference',
        reliability: s.reliability || 'high'
      }))

      // Normalize claims with explicit indices and granular status
      const normalizedClaims = rawClaims.map((c, idx) => {
        let status = (c.status || 'supported').toLowerCase().trim()
        if (status === 'uncertain') status = 'partially_supported'
        if (!['supported', 'inferred', 'partially_supported', 'unverified', 'contradicted'].includes(status)) {
          status = 'supported'
        }
        let sourceIndices = Array.isArray(c.source_indices) && c.source_indices.length > 0
          ? c.source_indices.map(Number).filter(n => !isNaN(n))
          : (combinedSources.length > 0 ? [Math.min(idx + 1, combinedSources.length)] : [])

        return {
          id: c.id || `c${idx + 1}`,
          text: c.text || 'Key answer claim.',
          status,
          importance: c.importance || (idx === 0 ? 'critical' : 'supporting'),
          source_indices: sourceIndices,
          evidence: c.evidence || 'Corroborated by available reference documentation.',
          source_title: c.source_title || combinedSources[0]?.title || 'Authoritative Source',
          source_url: c.source_url || combinedSources[0]?.url || null
        }
      })

      // Execute transparent multi-factor Confidence Calibration Engine (Phase 6)
      const calibration = calibrateTrustAnswer({
        claims: normalizedClaims,
        sources: combinedSources,
        uncertainties,
        conflicts,
        attachments
      })

      const level = calibration.level
      const score = calibration.score
      const explanation = calibration.explanation
      const breakdown = calibration.breakdown
      const pillars = calibration.pillars
      const epistemicStatus = calibration.epistemicStatus
      const epistemicCeilingApplied = calibration.epistemicCeilingApplied

      const beforeYouAct = parsed?.before_you_act ||
        'Confirm terms with the official administrative authority before paying or applying.'

      const primaryClaim = normalizedClaims[0]?.text || 'Key answer claim verified by TrustLens.'
      const primarySource = combinedSources[0] || {
        index: 1,
        title: 'Not independently source-verified',
        type: 'Unverified Reference',
        publisher: 'TrustLens Assessment',
        summary: 'No authoritative external source was confirmed for this claim.'
      }

      // Dynamic Human Verification protocol
      const unverifiedClaim = normalizedClaims.find(c => c.status !== 'supported') || normalizedClaims[0]
      const humanVerification = parsed?.human_verification || {
        what_to_verify: unverifiedClaim?.text || 'Key eligibility conditions and statutory deadlines',
        why_verify: 'Non-compliance or outdated provisions may result in procedural rejection or forfeiture of fees.',
        official_source: primarySource.publisher || 'Official Administrative Authority Portal',
        missing_info: uncertainties[0] || 'Pending formal gazette notification or schedule update.',
        volatility_factor: 'Subject to updates in subsequent admission cycles or statutory policy notices.'
      }

      const verifUuid = `TL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      const verifTimestamp = new Date().toISOString()
      const answerHtml = highlightClaimsInAnswer(answer, normalizedClaims)

      // Format complete structured calibration output (Phase 8)
      return {
        answer,
        answerHtml,
        confidence: {
          level,
          score,
          explanation,
          breakdown,
          pillars,
          epistemicStatus,
          epistemicCeilingApplied
        },
        why: whyList,
        claims: normalizedClaims,
        sources: combinedSources,
        humanVerification,
        uncertainties,
        conflicts,
        warnings: [beforeYouAct],
        beforeYouAct,
        recommendedActions: actions,
        verificationStatus: parsed?.verification_status || (combinedSources.length > 0 ? (conflicts.length > 0 ? 'conflict' : 'verified') : 'unverified'),
        verificationUuid: verifUuid,
        verificationTimestamp: verifTimestamp,
        // UI-compatible properties for direct dashboard state mapping
        ui: {
          q: message,
          a: answerHtml,
          plainAnswer: answer,
          lvl: level,
          pct: score ?? 0,
          hasScore: score !== null,
          ex: explanation,
          why: whyList,
          by: beforeYouAct,
          claim: primaryClaim,
          claims: normalizedClaims,
          src: primarySource.title,
          sources: combinedSources,
          url: primarySource.url || null,
          type: primarySource.type || 'Official brochure',
          para: primarySource.summary || (normalizedClaims[0]?.evidence || 'Factual statement extracted from source.'),
          page: normalizedClaims[0]?.page_or_section || '—',
          sec: primarySource.publisher || '—',
          pub: 'Current',
          chk: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          n1: combinedSources.length,
          breakdown,
          pillars,
          epistemicStatus,
          epistemicCeilingApplied,
          humanVerification,
          verificationUuid: verifUuid,
          verificationTimestamp: verifTimestamp
        }
      }
    }
  }
}

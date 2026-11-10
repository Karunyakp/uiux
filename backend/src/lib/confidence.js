export const levelFor = pct => (pct >= 70 ? 'High' : pct >= 40 ? 'Medium' : 'Low')

/**
 * Heuristic confidence score from the evidence behind an answer.
 * sources: [{ trust_score (0-100), is_official (0|1) }]
 * It rewards more and better sources and penalises disagreement.
 */
export function computeConfidence({ sources = [], conflicting = false } = {}) {
  if (!sources.length) return { pct: 15, level: 'Low' }
  const avg = sources.reduce((a, s) => a + (s.trust_score ?? 50), 0) / sources.length
  let pct = 35 + avg * 0.3 + Math.min(sources.length, 3) * 5
  if (sources.some(s => s.is_official)) pct += 8
  if (conflicting) pct -= 25
  pct = Math.max(5, Math.min(95, Math.round(pct)))
  return { pct, level: levelFor(pct) }
}

/**
 * Transparent, multi-factor Confidence Calibration Engine (Phase 6).
 * Computes explainable confidence metrics rather than relying on LLM self-reporting:
 * 1. Source Reliability (0-100)
 * 2. Evidence Strength (0-100)
 * 3. Claim Verification Status (0-100)
 * 4. Consistency & Uncertainty Penalty (0-100)
 */
export function calibrateTrustAnswer({
  claims = [],
  sources = [],
  uncertainties = [],
  conflicts = [],
  attachments = []
} = {}) {
  // 1. Source Reliability Evaluation
  let sourceScore = 15
  if (sources.length > 0) {
    const scores = sources.map(s => {
      const type = (s.type || '').toLowerCase()
      const publisher = (s.publisher || '').toLowerCase()
      const url = (s.url || '').toLowerCase()
      const isOfficial = s.isOfficial || s.is_official || type.includes('official') || type.includes('gazette')
      const isDoc = type.includes('file') || type.includes('document') || publisher.includes('uploaded')

      if (isOfficial || url.includes('.gov') || url.includes('.nic.in') || url.includes('.edu') || url.includes('.org')) {
        return 92
      } else if (isDoc) {
        return 88
      } else if (s.reliability === 'high' || url.startsWith('http')) {
        return 74
      } else if (s.reliability === 'moderate') {
        return 58
      }
      return 42
    })
    const avgSource = scores.reduce((sum, v) => sum + v, 0) / scores.length
    // Source count bonus (up to +8 for multiple corroborated sources)
    sourceScore = Math.min(95, Math.round(avgSource + Math.min(sources.length - 1, 2) * 4))
  }

  // 2. Evidence Strength Evaluation
  let evidenceScore = 20
  if (claims.length > 0) {
    let strongEvidenceCount = 0
    claims.forEach(c => {
      const ev = (c.evidence || '').trim()
      if (ev.length > 25) strongEvidenceCount += 1
      else if (ev.length > 10) strongEvidenceCount += 0.5
    })
    evidenceScore = Math.round((strongEvidenceCount / claims.length) * 100)
  }

  // 3. Claim Verification Status Evaluation
  let claimScore = 20
  let supportedClaimsCount = 0
  if (claims.length > 0) {
    let totalWeight = 0
    claims.forEach(c => {
      const status = (c.status || '').toLowerCase()
      if (status === 'supported' || status === 'verified') {
        totalWeight += 1.0
        supportedClaimsCount++
      } else if (status === 'inferred' || status === 'partially_supported') {
        totalWeight += 0.6
      } else if (status === 'unverified') {
        totalWeight += 0.25
      } else if (status === 'contradicted' || status === 'uncertain') {
        totalWeight -= 0.3
      } else {
        totalWeight += 0.3
      }
    })
    claimScore = Math.max(10, Math.min(100, Math.round((Math.max(0, totalWeight) / claims.length) * 100)))
  }

  // 4. Consistency & Uncertainty
  let consistencyScore = 100
  if (conflicts.length > 0) {
    consistencyScore -= conflicts.length * 35
  }
  if (uncertainties.length > 0) {
    consistencyScore -= uncertainties.length * 12
  }
  consistencyScore = Math.max(10, Math.min(100, consistencyScore))

  // 5. Overall Calibrated Score (Weighted blend: 35% Source + 35% Evidence + 20% Claims + 10% Consistency)
  let overallScore = Math.round(
    sourceScore * 0.35 +
    evidenceScore * 0.35 +
    claimScore * 0.20 +
    consistencyScore * 0.10
  )

  // Enforce epistemic ceiling: never display 100% or fabricated high confidence when sources are missing
  let epistemicCeilingApplied = false
  if (sources.length === 0 || supportedClaimsCount === 0) {
    if (overallScore > 30) {
      overallScore = Math.min(30, overallScore)
      epistemicCeilingApplied = true
    }
  } else if (conflicts.length > 0) {
    if (overallScore > 65) {
      overallScore = Math.min(65, overallScore)
      epistemicCeilingApplied = true
    }
  } else {
    overallScore = Math.max(15, Math.min(94, overallScore))
  }

  // Determine qualitative Level & Status
  let level = 'Moderate'
  let epistemicStatus = 'Partially Corroborated'
  if (overallScore >= 80 && sources.length >= 1 && conflicts.length === 0) {
    level = 'High'
    epistemicStatus = 'Grounded in Authoritative Sources'
  } else if (overallScore >= 55) {
    level = 'Moderate'
    epistemicStatus = conflicts.length > 0 ? 'Contested Evidence' : 'Partially Corroborated'
  } else if (overallScore >= 35) {
    level = 'Low'
    epistemicStatus = 'Limited Evidence / Caveated'
  } else {
    level = 'Insufficient'
    epistemicStatus = 'Unsubstantiated / High Volatility'
  }

  // Build Transparent Explanation
  let explanation = ''
  if (level === 'High') {
    explanation = `High confidence (${overallScore}%): Verified across ${sources.length} authoritative source${sources.length > 1 ? 's' : ''} with direct supporting evidence and zero detected contradictions.`
  } else if (level === 'Moderate') {
    explanation = `Moderate confidence (${overallScore}%): Information is generally consistent but involves secondary sources or caveats that warrant independent verification prior to final decision.`
  } else if (level === 'Low') {
    explanation = `Low confidence (${overallScore}%): Supporting evidence is limited or conflicting. Do not rely on this answer without primary verification.`
  } else {
    explanation = `Insufficient evidence (${overallScore}%): Key factual claims remain unverified by authoritative sources. Treat as provisional guidance.`
  }

  // 4 Transparent Rubric Pillars for UI inspection
  const pillars = [
    {
      id: 'evidence_coverage',
      name: 'Evidence Coverage',
      score: evidenceScore,
      weight: '35%',
      label: evidenceScore >= 75 ? 'Direct Grounding' : evidenceScore >= 45 ? 'Partial Citations' : 'Sparse Evidence',
      desc: 'Proportion of factual claims backed by explicit textual excerpts.'
    },
    {
      id: 'source_authority',
      name: 'Source Authority',
      score: sourceScore,
      weight: '35%',
      label: sourceScore >= 80 ? 'Official / Primary' : sourceScore >= 60 ? 'Institutional' : 'Secondary Web',
      desc: 'Quality and statutory authority of publishers (e.g. government, universities, official gazettes).'
    },
    {
      id: 'claim_consensus',
      name: 'Claim Consensus',
      score: claimScore,
      weight: '20%',
      label: claimScore >= 75 ? 'Strong Corroboration' : claimScore >= 50 ? 'Mixed Verification' : 'Unconfirmed',
      desc: 'Consistency of claims across multiple independent records without extrapolation.'
    },
    {
      id: 'freshness_consistency',
      name: 'Freshness & Consistency',
      score: consistencyScore,
      weight: '10%',
      label: consistencyScore >= 80 ? 'Consistent & Current' : consistencyScore >= 50 ? 'Caveats Flagged' : 'Discrepancies Found',
      desc: 'Absence of unresolved contradictions, expired provisions, or pending gazette revisions.'
    }
  ]

  return {
    level,
    score: overallScore,
    epistemicStatus,
    epistemicCeilingApplied,
    pillars,
    breakdown: {
      sourceReliability: sourceScore,
      evidenceStrength: evidenceScore,
      claimVerification: claimScore,
      consistency: consistencyScore,
      sourcesCount: sources.length,
      supportedClaimsCount,
      totalClaimsCount: claims.length
    },
    explanation
  }
}

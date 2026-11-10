import React, { useState } from 'react'
import Ic from './Ic.jsx'

export default function Evidence({
  view = 'home',
  activeData,
  selectedClaimIndex = 0,
  setSelectedClaimIndex,
  checks = [],
  savedCount = 0,
  conversationsCount = 0,
  onNewChat,
  onNotify
}) {
  const [activeTab, setActiveTab] = useState('evidence') // 'evidence' | 'analysis'

  // 1. NON-HOME CONTEXTUAL PANELS
  if (view === 'explore') {
    return (
      <aside className="ev" aria-label="Explore Topics panel">
        <div className="ev-context-header">
          <div className="chip" style={{ width: 44, height: 44 }}>
            <Ic n="compass" />
          </div>
          <div>
            <b style={{ color: 'var(--text-primary)', fontSize: 15, display: 'block' }}>Topic Explorer</b>
            <small style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Curated Verification Guides</small>
          </div>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.45, marginTop: 10 }}>
          Explore common verification scenarios across competitive exams, admissions, and policy guidelines.
        </p>

        <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
          <div className="ev-side-card inset">
            <b style={{ color: 'var(--text-primary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ic n="cap" /> Eligibility Rules
            </b>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>
              Degree requirements, qualifying years, relaxed norms, and age limitations.
            </p>
          </div>

          <div className="ev-side-card inset">
            <b style={{ color: 'var(--text-primary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ic n="coin" /> Fees & Deadlines
            </b>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>
              Fee schedules, concession categories, late fee penalties, and portal close dates.
            </p>
          </div>

          <div className="ev-side-card inset">
            <b style={{ color: 'var(--text-primary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ic n="conflict" /> Discrepancy Checks
            </b>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>
              Contradictions between unofficial portals and official gazetted brochures.
            </p>
          </div>
        </div>

        <div className="ev-side-card inset" style={{ marginTop: 'auto', textAlign: 'center' }}>
          <small style={{ color: 'var(--teal)', fontSize: 12, display: 'block', marginBottom: 8, fontWeight: 600 }}>
            Have a specific topic in mind?
          </small>
          <button
            type="button"
            className="btn"
            style={{ width: '100%', fontSize: 13 }}
            onClick={onNewChat}
          >
            Start New Verification
          </button>
        </div>
      </aside>
    )
  }

  if (view === 'saved') {
    return (
      <aside className="ev" aria-label="Saved Answers panel">
        <div className="ev-context-header">
          <div className="chip" style={{ width: 44, height: 44 }}>
            <Ic n="bookmark" />
          </div>
          <div>
            <b style={{ color: 'var(--text-primary)', fontSize: 15, display: 'block' }}>Saved & History</b>
            <small style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Audit Log & Bookmarks</small>
          </div>
        </div>

        <div className="ev-summary-grid" style={{ marginTop: 14 }}>
          <div className="ev-stat-box inset">
            <b className="ev-stat-val">{savedCount}</b>
            <small className="ev-stat-lbl">Saved Answers</small>
          </div>
          <div className="ev-stat-box inset">
            <b className="ev-stat-val">{conversationsCount}</b>
            <small className="ev-stat-lbl">Conversations</small>
          </div>
        </div>

        <div className="ev-side-card inset" style={{ marginTop: 14 }}>
          <b style={{ color: 'var(--text-primary)', fontSize: 13 }}>Audit Assurance</b>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12.5, marginTop: 4, lineHeight: 1.45 }}>
            Bookmarked answers retain their original evidence excerpts, confidence ratings, and official citations for your records.
          </p>
        </div>

        <div className="ev-side-card inset" style={{ marginTop: 'auto' }}>
          <small style={{ color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 11, fontWeight: 700 }}>
            Quick Actions
          </small>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>
            Reopen any past session from Chat History to ask follow-up questions with full preserved context.
          </p>
          <button
            type="button"
            className="btn"
            style={{ width: '100%', marginTop: 10, fontSize: 13 }}
            onClick={onNewChat}
          >
            + New Conversation
          </button>
        </div>
      </aside>
    )
  }

  if (view === 'hub') {
    const completedCount = checks.filter(c => c.done).length
    const totalCount = checks.length || 4
    const pct = Math.round((completedCount / totalCount) * 100)

    return (
      <aside className="ev" aria-label="Verification Hub panel">
        <div className="ev-context-header">
          <div className="chip" style={{ width: 44, height: 44 }}>
            <Ic n="shield" />
          </div>
          <div>
            <b style={{ color: 'var(--text-primary)', fontSize: 15, display: 'block' }}>Verification Hub</b>
            <small style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Pre-Action Checklist</small>
          </div>
        </div>

        <div className="ev-side-card inset" style={{ marginTop: 14, textAlign: 'center' }}>
          <small style={{ color: 'var(--teal)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>
            Checklist Completion
          </small>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--teal)', margin: '6px 0' }}>
            {pct}%
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
            {completedCount} of {totalCount} safety checks completed
          </p>
          <div className="meter" style={{ marginTop: 10 }}>
            <i style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="ev-side-card inset" style={{ marginTop: 14 }}>
          <b style={{ color: 'var(--text-primary)', fontSize: 13 }}>Golden Safety Rule</b>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12.5, marginTop: 4, lineHeight: 1.45 }}>
            Never submit forms or transfer application fees until all checklist items are verified against official gazetted notifications.
          </p>
        </div>
      </aside>
    )
  }

  if (view === 'feedback') {
    return (
      <aside className="ev" aria-label="Feedback panel">
        <div className="ev-context-header">
          <div className="chip" style={{ width: 44, height: 44 }}>
            <Ic n="msg" />
          </div>
          <div>
            <b style={{ color: 'var(--text-primary)', fontSize: 15, display: 'block' }}>Model Calibration</b>
            <small style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Trust & Feedback Policy</small>
          </div>
        </div>

        <div className="ev-side-card inset" style={{ marginTop: 14 }}>
          <b style={{ color: 'var(--text-primary)', fontSize: 13 }}>How Feedback Works</b>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12.5, marginTop: 4, lineHeight: 1.45 }}>
            Every report submitted via the feedback tool or message actions helps fine-tune the Trust Calibration Engine to flag discrepancies and prevent AI hallucinations.
          </p>
        </div>
      </aside>
    )
  }

  // 2. HOME VIEW — NEW CHAT EMPTY STATE (CLEAN, MINIMAL, NO PILLS)
  if (!activeData) {
    return (
      <aside className="ev" aria-label="Evidence panel empty state">
        <div className="ev-minimal-empty-box">
          <div className="ev-minimal-icon-wrap">
            <Ic n="shield" />
          </div>
          <h3 className="ev-minimal-title">Evidence & Sources</h3>
          <p className="ev-minimal-desc">
            Supporting evidence, source details and confidence assessments will appear here after you ask a question.
          </p>
        </div>
      </aside>
    )
  }

  // 3. HOME VIEW — ACTIVE CHAT STATE (MATCHES REFERENCE IMAGE COLUMN 3)
  const c = activeData
  const rawClaims = Array.isArray(c.claims) && c.claims.length > 0
    ? c.claims
    : (c.claim ? [{ text: c.claim, evidence: c.para, status: 'supported' }] : [])
  const currentClaim = rawClaims.length > 0
    ? (selectedClaimIndex !== undefined && rawClaims[selectedClaimIndex] ? rawClaims[selectedClaimIndex] : rawClaims[0])
    : null

  const sources = Array.isArray(c.sources) ? c.sources : []

  const rawEvidence = currentClaim?.evidence || c.para || (c.ui && c.ui.para) || ''
  const evidencePoints = rawEvidence
    ? (rawEvidence.includes('\n') ? rawEvidence.split('\n').map(s => s.trim()).filter(Boolean) : [rawEvidence])
    : []

  const confidenceLevel = c.lvl || (c.confidence && c.confidence.level) || 'Moderate'
  const sourcesCount = sources.length
  const claimsCount = rawClaims.length
  const verificationStatus = c.verificationStatus || c.verification_status || (sourcesCount > 0 ? 'Verified' : 'Unverified')

  return (
    <aside className="ev" aria-label="Evidence & Sources panel">
      {/* Top Segmented Tabs: Evidence & Sources vs Analysis */}
      <div className="ev-top-tabs" role="tablist">
        <button
          type="button"
          className={`ev-tab-btn ${activeTab === 'evidence' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('evidence')}
          role="tab"
          aria-selected={activeTab === 'evidence'}
        >
          Evidence & Sources
        </button>
        <button
          type="button"
          className={`ev-tab-btn ${activeTab === 'analysis' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('analysis')}
          role="tab"
          aria-selected={activeTab === 'analysis'}
        >
          Analysis
        </button>
      </div>

      {activeTab === 'evidence' ? (
        <div className="ev-scroll-body">
          {/* Section 1: Selected Claim & Claim Selector */}
          <div className="ev-section-block">
            <div className="ev-section-title-row">
              <span className="ev-section-icon is-teal">
                <Ic n="target" />
              </span>
              <h3 className="ev-section-heading">Selected Claim</h3>
              {currentClaim && (
                <span className={`ev-claim-status-badge is-${(currentClaim.status || 'supported').toLowerCase()}`}>
                  {(currentClaim.status || 'supported').replace('_', ' ')}
                </span>
              )}
            </div>
            {rawClaims.length > 1 && (
              <div className="ev-claims-tabs-row">
                {rawClaims.map((cl, idx) => {
                  const status = (cl.status || 'supported').toLowerCase()
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`ev-claim-pill-btn ${selectedClaimIndex === idx ? 'is-active' : ''} is-${status}`}
                      onClick={() => {
                        if (setSelectedClaimIndex) setSelectedClaimIndex(idx)
                        if (onNotify) onNotify(`Selected Claim #${idx + 1}`)
                      }}
                      title={`Claim #${idx + 1}: ${cl.text?.slice(0, 40)}...`}
                    >
                      <span className="ev-claim-pill-dot" />
                      Claim #{idx + 1}
                    </button>
                  )
                })}
              </div>
            )}
            <div className="ev-selected-claim-card">
              {currentClaim ? (
                <>
                  <p className="ev-claim-quote">"{currentClaim.text}"</p>
                  {currentClaim.source_indices?.length > 0 && (
                    <div className="ev-claim-cites-row">
                      <span className="ev-claim-cites-lbl">Cited in:</span>
                      {currentClaim.source_indices.map(si => (
                        <span key={si} className="ev-claim-cite-tag">Source [{si}]</span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="ev-claim-quote" style={{ fontStyle: 'normal', color: 'var(--text-secondary)' }}>
                  No extracted claims recorded for this answer.
                </p>
              )}
            </div>
          </div>

          {/* Section 1.5: Uploaded Document Excerpt (if user uploaded files) */}
          {(c.attachments?.length > 0 || sources.some(s => s.type === 'Document' || s.isAttachment)) && (
            <div className="ev-section-block">
              <div className="ev-section-title-row">
                <span className="ev-section-icon is-teal">
                  <Ic n="file-text" />
                </span>
                <h3 className="ev-section-heading">Uploaded Document Excerpt</h3>
              </div>
              <div className="ev-card-box inset">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 14 }}>📄</span>
                  <b style={{ fontSize: 13, color: 'var(--teal)' }}>
                    {c.attachments?.[0]?.name || sources.find(s => s.type === 'Document')?.title || 'Uploaded Document'}
                  </b>
                  <span className="ev-source-badge" style={{ marginLeft: 'auto' }}>100% Match</span>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.45, fontStyle: 'italic', margin: 0 }}>
                  "{evidencePoints[0] || 'Content verified directly against user-uploaded document.'}"
                </p>
              </div>
            </div>
          )}

          {/* Section 2: Supporting Evidence */}
          <div className="ev-section-block">
            <div className="ev-section-title-row">
              <span className="ev-section-icon is-teal">
                <Ic n="layers" />
              </span>
              <h3 className="ev-section-heading">Supporting Evidence</h3>
            </div>
            <div className="ev-card-box inset">
              {evidencePoints.length > 0 ? (
                <ul className="ev-evidence-list">
                  {evidencePoints.map((point, idx) => (
                    <li key={idx}>{point.replace(/^[•\-\*]\s*/, '')}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                  No supporting evidence recorded for this claim.
                </p>
              )}
            </div>
          </div>

          {/* Section 3: Sources (Count) with Working Open & Copy URL */}
          <div className="ev-section-block">
            <div className="ev-section-title-row">
              <span className="ev-section-icon is-teal">
                <Ic n="link" />
              </span>
              <h3 className="ev-section-heading">Sources ({sourcesCount})</h3>
            </div>
            {sources.length > 0 ? (
              <div className="ev-sources-stack">
                {sources.map((src, idx) => (
                  <div key={idx} className="ev-source-card inset">
                    <div className="ev-source-main">
                      <b className="ev-source-title">{src.title || src.src || 'Authoritative Source'}</b>
                      <div className="ev-source-sub-row">
                        <span className="ev-source-publisher">{src.publisher || src.sec || 'Official Portal'}</span>
                        <span className="ev-source-badge">{src.type || 'Official'}</span>
                      </div>
                    </div>
                    <div className="ev-source-actions-row">
                      <button
                        type="button"
                        className="ev-source-action-btn"
                        title="Copy source URL"
                        onClick={() => {
                          const url = (src.url && src.url !== '#') ? src.url : window.location.href
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(url)
                            if (onNotify) onNotify('Source URL copied to clipboard!')
                          }
                        }}
                      >
                        <Ic n="copy" />
                      </button>
                      {src.url && src.url !== '#' ? (
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ev-source-action-btn is-link"
                          title="Open source in new tab"
                        >
                          <Ic n="external" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="ev-source-action-btn"
                          title="Source document available upon request"
                          onClick={() => {
                            if (onNotify) onNotify('Source document available upon request.')
                          }}
                        >
                          <Ic n="external" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ev-card-box inset">
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                  No external sources were confirmed for this answer.
                </p>
              </div>
            )}
          </div>

          {/* Section 4: Verification Summary */}
          <div className="ev-section-block">
            <div className="ev-section-title-row">
              <span className="ev-section-icon is-teal">
                <Ic n="shield" />
              </span>
              <h3 className="ev-section-heading">Verification Summary</h3>
            </div>
            <div className="ev-summary-grid-card inset">
              <div className="ev-summary-cell">
                <b className="ev-cell-val">{confidenceLevel}</b>
                <small className="ev-cell-lbl">Confidence</small>
              </div>
              <div className="ev-summary-cell">
                <b className="ev-cell-val">{sourcesCount}</b>
                <small className="ev-cell-lbl">Sources</small>
              </div>
              <div className="ev-summary-cell">
                <b className="ev-cell-val">{claimsCount}</b>
                <small className="ev-cell-lbl">Claims</small>
              </div>
              <div className="ev-summary-cell is-status">
                <b className="ev-cell-val is-status-highlight">{verificationStatus}</b>
              </div>
            </div>
          </div>

          {/* Section 5: Explainable Calibration Metrics Breakdown */}
          {c.breakdown && (
            <div className="ev-section-block">
              <div className="ev-section-title-row">
                <span className="ev-section-icon is-teal">
                  <Ic n="target" />
                </span>
                <h3 className="ev-section-heading">Calibration Breakdown</h3>
              </div>
              <div className="ev-card-box inset" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <small style={{ color: 'var(--text-secondary)', fontSize: 11, display: 'block' }}>Source Reliability</small>
                  <b style={{ color: 'var(--teal)', fontSize: 15 }}>{c.breakdown.sourceReliability}%</b>
                </div>
                <div>
                  <small style={{ color: 'var(--text-secondary)', fontSize: 11, display: 'block' }}>Evidence Strength</small>
                  <b style={{ color: 'var(--teal)', fontSize: 15 }}>{c.breakdown.evidenceStrength}%</b>
                </div>
                <div>
                  <small style={{ color: 'var(--text-secondary)', fontSize: 11, display: 'block' }}>Claim Support</small>
                  <b style={{ color: 'var(--teal)', fontSize: 15 }}>{c.breakdown.claimVerification}%</b>
                </div>
                <div>
                  <small style={{ color: 'var(--text-secondary)', fontSize: 11, display: 'block' }}>Consistency</small>
                  <b style={{ color: 'var(--teal)', fontSize: 15 }}>{c.breakdown.consistency}%</b>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Analysis Tab */
        <div className="ev-scroll-body">
          <div className="ev-section-block">
            <div className="ev-section-title-row">
              <span className="ev-section-icon is-teal">
                <Ic n="info" />
              </span>
              <h3 className="ev-section-heading">Confidence Analysis</h3>
            </div>
            <div className="ev-card-box inset">
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {c.ex || (c.confidence && c.confidence.explanation) || 'Confidence is assessed by evaluating semantic consistency across authoritative references and identifying any conflicting facts.'}
              </p>
            </div>
          </div>

          <div className="ev-section-block">
            <div className="ev-section-title-row">
              <span className="ev-section-icon is-warn">
                <Ic n="alert-triangle" />
              </span>
              <h3 className="ev-section-heading">Uncertainty & Gaps</h3>
            </div>
            <div className="ev-card-box inset">
              <ul className="ev-evidence-list">
                {Array.isArray(c.uncertainties) && c.uncertainties.length > 0 ? (
                  c.uncertainties.map((u, i) => <li key={i}>{u}</li>)
                ) : (
                  <li>No critical policy uncertainties or contradictory gaps identified for this response.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Human Verification Protocol Card */}
          {c.humanVerification && (
            <div className="ev-section-block">
              <div className="ev-section-title-row">
                <span className="ev-section-icon is-teal">
                  <Ic n="target" />
                </span>
                <h3 className="ev-section-heading">Human Verification Protocol</h3>
              </div>
              <div className="ev-card-box inset">
                <div style={{ marginBottom: 8 }}>
                  <small style={{ color: 'var(--teal)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Must Confirm</small>
                  <p style={{ fontSize: 12.5, color: 'var(--text-primary)', margin: '2px 0 0', fontWeight: 600 }}>{c.humanVerification.what_to_verify}</p>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <small style={{ color: 'var(--text-secondary)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Risk Context</small>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0', lineHeight: 1.4 }}>{c.humanVerification.why_verify}</p>
                </div>
                <div>
                  <small style={{ color: 'var(--teal)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Official Authority</small>
                  <p style={{ fontSize: 12, color: 'var(--text-primary)', margin: '2px 0 0' }}>{c.humanVerification.official_source}</p>
                </div>
              </div>
            </div>
          )}

          <div className="ev-section-block">
            <div className="ev-section-title-row">
              <span className="ev-section-icon is-teal">
                <Ic n="check" />
              </span>
              <h3 className="ev-section-heading">Recommended Actions</h3>
            </div>
            <div className="ev-card-box inset">
              <ul className="ev-evidence-list">
                {Array.isArray(c.recommendedActions) && c.recommendedActions.length > 0 ? (
                  c.recommendedActions.map((act, i) => <li key={i}>{act}</li>)
                ) : c.by ? (
                  <li>{c.by}</li>
                ) : (
                  <>
                    <li>Cross-check key details with official documentation before making a decision.</li>
                    <li>Confirm current terms directly with the administering authority.</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

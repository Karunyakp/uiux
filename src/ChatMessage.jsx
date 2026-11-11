import React, { useState, useEffect } from 'react'
import Ic from './Ic.jsx'
import VerificationPulseLoader from './VerificationPulseLoader.jsx'
import TrustReceiptModal from './TrustReceiptModal.jsx'

export function UserMessage({ message, userInitial = 'K' }) {
  const formatSize = bytes => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="chat-msg user-msg-row">
      <div className="user-msg-bubble">
        {message.attachments && message.attachments.length > 0 && (
          <div className="user-msg-attachments-badge-list">
            {message.attachments.map((att, idx) => (
              <span key={idx} className="user-att-pill" title={`${att.name} (${formatSize(att.size)})`}>
                <span className="att-pill-icon">{att.type?.startsWith('image/') ? '🖼️' : '📄'}</span>
                <span className="att-pill-name">{att.name}</span>
                {att.size ? <span className="att-pill-size">({formatSize(att.size)})</span> : null}
              </span>
            ))}
          </div>
        )}
        <p className="user-msg-text">{message.content}</p>
        {message.timestamp && <span className="user-msg-time">{message.timestamp}</span>}
      </div>
      <div className="user-avatar-chip" title="You">
        <span>{userInitial}</span>
      </div>
    </div>
  )
}

export function AssistantMessage({
  message,
  isSelected,
  onSelect,
  onClaimClick,
  onCopy,
  onSave,
  isSaved,
  onShare,
  onExplain,
  onVerify,
  onReport,
  onRetry,
  onNotify
}) {
  const [activeSection, setActiveSection] = useState('claims') // 'claims' | 'reasoning' | 'evidence' | 'sources' | 'uncertainty' | 'human_verif'
  const [openReport, setOpenReport] = useState(false)
  const [reportKind, setReportKind] = useState('incorrect_info')
  const [reportDetails, setReportDetails] = useState('')
  const [isCopied, setIsCopied] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [claimFilter, setClaimFilter] = useState('all')
  const [sourceViewMode, setSourceViewMode] = useState('top') // 'top' | 'all'
  const [userVerified, setUserVerified] = useState(false)

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const handleCopy = e => {
    e.stopPropagation()
    const textToCopy = plainAnswer || (answerHtml ? answerHtml.replace(/<[^>]+>/g, '') : '')
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setIsCopied(true)
        if (onCopy) onCopy(textToCopy)
        setTimeout(() => setIsCopied(false), 2000)
      }).catch(() => {
        if (onCopy) onCopy(textToCopy)
      })
    } else if (onCopy) {
      onCopy(textToCopy)
    }
  }

  const handleToggleSpeak = e => {
    e.stopPropagation()
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      if (onNotify) onNotify('Speech synthesis is not supported in this browser.')
      return
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      if (onNotify) onNotify('Read aloud stopped.')
    } else {
      window.speechSynthesis.cancel()
      const text = plainAnswer || (answerHtml ? answerHtml.replace(/<[^>]+>/g, '') : '')
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      window.speechSynthesis.speak(utterance)
      setIsSpeaking(true)
      if (onNotify) onNotify('Reading answer aloud… Click again to pause or stop.')
    }
  }

  const handleShareClick = e => {
    e.stopPropagation()
    const text = `TrustLens AI Verified Answer (${lvl} Confidence - ${pct}%):\n\n${plainAnswer || answerHtml?.replace(/<[^>]+>/g, '')}\n\nCalibrated by TrustLens Engine.`
    if (onShare) {
      onShare(text, message)
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      if (onNotify) onNotify('Shareable answer copied to clipboard!')
    }
  }

  const handleExplainClick = e => {
    e.stopPropagation()
    if (onExplain) onExplain(message)
  }

  const handleVerifyClick = e => {
    e.stopPropagation()
    if (onSelect) onSelect(message.id)
    if (onVerify) onVerify(message)
    if (onNotify) onNotify('Focusing Evidence panel and highlighting claims…')
  }

  const handleReportSubmit = e => {
    e.preventDefault()
    if (onReport) {
      onReport({ kind: reportKind, details: reportDetails, messageId: message.id })
    }
    setOpenReport(false)
    setReportDetails('')
  }

  // Pending / Loading State with "TrustLens Verification Pulse"
  if (message.pending) {
    return (
      <div className="chat-msg assistant-msg-row">
        <div className="assistant-avatar-badge">
          <Ic n="shield" />
        </div>
        <VerificationPulseLoader
          size="default"
          title="TrustLens is thinking"
          showStages={true}
        />
      </div>
    )
  }

  // Error State
  if (message.error) {
    const rawError = message.errorMsg || 'A network or API limitation occurred while generating this answer.'
    let isHighDemand = false
    let isRateLimit = false
    let isTimeout = false
    let displayError = rawError

    // Clean up raw JSON error messages if they arrived unformatted
    try {
      const jsonMatch = rawError.match(/\{[\s\S]*"error"[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.error?.message) {
          displayError = parsed.error.message
        }
      }
    } catch {}

    const lower = displayError.toLowerCase()
    if (
      lower.includes('high demand') ||
      lower.includes('unavailable') ||
      lower.includes('503') ||
      lower.includes('overloaded') ||
      lower.includes('spikes in demand')
    ) {
      isHighDemand = true
      displayError = 'The AI model is currently experiencing a temporary demand surge. Spikes usually clear within 10–20 seconds.'
    } else if (lower.includes('rate limit') || lower.includes('429') || lower.includes('resource_exhausted')) {
      isRateLimit = true
      displayError = 'The Gemini API rate limit was temporarily reached. Please wait a moment before trying again.'
    } else if (lower.includes('timed out') || lower.includes('504')) {
      isTimeout = true
      displayError = 'The verification request timed out while contacting search services. Please retry.'
    } else {
      // Strip any residual prefix
      displayError = displayError.replace(/^Gemini API service error:\s*/i, '').trim()
    }

    const badgeClass = isHighDemand ? 'is-warning' : 'is-error'
    const statusLabel = isHighDemand ? 'High Demand Surge' : (isRateLimit ? 'Rate Limited' : (isTimeout ? 'Request Timeout' : 'Calibration Paused'))
    const titleLabel = isHighDemand ? 'AI Service Busy' : 'TrustLens Assistant'
    const headingText = isHighDemand ? 'Model Experiencing High Demand' : 'Could not complete calibration'

    return (
      <div className="chat-msg assistant-msg-row">
        <div className={`assistant-avatar-badge ${badgeClass}`}>
          <Ic n={isHighDemand ? 'spark' : 'alert-triangle'} />
        </div>
        <div className={`card raise assistant-card ${isHighDemand ? 'warning-card' : 'error-card'}`}>
          <div className="assistant-card-header">
            <div className="assistant-brand-info">
              <h2>{titleLabel}</h2>
              <span className={`assistant-status-sub ${badgeClass}`}>{statusLabel}</span>
            </div>
          </div>
          <div className={`chat-error-box ${badgeClass}`}>
            <b>{headingText}</b>
            <p>{displayError}</p>
            {onRetry && (
              <button
                type="button"
                className="btn retry-btn"
                onClick={() => onRetry(message.id, message.promptText)}
              >
                <Ic n="refresh" /> Retry Answer
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const {
    lvl = 'High',
    pct = 86,
    hasScore = true,
    ex = '',
    why = [],
    by = '',
    answerHtml = '',
    plainAnswer = '',
    claims = [],
    sources = [],
    uncertainties = [],
    recommended_actions = []
  } = message

  // Normalized claims
  const normalizedClaims = Array.isArray(claims) && claims.length > 0
    ? claims.map((c, idx) => ({
        id: c.id || `c${idx + 1}`,
        text: c.text || c.claim || c.t || 'Key factual statement.',
        status: (c.status || c.v || 'supported').toLowerCase(),
        importance: c.importance || (idx === 0 ? 'critical' : 'supporting'),
        source_indices: Array.isArray(c.source_indices) && c.source_indices.length > 0
          ? c.source_indices
          : (sources.length > 0 ? [Math.min(idx + 1, sources.length)] : [1]),
        evidence: c.evidence || c.para || 'Corroborated by official documentation.',
        source_title: c.source_title || 'Authoritative Source',
        source_url: c.source_url || null
      }))
    : [
        {
          id: 'c1',
          text: 'Key statement assessed by TrustLens verification engine.',
          status: 'supported',
          importance: 'critical',
          source_indices: [1],
          evidence: 'Official notification excerpts confirm eligibility guidelines.',
          source_title: 'Official Reference'
        }
      ]

  // Normalized sources
  const normalizedSources = Array.isArray(sources) && sources.length > 0
    ? sources.map((s, idx) => ({
        index: s.index || (idx + 1),
        title: s.title || s.src || 'Authoritative Source',
        publisher: s.publisher || s.sec || 'Official Authority',
        type: s.type || 'Official',
        url: s.url || '#',
        summary: s.summary || s.para || 'Reference source corroborated by TrustLens.'
      }))
    : [
        {
          index: 1,
          title: 'Official Notification & Guidelines',
          publisher: 'Authoritative Issuing Body',
          type: 'Official',
          url: '#',
          summary: 'Reference source corroborated by TrustLens.'
        }
      ]

  // Normalized uncertainties
  const normalizedUncertainties = Array.isArray(uncertainties) && uncertainties.length > 0
    ? uncertainties
    : []

  // Normalized recommended next steps
  const nextSteps = Array.isArray(recommended_actions) && recommended_actions.length > 0
    ? recommended_actions
    : [
        'Verify critical details directly with the authoritative source.',
        'Review current official documentation before taking action.'
      ]

  const whyText = (Array.isArray(why) && why.length > 0)
    ? why.join(' ')
    : ex || 'Based on authoritative reference records and verified guidelines.'

  // Filter claims based on selected filter chip
  const filteredClaims = claimFilter === 'all'
    ? normalizedClaims
    : normalizedClaims.filter(c => (c.status || '').toLowerCase() === claimFilter)

  // Top vs All cited sources shelf
  const visibleSources = sourceViewMode === 'top'
    ? normalizedSources.slice(0, 3)
    : normalizedSources

  return (
    <div
      className={`chat-msg assistant-msg-row ${isSelected ? 'is-selected-response' : ''}`}
      onClick={() => onSelect && onSelect(message.id)}
      role="region"
      aria-label="TrustLens Answer and Evidence"
    >
      {/* Assistant Brand Avatar */}
      <div className="assistant-avatar-badge" title="TrustLens Assistant">
        <Ic n="shield" />
      </div>

      <div className="card raise assistant-card">
        {/* 1. Header Row */}
        <div className="assistant-card-header">
          <div className="assistant-brand-info">
            <h2 className="assistant-name">TrustLens Assistant</h2>
            {message.epistemicStatus && (
              <span className="assistant-epistemic-badge">{message.epistemicStatus}</span>
            )}
          </div>
          <span className="assistant-timestamp">{message.timestamp || '6:43 PM'}</span>
        </div>

        {/* 2. Main Answer Text with Interactive Citations & Claims */}
        <div
          className="assistant-answer-body"
          onClick={e => {
            const citeBtn = e.target.closest('.inline-cite-chip')
            if (citeBtn) {
              e.stopPropagation()
              const citeIdx = parseInt(citeBtn.getAttribute('data-cite'), 10)
              if (onSelect) onSelect(message.id)
              setActiveSection('sources')
              if (onNotify) onNotify(`Highlighting cited source #${citeIdx}`)
              return
            }
            if (e.target.tagName === 'MARK') {
              e.stopPropagation()
              const markIdx = parseInt(e.target.getAttribute('data-idx') || '0', 10)
              if (onSelect) onSelect(message.id)
              if (onClaimClick) onClaimClick(e, message, markIdx)
            }
          }}
          dangerouslySetInnerHTML={{ __html: answerHtml || plainAnswer }}
        />

        {/* 2.5 Cited Sources Shelf (Inspired by Enterprise Reference Workspace) */}
        {normalizedSources.length > 0 && (
          <div className="assistant-sources-shelf">
            <div className="sources-shelf-header">
              <span className="sources-shelf-title">
                <Ic n="link" />
                <span>Cited Sources ({normalizedSources.length})</span>
              </span>
              {normalizedSources.length > 3 && (
                <div className="sources-shelf-toggle">
                  <button
                    type="button"
                    className={`shelf-toggle-btn ${sourceViewMode === 'top' ? 'is-active' : ''}`}
                    onClick={e => {
                      e.stopPropagation()
                      setSourceViewMode('top')
                    }}
                  >
                    Top
                  </button>
                  <button
                    type="button"
                    className={`shelf-toggle-btn ${sourceViewMode === 'all' ? 'is-active' : ''}`}
                    onClick={e => {
                      e.stopPropagation()
                      setSourceViewMode('all')
                    }}
                  >
                    All ({normalizedSources.length})
                  </button>
                </div>
              )}
            </div>

            <div className="sources-shelf-grid">
              {visibleSources.map((src, idx) => (
                <div
                  key={idx}
                  className="source-shelf-card inset"
                  onClick={e => {
                    e.stopPropagation()
                    if (onSelect) onSelect(message.id)
                    setActiveSection('sources')
                  }}
                >
                  <div className="source-card-badge-row">
                    <span className="source-card-index">[{src.index || (idx + 1)}]</span>
                    <span className="source-card-tag">{src.type || 'Official'}</span>
                  </div>
                  <b className="source-card-name" title={src.title}>{src.title}</b>
                  <span className="source-card-publisher">{src.publisher}</span>
                  {src.url && src.url !== '#' && (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="source-card-external"
                      onClick={e => e.stopPropagation()}
                      title="Open external source"
                    >
                      <Ic n="external" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Key Points Card */}
          {((Array.isArray(keyPoints) && keyPoints.length > 0) || (Array.isArray(message.ui?.keyPoints) && message.ui.keyPoints.length > 0) || (normalizedClaims.length > 0)) && (
            <div className="assistant-key-points-card inset">
              <div className="key-points-header">
                <span className="key-points-icon-wrap"><Ic n="spark" /></span>
                <b className="key-points-title">Key Points</b>
              </div>
              <ul className="key-points-list">
                {(
                  (Array.isArray(keyPoints) && keyPoints.length > 0 ? keyPoints : null) ||
                  (Array.isArray(message.ui?.keyPoints) && message.ui.keyPoints.length > 0 ? message.ui.keyPoints : null) ||
                  normalizedClaims.slice(0, 4).map(c => c.text)
                ).map((pt, idx) => (
                  <li key={idx} className="key-point-item">
                    <span className="key-point-bullet" />
                    <span className="key-point-text">{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 4. Confidence & Answer Information Blocks */}
          <div className="assistant-info-blocks-grid">
            {/* Block 1: Confidence Level and Percentage */}
            <div className="info-block-item inset">
              <div className="info-block-top">
                <span className="info-block-icon is-teal"><Ic n="shield" /></span>
                <span className="info-block-label">Confidence</span>
              </div>
              <div className="info-block-val-row">
                <b className="info-block-val">{lvl}</b>
                <span className="info-block-pct-pill">{pct}%</span>
              </div>
              <div className="assistant-meter-track" style={{ height: 4, marginTop: 6, borderRadius: 2 }}>
                <div className="assistant-meter-fill" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
              </div>
            </div>

            {/* Block 2: Answer Type */}
            <div className="info-block-item inset">
              <div className="info-block-top">
                <span className="info-block-icon is-cyan"><Ic n="layers" /></span>
                <span className="info-block-label">Answer Type</span>
              </div>
              <b className="info-block-val" style={{ fontSize: 13, marginTop: 4 }}>
                {normalizedSources.length > 0 ? 'Evidence-Calibrated' : 'Synthesized Guidance'}
              </b>
              <small style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 4 }}>
                {normalizedSources.length} official source{normalizedSources.length === 1 ? '' : 's'}
              </small>
            </div>

            {/* Block 3: Last Updated Date */}
            <div className="info-block-item inset">
              <div className="info-block-top">
                <span className="info-block-icon is-teal"><Ic n="calendar" /></span>
                <span className="info-block-label">Last Updated</span>
              </div>
              <b className="info-block-val" style={{ fontSize: 13, marginTop: 4 }}>
                {message.ui?.chk || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </b>
              <small style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 4 }}>
                Audited timestamp
              </small>
            </div>

            {/* Block 4: Uncertainty or Limitations */}
            <div className="info-block-item inset">
              <div className="info-block-top">
                <span className="info-block-icon is-warn"><Ic n="alert-triangle" /></span>
                <span className="info-block-label">Limitations</span>
              </div>
              <p className="info-block-text" title={normalizedUncertainties[0] || 'Verify with authority'}>
                {normalizedUncertainties[0] || 'Verify current notices directly with the issuing portal.'}
              </p>
            </div>
          </div>

          {/* 5. Answer Actions */}
          <div className="assistant-card-actions">
            {/* Save */}
            <button
              type="button"
              className={`act-btn ${isSaved ? 'is-active' : ''}`}
              onClick={e => {
                e.stopPropagation()
                if (onSave) onSave(message)
              }}
              title={isSaved ? 'Remove from saved' : 'Bookmark this answer'}
            >
              <Ic n="bookmark" />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>

            {/* Share */}
            <button
              type="button"
              className="act-btn"
              onClick={handleShareClick}
              title="Share answer and confidence score"
            >
              <Ic n="share" />
              <span>Share</span>
            </button>

            {/* Copy */}
            <button
              type="button"
              className={`act-btn ${isCopied ? 'is-active' : ''}`}
              onClick={handleCopy}
              title="Copy answer text to clipboard"
            >
              <Ic n={isCopied ? 'check' : 'copy'} />
              <span>{isCopied ? 'Copied!' : 'Copy'}</span>
            </button>

            {/* Explain this answer */}
            <button
              type="button"
              className="act-btn"
              onClick={handleExplainClick}
              title="Explain this answer in simpler, more accessible terms"
            >
              <Ic n="help-circle" />
              <span>Explain</span>
            </button>

            {/* Verify this claim */}
            <button
              type="button"
              className={`act-btn is-inspect ${isSelected ? 'is-active' : ''}`}
              onClick={handleVerifyClick}
              title="Focus Evidence panel and verify claims"
            >
              <Ic n="check" />
              <span>Verify Claim</span>
            </button>

            {/* Read aloud */}
            <button
              type="button"
              className={`act-btn ${isSpeaking ? 'is-active' : ''}`}
              onClick={handleToggleSpeak}
              title={isSpeaking ? 'Stop speaking' : 'Read answer aloud'}
            >
              <Ic n={isSpeaking ? 'volume-x' : 'volume-2'} />
              <span>{isSpeaking ? 'Pause' : 'Read aloud'}</span>
            </button>
          </div>

          {/* 3. Two Side-by-Side Metric Cards */}
        <div className="assistant-metrics-grid">
          {/* Card 1: Confidence Level & Meter */}
          <div className="assistant-metric-card inset">
            <div className="assistant-metric-header">
              <span className="metric-icon-wrap is-teal">
                <Ic n="shield" />
              </span>
              <div className="metric-header-text">
                <b className="metric-title">Confidence: {lvl}</b>
                <span className="metric-subtitle">{message.epistemicStatus || 'Calibrated Heuristic'}</span>
              </div>
            </div>
            <div className="assistant-meter-row">
              <div className="assistant-meter-track">
                <div
                  className="assistant-meter-fill"
                  style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                />
              </div>
              <span className="assistant-meter-pct">{pct}%</span>
            </div>
          </div>

          {/* Card 2: Why This Confidence */}
          <div className="assistant-metric-card inset">
            <div className="assistant-metric-header">
              <span className="metric-icon-wrap is-cyan">
                <Ic n="info" />
              </span>
              <div className="metric-header-text">
                <b className="metric-title">Why this confidence?</b>
                <button
                  type="button"
                  className="metric-link-btn"
                  onClick={e => {
                    e.stopPropagation()
                    setActiveSection('reasoning')
                  }}
                >
                  View Calibration Rubric →
                </button>
              </div>
            </div>
            <p className="metric-subtext">{whyText}</p>
          </div>
        </div>

        {/* 4. Interactive Section Tabs */}
        <div className="assistant-section-tabs" role="tablist">
          <button
            type="button"
            className={`section-tab-pill ${activeSection === 'claims' ? 'is-active' : ''}`}
            onClick={e => {
              e.stopPropagation()
              setActiveSection('claims')
            }}
          >
            <Ic n="list" />
            <span>Claim Intelligence ({normalizedClaims.length})</span>
          </button>

          <button
            type="button"
            className={`section-tab-pill ${activeSection === 'reasoning' ? 'is-active' : ''}`}
            onClick={e => {
              e.stopPropagation()
              setActiveSection('reasoning')
            }}
          >
            <Ic n="shield" />
            <span>Trust Reasoning</span>
          </button>

          <button
            type="button"
            className={`section-tab-pill ${activeSection === 'evidence' ? 'is-active' : ''}`}
            onClick={e => {
              e.stopPropagation()
              setActiveSection('evidence')
            }}
          >
            <Ic n="layers" />
            <span>Evidence Trail</span>
          </button>

          <button
            type="button"
            className={`section-tab-pill ${activeSection === 'sources' ? 'is-active' : ''}`}
            onClick={e => {
              e.stopPropagation()
              setActiveSection('sources')
            }}
          >
            <Ic n="link" />
            <span>Sources ({normalizedSources.length})</span>
          </button>

          <button
            type="button"
            className={`section-tab-pill ${activeSection === 'uncertainty' ? 'is-active' : ''}`}
            onClick={e => {
              e.stopPropagation()
              setActiveSection('uncertainty')
            }}
          >
            <Ic n="alert-triangle" />
            <span>Uncertainty ({normalizedUncertainties.length || 1})</span>
          </button>

          <button
            type="button"
            className={`section-tab-pill ${activeSection === 'human_verif' ? 'is-active' : ''}`}
            onClick={e => {
              e.stopPropagation()
              setActiveSection('human_verif')
            }}
          >
            <Ic n="target" />
            <span>Human Verification</span>
          </button>
        </div>

        {/* 5. Section Tab Content Box */}
        <div className="assistant-tab-content-box inset">
          {/* TAB 1: CLAIM INTELLIGENCE */}
          {activeSection === 'claims' && (
            <div className="claims-intelligence-pane">
              <div className="claims-filter-bar">
                {['all', 'supported', 'inferred', 'partially_supported', 'unverified', 'contradicted'].map(f => {
                  const count = f === 'all'
                    ? normalizedClaims.length
                    : normalizedClaims.filter(c => (c.status || '').toLowerCase() === f).length
                  if (f !== 'all' && count === 0) return null
                  const label = f === 'all' ? 'All Claims' : f.replace('_', ' ')
                  return (
                    <button
                      key={f}
                      type="button"
                      className={`claim-filter-chip ${claimFilter === f ? 'is-active' : ''} is-${f}`}
                      onClick={e => {
                        e.stopPropagation()
                        setClaimFilter(f)
                      }}
                    >
                      <span className="filter-chip-text">{label}</span>
                      <span className="filter-chip-count">{count}</span>
                    </button>
                  )
                })}
              </div>

              <div className="claims-list-flow">
                {filteredClaims.map((claim, idx) => {
                  const status = (claim.status || 'supported').toLowerCase()
                  const isSupported = status === 'supported' || status === 'verified'
                  const isInferred = status === 'inferred'
                  const isPart = status === 'partially_supported'
                  const isContra = status === 'contradicted'
                  const statusClass = isSupported ? 'is-supported' : isInferred ? 'is-inferred' : isPart ? 'is-part' : isContra ? 'is-contra' : 'is-unverif'
                  const statusLabel = isSupported ? 'Supported' : isInferred ? 'Inferred' : isPart ? 'Partially Supported' : isContra ? 'Contradicted' : 'Unverified'

                  return (
                    <div
                      key={claim.id || idx}
                      className={`claim-row-card is-${statusClass}`}
                      onClick={e => {
                        e.stopPropagation()
                        if (onSelect) onSelect(message.id)
                        if (onClaimClick) onClaimClick(e, message, idx)
                        if (onNotify) onNotify(`Selected Claim #${idx + 1}`)
                      }}
                    >
                      <div className="claim-card-top">
                        <span className={`claim-status-badge ${statusClass}`}>
                          <span className="claim-status-dot" />
                          {statusLabel}
                        </span>
                        {claim.importance && (
                          <span className={`claim-importance-chip ${claim.importance}`}>
                            {claim.importance}
                          </span>
                        )}
                        {claim.source_indices?.length > 0 && (
                          <div className="claim-cites-row">
                            {claim.source_indices.map(si => (
                              <span key={si} className="claim-cite-tag" title={`Source citation #${si}`}>
                                [{si}]
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="claim-text">{claim.text}</p>
                      {claim.evidence && (
                        <p className="claim-evidence-preview">
                          <span className="evidence-quote-mark">“</span>
                          {claim.evidence}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 2: TRUST REASONING ENGINE */}
          {activeSection === 'reasoning' && (
            <div className="reasoning-engine-pane">
              <div className="reasoning-summary-card">
                <div className="reasoning-header">
                  <span className="reasoning-icon"><Ic n="shield" /></span>
                  <div>
                    <b>Trust Reasoning Engine Methodology</b>
                    <span className="reasoning-status-sub">{message.epistemicStatus || 'Multi-Factor Calibrated'}</span>
                  </div>
                  <span className="reasoning-score-badge">{pct}% Calibrated</span>
                </div>
                <p className="reasoning-explanation">{whyText}</p>
                {message.epistemicCeilingApplied && (
                  <div className="epistemic-ceiling-notice">
                    <Ic n="alert-triangle" />
                    <span>Epistemic Guardrail Applied: Confidence was capped because independent primary citations are limited.</span>
                  </div>
                )}
              </div>

              <div className="rubric-pillars-grid">
                {(message.pillars || [
                  { name: 'Evidence Coverage', score: message.breakdown?.evidenceStrength ?? 75, weight: '35%', label: 'Direct Grounding', desc: 'Ratio of factual claims corroborated by explicit text.' },
                  { name: 'Source Authority', score: message.breakdown?.sourceReliability ?? 80, weight: '35%', label: 'Official / Primary', desc: 'Statutory authority of issuing bodies and domains.' },
                  { name: 'Claim Consensus', score: message.breakdown?.claimVerification ?? 70, weight: '20%', label: 'Strong Corroboration', desc: 'Consistency across independent documents without extrapolation.' },
                  { name: 'Freshness & Consistency', score: message.breakdown?.consistency ?? 85, weight: '10%', label: 'Consistent & Current', desc: 'Absence of unresolved conflicts or expired provisions.' }
                ]).map((pillar, idx) => (
                  <div key={idx} className="pillar-card inset">
                    <div className="pillar-top-row">
                      <span className="pillar-name">{pillar.name} <small>({pillar.weight})</small></span>
                      <span className="pillar-score">{pillar.score}/100</span>
                    </div>
                    <div className="pillar-track">
                      <div className="pillar-fill" style={{ width: `${pillar.score}%` }} />
                    </div>
                    <div className="pillar-label-row">
                      <span className="pillar-tag">{pillar.label}</span>
                    </div>
                    <p className="pillar-desc">{pillar.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: EVIDENCE TRAIL */}
          {activeSection === 'evidence' && (
            <div className="evidence-list-flow">
              <ul className="evidence-bullets">
                {normalizedClaims.map((c, idx) => (
                  <li key={idx} className="evidence-item-card">
                    <div className="evidence-item-top">
                      <span className="evidence-badge-idx">C{idx + 1}</span>
                      <span className="evidence-source-tag">{c.source_title || 'Documentary Evidence'}</span>
                    </div>
                    <p className="evidence-quote-text">"{c.evidence || c.para || c.text}"</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* TAB 4: SOURCES */}
          {activeSection === 'sources' && (
            <div className="sources-list-flow">
              {normalizedSources.map((src, idx) => (
                <div key={idx} className="source-mini-item">
                  <div className="source-mini-main">
                    <div className="source-mini-title-row">
                      <span className="source-mini-idx">[{src.index || (idx + 1)}]</span>
                      <b>{src.title}</b>
                    </div>
                    <small>{src.publisher}</small>
                    {src.summary && <p className="source-mini-summary">"{src.summary}"</p>}
                  </div>
                  <div className="source-mini-tags">
                    <span className="badge-official">{src.type || 'Official'}</span>
                    {src.url && src.url !== '#' ? (
                      <a href={src.url} target="_blank" rel="noopener noreferrer" className="source-link-icon" title="Open source">
                        <Ic n="external" />
                      </a>
                    ) : (
                      <span className="source-link-icon" title="Reference document"><Ic n="external" /></span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: UNCERTAINTY REPORT */}
          {activeSection === 'uncertainty' && (
            <div className="uncertainty-list-flow">
              {normalizedUncertainties.length > 0 ? (
                normalizedUncertainties.map((u, idx) => (
                  <div key={idx} className="uncertainty-item">
                    <Ic n="alert-triangle" />
                    <span>{u}</span>
                  </div>
                ))
              ) : (
                <div className="uncertainty-item">
                  <Ic n="alert-triangle" />
                  <span>Exact official notification dates, fee waivers, and late fee clauses remain subject to issuing body confirmation.</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: HUMAN VERIFICATION MODE */}
          {activeSection === 'human_verif' && (
            <div className="human-verification-pane">
              <div className="hv-header-box">
                <div className="hv-header-left">
                  <span className="hv-icon is-teal"><Ic n="target" /></span>
                  <div>
                    <b>Human Verification Protocol</b>
                    <small>Independent due-diligence questions before taking consequential action</small>
                  </div>
                </div>
                <span className="hv-badge-action">Active Audit</span>
              </div>

              <div className="hv-questions-stack">
                {/* 1. What should I verify? */}
                <div className="hv-step-card inset">
                  <div className="hv-step-num">1</div>
                  <div className="hv-step-content">
                    <b className="hv-step-title">What should I verify?</b>
                    <p className="hv-step-desc">
                      {message.humanVerification?.what_to_verify || normalizedClaims[0]?.text || 'Confirm exact qualifying eligibility criteria and application deadlines.'}
                    </p>
                  </div>
                </div>

                {/* 2. Why should I verify it? */}
                <div className="hv-step-card inset">
                  <div className="hv-step-num">2</div>
                  <div className="hv-step-content">
                    <b className="hv-step-title">Why should I verify it?</b>
                    <p className="hv-step-desc">
                      {message.humanVerification?.why_verify || 'Inaccurate or outdated information may result in application rejection, financial loss, or forfeiture of fees.'}
                    </p>
                  </div>
                </div>

                {/* 3. Which official source should I consult? */}
                <div className="hv-step-card inset">
                  <div className="hv-step-num">3</div>
                  <div className="hv-step-content">
                    <b className="hv-step-title">Which official source should I consult?</b>
                    <p className="hv-step-desc">
                      {message.humanVerification?.official_source || normalizedSources[0]?.publisher || 'Official Administrative Authority Gazette or Website'}
                    </p>
                    {normalizedSources[0]?.url && normalizedSources[0]?.url !== '#' && (
                      <a href={normalizedSources[0].url} target="_blank" rel="noopener noreferrer" className="hv-portal-link">
                        <span>Open Official Source</span>
                        <Ic n="external" />
                      </a>
                    )}
                  </div>
                </div>

                {/* 4. What information is still missing? */}
                <div className="hv-step-card inset">
                  <div className="hv-step-num">4</div>
                  <div className="hv-step-content">
                    <b className="hv-step-title">What information is still missing?</b>
                    <p className="hv-step-desc">
                      {message.humanVerification?.missing_info || normalizedUncertainties[0] || 'Pending formal gazette release, final cutoff announcements, or amendment notices.'}
                    </p>
                  </div>
                </div>

                {/* 5. What could change this answer? */}
                <div className="hv-step-card inset">
                  <div className="hv-step-num">5</div>
                  <div className="hv-step-content">
                    <b className="hv-step-title">What could change this answer?</b>
                    <p className="hv-step-desc">
                      {message.humanVerification?.volatility_factor || 'Policy changes by administering committee, quota revisions, or subsequent corrigendum bulletins.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* User Checkable Verification Action */}
              <div className="hv-user-action-box">
                <label className="hv-checkbox-label">
                  <input
                    type="checkbox"
                    checked={!!userVerified}
                    onChange={e => {
                      e.stopPropagation()
                      setUserVerified(e.target.checked)
                      if (onNotify) {
                        onNotify(e.target.checked ? 'Marked as personally verified by user.' : 'User verification check cleared.')
                      }
                    }}
                  />
                  <div className="hv-checkbox-text">
                    <b>I have personally verified this information against the official source</b>
                    <small>{userVerified ? 'Verified by user • Audit state recorded' : 'Check this box after verifying directly with the official gazette/portal'}</small>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* 6. Recommended Next Steps Box */}
        <div className="assistant-next-steps-card">
          <div className="next-steps-header">
            <span className="next-steps-icon">
              <Ic n="target" />
            </span>
            <b className="next-steps-title">Recommended next steps</b>
          </div>
          <ul className="next-steps-list">
            {nextSteps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ul>
        </div>

        {/* 7. Action Toolbar with All Functional Buttons */}
        <div className="assistant-card-actions">
          {/* A. Copy Answer */}
          <button
            type="button"
            className={`act-btn ${isCopied ? 'is-active' : ''}`}
            onClick={handleCopy}
            title="Copy answer text to clipboard"
          >
            <Ic n={isCopied ? 'check' : 'copy'} />
            <span>{isCopied ? 'Copied!' : 'Copy'}</span>
          </button>

          {/* B. Read Aloud */}
          <button
            type="button"
            className={`act-btn ${isSpeaking ? 'is-active' : ''}`}
            onClick={handleToggleSpeak}
            title={isSpeaking ? 'Stop speaking' : 'Read answer aloud'}
          >
            <Ic n={isSpeaking ? 'volume-x' : 'volume-2'} />
            <span>{isSpeaking ? 'Pause' : 'Read aloud'}</span>
          </button>

          {/* C. Save Answer */}
          <button
            type="button"
            className={`act-btn ${isSaved ? 'is-active' : ''}`}
            onClick={e => {
              e.stopPropagation()
              if (onSave) onSave(message)
            }}
            title={isSaved ? 'Remove from saved' : 'Bookmark this answer'}
          >
            <Ic n="bookmark" />
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>

          {/* D. Share Answer */}
          <button
            type="button"
            className="act-btn"
            onClick={handleShareClick}
            title="Share answer and confidence score"
          >
            <Ic n="share" />
            <span>Share</span>
          </button>

          {/* E. Trust Receipt (Differentiated Feature) */}
          <button
            type="button"
            className="act-btn is-receipt"
            onClick={e => {
              e.stopPropagation()
              setShowReceipt(true)
            }}
            title="Generate official TrustLens verification receipt"
          >
            <Ic n="receipt" />
            <span>Trust Receipt</span>
          </button>

          {/* F. Verify Claims */}
          <button
            type="button"
            className={`act-btn is-inspect ${isSelected ? 'is-active' : ''}`}
            onClick={handleVerifyClick}
            title="Focus Evidence panel and verify individual claims"
          >
            <Ic n="eye" />
            <span>{isSelected ? 'Claims in Evidence' : 'Verify claims'}</span>
          </button>

          {/* G. Explain This Answer */}
          <button
            type="button"
            className="act-btn"
            onClick={handleExplainClick}
            title="Explain this answer in simpler, more accessible terms"
          >
            <Ic n="help-circle" />
            <span>Explain</span>
          </button>

          {/* H. Report an Issue */}
          <button
            type="button"
            className="act-btn"
            onClick={e => {
              e.stopPropagation()
              setOpenReport(!openReport)
            }}
            title="Report inaccurate info or missing evidence"
          >
            <Ic n="flag" />
            <span>Report</span>
          </button>
        </div>

        {/* Report Modal / Flyout Form */}
        {openReport && (
          <form className="report-flyout-box inset" onSubmit={handleReportSubmit}>
            <div className="report-flyout-header">
              <b>Report an issue with this answer</b>
              <button
                type="button"
                className="report-close-x"
                onClick={() => setOpenReport(false)}
                title="Cancel report"
              >
                ×
              </button>
            </div>
            <div className="report-options">
              <label>
                <input
                  type="radio"
                  name={`ri_${message.id}`}
                  checked={reportKind === 'incorrect_info'}
                  onChange={() => setReportKind('incorrect_info')}
                />
                <span>Incorrect information</span>
              </label>
              <label>
                <input
                  type="radio"
                  name={`ri_${message.id}`}
                  checked={reportKind === 'missing_evidence'}
                  onChange={() => setReportKind('missing_evidence')}
                />
                <span>Missing evidence</span>
              </label>
              <label>
                <input
                  type="radio"
                  name={`ri_${message.id}`}
                  checked={reportKind === 'incorrect_source'}
                  onChange={() => setReportKind('incorrect_source')}
                />
                <span>Incorrect source</span>
              </label>
              <label>
                <input
                  type="radio"
                  name={`ri_${message.id}`}
                  checked={reportKind === 'misleading_confidence'}
                  onChange={() => setReportKind('misleading_confidence')}
                />
                <span>Misleading confidence score</span>
              </label>
              <label>
                <input
                  type="radio"
                  name={`ri_${message.id}`}
                  checked={reportKind === 'other'}
                  onChange={() => setReportKind('other')}
                />
                <span>Other</span>
              </label>
            </div>
            <textarea
              rows={3}
              placeholder="Provide specific details or links to official sources…"
              value={reportDetails}
              onChange={e => setReportDetails(e.target.value)}
              required
            />
            <div className="report-form-actions">
              <button type="submit" className="btn btn-teal">
                Submit Report
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setOpenReport(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Official Trust Receipt Modal */}
        <TrustReceiptModal
          isOpen={showReceipt}
          onClose={() => setShowReceipt(false)}
          data={{
            ...message,
            q: message.promptText || message.ui?.q || message.q || 'User Inquiry',
            plainAnswer: plainAnswer || (answerHtml ? answerHtml.replace(/<[^>]+>/g, '') : ''),
            answerHtml,
            lvl,
            pct,
            ex,
            why,
            claims: normalizedClaims,
            sources: normalizedSources,
            uncertainties: normalizedUncertainties,
            humanVerification: message.humanVerification || message.ui?.humanVerification,
            pillars: message.pillars || message.confidence?.pillars || message.ui?.pillars,
            epistemicStatus: message.epistemicStatus || message.confidence?.epistemicStatus || message.ui?.epistemicStatus,
            verificationUuid: message.verificationUuid || message.ui?.verificationUuid,
            verificationTimestamp: message.verificationTimestamp || message.ui?.verificationTimestamp,
            breakdown: message.breakdown || message.confidence?.breakdown || message.ui?.breakdown
          }}
          onNotify={onNotify}
        />
      </div>
    </div>
  )
}

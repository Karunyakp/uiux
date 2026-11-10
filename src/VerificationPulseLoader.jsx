import React, { useState, useEffect } from 'react'

const STAGES = [
  { badge: 'Understanding', text: 'Understanding your question...' },
  { badge: 'Analysing', text: 'Analysing relevant information...' },
  { badge: 'Verifying', text: 'Checking supporting evidence...' },
  { badge: 'Evaluating', text: 'Evaluating confidence...' },
  { badge: 'Finalizing', text: 'Preparing your answer...' }
]

export default function VerificationPulseLoader({
  size = 'default', // 'default' | 'card' | 'sm' | 'mini'
  title = 'TrustLens is thinking',
  showStages = true,
  className = '',
  currentStageIndex = null
}) {
  const [internalStage, setInternalStage] = useState(0)

  // Stage progression timer (0 -> 1 -> 2 -> 3 -> 4)
  useEffect(() => {
    if (currentStageIndex !== null) return
    const timers = [
      setTimeout(() => setInternalStage(1), 1400),
      setTimeout(() => setInternalStage(2), 3400),
      setTimeout(() => setInternalStage(3), 5800),
      setTimeout(() => setInternalStage(4), 8500)
    ]
    return () => timers.forEach(t => clearTimeout(t))
  }, [currentStageIndex])

  const stageIdx = currentStageIndex !== null ? currentStageIndex : internalStage
  const activeStage = STAGES[Math.min(stageIdx, STAGES.length - 1)]

  // Compact / Small versions for Chat History or buttons
  if (size === 'mini' || size === 'sm') {
    const isMini = size === 'mini'
    const boxSize = isMini ? 20 : 32
    return (
      <div
        className={`v-pulse-loader-mini ${className}`}
        style={{ width: boxSize, height: boxSize }}
        role="status"
        aria-label="Loading verification"
      >
        <div className="v-mini-glow" />
        <div className="v-mini-ring" />
        <div className="v-mini-orbit">
          <span className="v-mini-dot dot-1" />
          <span className="v-mini-dot dot-2" />
          <span className="v-mini-dot dot-3" />
        </div>
        <div className="v-mini-shield">
          <svg viewBox="0 0 24 24" width={isMini ? 11 : 16} height={isMini ? 11 : 16} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
      </div>
    )
  }

  // Full / Default Card Loader
  return (
    <div className={`v-pulse-card ${className}`} role="status" aria-live="polite">
      {/* 1. Central Graphic: Glowing Shield + Verification Ring + Orbiting Particles */}
      <div className="v-pulse-graphic-container">
        {/* Soft radial aura glow */}
        <div className="v-pulse-glow-aura" />

        {/* Thin rotating verification ring */}
        <div className="v-pulse-verification-ring" />

        {/* Orbit container with three tiny teal/mint particles */}
        <div className="v-pulse-orbit-track">
          <span className="v-pulse-particle particle-1" />
          <span className="v-pulse-particle particle-2" />
          <span className="v-pulse-particle particle-3" />
        </div>

        {/* Central shield badge with checkmark */}
        <div className="v-pulse-center-shield">
          <svg
            viewBox="0 0 24 24"
            width="26"
            height="26"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="v-pulse-shield-svg"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
      </div>

      {/* 2. Main Title */}
      <h3 className="v-pulse-title">{title}</h3>

      {/* 3. Contextual Stage Status & Badge */}
      {showStages && (
        <div className="v-pulse-status-box">
          <div className="v-pulse-stage-row">
            <span className="v-pulse-badge">{activeStage.badge}</span>
            <span className="v-pulse-status-text" key={activeStage.text}>
              {activeStage.text}
            </span>
          </div>

          {/* Micro pulsing progress indicator dots */}
          <div className="v-pulse-micro-dots" aria-hidden="true">
            <span className="v-micro-dot dot-a" />
            <span className="v-micro-dot dot-b" />
            <span className="v-micro-dot dot-c" />
          </div>
        </div>
      )}
    </div>
  )
}

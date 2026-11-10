import React, { useEffect } from 'react'
import Ic from './Ic.jsx'

export default function AccessibilityPanel({
  onClose,
  theme,
  setTheme,
  resolvedTheme,
  colorBlind,
  setColorBlind,
  largeText,
  setLargeText,
  dyslexicFont,
  setDyslexicFont,
  calmMotion,
  setCalmMotion,
  focusMode,
  setFocusMode,
  isReading,
  onToggleRead
}) {
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <>
      <div className="a11y-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="a11y-modal raise" role="dialog" aria-modal="true" aria-label="Accessibility & Display">
        {/* Header */}
        <div className="a11y-modal-header">
          <div className="a11y-title-wrap">
            <span className="a11y-icon-badge">
              <Ic n="a11y" />
            </span>
            <b>Accessibility & Display</b>
          </div>
          <button type="button" className="a11y-close-btn" onClick={onClose} aria-label="Close panel" title="Close">
            ✕
          </button>
        </div>

        <div className="a11y-modal-body">
          {/* Theme Section */}
          <div className="a11y-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span className="a11y-section-label">Theme Mode</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--mist, #718398)' }}>
                {theme === 'system' ? 'System (Teal Blue)' : (theme === 'dark' ? 'Dark Mode (Black)' : 'Light Mode')}
              </span>
            </div>
            <div className="a11y-theme-segmented inset" role="radiogroup" aria-label="Theme selection">
              <button
                type="button"
                className={`a11y-theme-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
                role="radio"
                aria-checked={theme === 'light'}
                title="TrustLens Light Mode"
              >
                <Ic n="sun" />
                <span>Light</span>
              </button>
              <button
                type="button"
                className={`a11y-theme-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
                role="radio"
                aria-checked={theme === 'dark'}
                title="TrustLens Dark Mode (Pure Black #000000)"
              >
                <Ic n="moon" />
                <span>Dark</span>
              </button>
              <button
                type="button"
                className={`a11y-theme-btn ${theme === 'system' ? 'active' : ''}`}
                onClick={() => setTheme('system')}
                role="radio"
                aria-checked={theme === 'system'}
                title="TrustLens System Mode (Teal Blue)"
              >
                <Ic n="monitor" />
                <span>System</span>
              </button>
            </div>
            <small style={{ display: 'block', marginTop: 6, fontSize: 11, color: 'var(--mist, #718398)', lineHeight: 1.4 }}>
              {theme === 'system'
                ? 'System mode features TrustLens signature deep Teal Blue background and surfaces.'
                : (theme === 'dark' ? 'TrustLens Dark Mode active (Pure Black #000000).' : 'TrustLens Light Mode active.')}
            </small>
          </div>

          {/* Accessibility Modes */}
          <div className="a11y-section">
            <span className="a11y-section-label">Accessibility Modes</span>
            <small className="a11y-section-sub">Improve readability and ease of use</small>

            <div className="a11y-toggles-list">
              {/* Colour-blind Safe */}
              <div className="a11y-toggle-row">
                <span className="a11y-row-icon">
                  <Ic n="palette" />
                </span>
                <div className="a11y-row-text">
                  <b>Colour-blind Safe</b>
                  <p>Use a colour palette that works for colour-vision differences</p>
                </div>
                <label className="toggle-switch" aria-label="Toggle Colour-blind Safe mode">
                  <input
                    type="checkbox"
                    checked={colorBlind}
                    onChange={e => setColorBlind(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              {/* Large Text & High Contrast */}
              <div className="a11y-toggle-row">
                <span className="a11y-row-icon text-icon">Aa</span>
                <div className="a11y-row-text">
                  <b>Large Text & High Contrast</b>
                  <p>Bigger text with stronger contrast</p>
                </div>
                <label className="toggle-switch" aria-label="Toggle Large Text and High Contrast">
                  <input
                    type="checkbox"
                    checked={largeText}
                    onChange={e => setLargeText(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              {/* Dyslexia-friendly Font */}
              <div className="a11y-toggle-row">
                <span className="a11y-row-icon text-icon">Ab</span>
                <div className="a11y-row-text">
                  <b>Dyslexia-friendly Font</b>
                  <p>Use a cleaner, more readable font (e.g., OpenDyslexic)</p>
                </div>
                <label className="toggle-switch" aria-label="Toggle Dyslexia-friendly Font">
                  <input
                    type="checkbox"
                    checked={dyslexicFont}
                    onChange={e => setDyslexicFont(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              {/* Calm Motion */}
              <div className="a11y-toggle-row">
                <span className="a11y-row-icon">
                  <Ic n="wave" />
                </span>
                <div className="a11y-row-text">
                  <b>Calm Motion</b>
                  <p>Reduce animations and transitions</p>
                </div>
                <label className="toggle-switch" aria-label="Toggle Calm Motion">
                  <input
                    type="checkbox"
                    checked={calmMotion}
                    onChange={e => setCalmMotion(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
          </div>

          {/* Additional Tools */}
          <div className="a11y-section">
            <span className="a11y-section-label">Additional Tools</span>

            <div className="a11y-toggles-list">
              {/* Focus Mode */}
              <div className="a11y-toggle-row">
                <span className="a11y-row-icon">
                  <Ic n="target" />
                </span>
                <div className="a11y-row-text">
                  <b>Focus Mode</b>
                  <p>A distraction-free reading view</p>
                </div>
                <label className="toggle-switch" aria-label="Toggle Focus Mode">
                  <input
                    type="checkbox"
                    checked={focusMode}
                    onChange={e => setFocusMode(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              {/* Read-Aloud */}
              <div className="a11y-toggle-row">
                <span className="a11y-row-icon">
                  <Ic n="volume" />
                </span>
                <div className="a11y-row-text">
                  <b>Read-Aloud</b>
                  <p>Listen to the answer and evidence</p>
                </div>
                <button
                  type="button"
                  className={`a11y-play-btn ${isReading ? 'playing' : ''}`}
                  onClick={onToggleRead}
                  title={isReading ? 'Pause audio' : 'Play audio'}
                  aria-label={isReading ? 'Pause audio playback' : 'Play answer aloud'}
                >
                  <Ic n={isReading ? 'volume' : 'play'} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

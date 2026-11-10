import React, { useState } from 'react'
import Ic from './Ic.jsx'
import logoImg from './assets/logo.png'
import heroIllustration from './assets/hero-illustration.png'
import aiInspectionImg from './assets/ai-inspection.png'
import AccessibilityPanel from './AccessibilityPanel.jsx'

export default function LandingPage({ onNavigate, onOpenTopic, a11yProps }) {
  const [checks, setChecks] = useState([1, 2])

  const scrollTo = (e, id) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const toggleCheck = id => {
    setChecks(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  const handleOpenTopic = key => {
    if (onOpenTopic) onOpenTopic(key)
    else onNavigate('app')
  }

  return (
    <div className="lp-container">
      {/* Top Navigation */}
      <header className="lp-nav">
        <div
          className="lp-brand"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          role="button"
          tabIndex={0}
          title="TrustLens AI"
        >
          <div className="lp-logo-badge">
            <img src={logoImg} alt="TrustLens AI" className="lp-logo-img" />
          </div>
        </div>

        <nav className="lp-links" aria-label="Page navigation">
          <button type="button" className="lp-nav-link" onClick={e => scrollTo(e, 'how-it-works')}>
            How it works
          </button>
          <button type="button" className="lp-nav-link" onClick={e => scrollTo(e, 'answer-types')}>
            Answer types
          </button>
          <button type="button" className="lp-nav-link" onClick={e => scrollTo(e, 'checklist')}>
            Checklist
          </button>
        </nav>

        <div className="lp-nav-actions" style={{ position: 'relative' }}>
          <button
            type="button"
            className="lp-back-btn"
            onClick={() => onNavigate('app')}
            title="Return to verification dashboard"
            aria-label="Back to Dashboard"
          >
            <Ic n="arrow-left" />
            <span>Back to Dashboard</span>
          </button>
          {a11yProps && (
            <>
              <button
                type="button"
                className={`round-icon-btn a11y-trigger-btn ${a11yProps.a11yOpen ? 'active' : ''}`}
                aria-label="Accessibility & Display"
                title="Accessibility & Display controls"
                aria-haspopup="dialog"
                aria-expanded={a11yProps.a11yOpen}
                onClick={() => a11yProps.setA11yOpen(!a11yProps.a11yOpen)}
              >
                <Ic n="a11y" />
              </button>
              {a11yProps.a11yOpen && (
                <AccessibilityPanel
                  onClose={() => a11yProps.setA11yOpen(false)}
                  {...a11yProps}
                />
              )}
            </>
          )}
          <button type="button" className="lp-btn-ghost" onClick={() => onNavigate('signin')}>
            Sign in
          </button>
          <button type="button" className="btn lp-nav-cta" onClick={() => onNavigate('register')}>
            Create account
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="lp-hero">
        <div className="lp-hero-content">
          <h1 className="lp-hero-title">
            Know how far to<br />
            trust an answer<br />
            before you act on it.
          </h1>
          <p className="lp-hero-sub">
            TrustLens AI shows how confident each answer is and the evidence behind every claim, so you can check it yourself before you apply, pay or decide.
          </p>
          <div className="lp-hero-ctas">
            <button type="button" className="btn lp-btn-hero" onClick={() => onNavigate('register')}>
              Create account
            </button>
            <button type="button" className="lp-btn-secondary" onClick={() => onNavigate('app')}>
              <Ic n="user" />Continue as guest
            </button>
          </div>
          <p className="lp-hero-note">
            Guests can start right away. Anything you save carries over when you create an account.
          </p>
        </div>

        {/* Right Hero Illustration */}
        <div className="lp-hero-illustration-col">
          <div className="lp-illustration-container">
            <img
              src={heroIllustration}
              alt="TrustLens AI verification assistant with magnifying glass, checklist documents, and verified mobile check"
              className="lp-hero-illustration-img"
            />
          </div>
        </div>
      </section>

      {/* Section 2: Every answer shows its working */}
      <section id="how-it-works" className="lp-section">
        <h2 className="lp-section-title">Every answer shows its working.</h2>
        <p className="lp-section-sub">You see the confidence first, then the claim, then where it came from.</p>

        <div className="lp-grid-3">
          <div className="lp-card raise" onClick={() => onNavigate('app')} role="button" tabIndex={0} style={{ cursor: 'pointer' }} title="Ask a question in TrustLens">
            <span className="chip"><Ic n="msg" /></span>
            <h3>Ask in plain words</h3>
            <p>Type a question about eligibility, fees or deadlines. Search topics, or ask a follow-up whenever something is unclear.</p>
          </div>

          <div className="lp-card raise" onClick={() => onNavigate('app')} role="button" tabIndex={0} style={{ cursor: 'pointer' }} title="Check confidence scoring">
            <span className="chip"><Ic n="shield" /></span>
            <h3>See how confident it is</h3>
            <p>A confidence level and meter come with a short list of reasons: how many sources, whether they agree, and how recent they are.</p>
          </div>

          <div className="lp-card raise" onClick={() => onNavigate('app')} role="button" tabIndex={0} style={{ cursor: 'pointer' }} title="Inspect evidence panel">
            <span className="chip"><Ic n="bookmark" /></span>
            <h3>Open the evidence</h3>
            <p>Select any highlighted claim to see its source, page, section and the date it was last checked.</p>
          </div>
        </div>
      </section>

      {/* Section 3: Some answers are strong. Some are honestly empty. */}
      <section id="answer-types" className="lp-section lp-answer-section">
        <div className="lp-answer-intro">
          <h2 className="lp-section-title">
            Some answers are strong.<br />
            Some are honestly empty.
          </h2>
          <p className="lp-section-sub">
            When evidence is thin, conflicting or missing, TrustLens says so instead of guessing. You always know which kind of answer you are reading.
          </p>
        </div>

        <div className="lp-grid-2x2">
          {/* Card 1 */}
          <div
            className="lp-answer-card raise lp-card-clickable"
            onClick={() => handleOpenTopic('elig')}
            role="button"
            tabIndex={0}
            title="Open Eligibility topic"
          >
            <div className="lp-ac-hd">
              <span className="chip sm"><Ic n="cap" /></span>
              <div>
                <b>Eligibility</b>
                <small>Who can apply</small>
              </div>
            </div>
            <div className="lp-ac-badge">
              <span className="pill high">High confidence</span>
              <span className="lp-ac-num">86%</span>
            </div>
            <p className="lp-ac-desc">One clear source and no conflicting source found.</p>
          </div>

          {/* Card 2 */}
          <div
            className="lp-answer-card raise lp-card-clickable"
            onClick={() => handleOpenTopic('fee')}
            role="button"
            tabIndex={0}
            title="Open Fee topic"
          >
            <div className="lp-ac-hd">
              <span className="chip sm"><Ic n="coin" /></span>
              <div>
                <b>Fee</b>
                <small>Costs & deadlines</small>
              </div>
            </div>
            <div className="lp-ac-badge">
              <span className="pill low">Low confidence</span>
              <span className="lp-ac-num">30%</span>
            </div>
            <p className="lp-ac-desc">No source states a figure, so none is given.</p>
          </div>

          {/* Card 3 */}
          <div
            className="lp-answer-card raise lp-card-clickable"
            onClick={() => handleOpenTopic('conf')}
            role="button"
            tabIndex={0}
            title="Open Conflict topic"
          >
            <div className="lp-ac-hd">
              <span className="chip sm"><Ic n="conflict" /></span>
              <div>
                <b>Conflict</b>
                <small>Sources disagree</small>
              </div>
            </div>
            <div className="lp-ac-badge">
              <span className="pill med">Medium confidence</span>
              <span className="lp-ac-num">55%</span>
            </div>
            <p className="lp-ac-desc">Two sources differ. The official notification settles it.</p>
          </div>

          {/* Card 4 */}
          <div
            className="lp-answer-card raise lp-card-clickable"
            onClick={() => handleOpenTopic('unk')}
            role="button"
            tabIndex={0}
            title="Open Unknown topic"
          >
            <div className="lp-ac-hd">
              <span className="chip sm"><Ic n="help" /></span>
              <div>
                <b>Unknown</b>
                <small>Not enough evidence</small>
              </div>
            </div>
            <div className="lp-ac-badge">
              <span className="pill low">Low confidence</span>
              <span className="lp-ac-num">15%</span>
            </div>
            <p className="lp-ac-desc">No evidence supports an answer, so TrustLens does not offer one.</p>
          </div>
        </div>
      </section>

      {/* Section 4: Every answer ends with what to check first */}
      <section id="checklist" className="lp-section lp-check-section">
        <div className="lp-check-intro">
          <h2 className="lp-section-title">
            Every answer ends with<br />
            what to check first.
          </h2>
          <p className="lp-section-sub">
            Match your degree, year and category, compare published dates, and confirm with the official source before paying anything.
          </p>
          <div className="lp-check-illustration-wrap">
            <img
              src={aiInspectionImg}
              alt="TrustLens AI Answer Verification showing 86% Confidence, Source citation, and fact-checking criteria"
              className="lp-check-illustration-img"
            />
          </div>
        </div>

        <div className="lp-check-card-wrap">
          <div className="lp-checklist-card raise">
            <div className="lp-checklist-hd">
              <span className="chip sm"><Ic n="check" /></span>
              <b>Verification Hub</b>
            </div>
            <div className="lp-checklist-items">
              <div
                className="lp-check-row inset"
                onClick={() => toggleCheck(1)}
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
              >
                <span className={`lp-check-box ${checks.includes(1) ? 'checked' : ''}`}><Ic n="check" /></span>
                <span>Find the official source</span>
              </div>
              <div
                className="lp-check-row inset"
                onClick={() => toggleCheck(2)}
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
              >
                <span className={`lp-check-box ${checks.includes(2) ? 'checked' : ''}`}><Ic n="check" /></span>
                <span>Match degree, year and category</span>
              </div>
              <div
                className="lp-check-row inset"
                onClick={() => toggleCheck(3)}
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
              >
                <span className={`lp-check-box ${checks.includes(3) ? 'checked' : ''}`}><Ic n="check" /></span>
                <span>Compare published dates</span>
              </div>
              <div
                className="lp-check-row inset"
                onClick={() => toggleCheck(4)}
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
              >
                <span className={`lp-check-box ${checks.includes(4) ? 'checked' : ''}`}><Ic n="check" /></span>
                <span>Confirm before paying anything</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Bottom CTA Banner */}
      <section className="lp-cta-banner raise">
        <div className="lp-banner-text">
          <h2>Try it on a question<br />you have right now.</h2>
          <p>Start as a guest, or create an account to keep saved answers, checklist progress and reports across devices.</p>
        </div>
        <div className="lp-banner-ctas">
          <button type="button" className="btn lp-btn-hero" onClick={() => onNavigate('register')}>
            Create account
          </button>
          <button type="button" className="lp-btn-secondary" onClick={() => onNavigate('app')}>
            <Ic n="user" />Continue as guest
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div
          className="lp-footer-brand"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          role="button"
          tabIndex={0}
          title="Back to top"
        >
          <div className="lp-logo-badge sm">
            <img src={logoImg} alt="TrustLens AI" className="lp-logo-img" />
          </div>
        </div>

        <div className="lp-footer-links">
          <button type="button" className="lp-link-text" onClick={() => onNavigate('signin')}>
            Sign in
          </button>
          <button type="button" className="lp-link-text" onClick={() => onNavigate('register')}>
            Create account
          </button>
        </div>
      </footer>
    </div>
  )
}

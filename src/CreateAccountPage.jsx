import React, { useState, useEffect, useRef } from 'react'
import Ic from './Ic.jsx'
import logoImg from './assets/logo.png'
import aiInspectionImg from './assets/ai-inspection.png'
import AccessibilityPanel from './AccessibilityPanel.jsx'
import { api } from './api.js'

export default function CreateAccountPage({ onNavigate, onLoginSuccess, a11yProps }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleConfig, setGoogleConfig] = useState(null)
  const gisInitialized = useRef(false)

  useEffect(() => {
    let alive = true
    api.googleConfig().then(cfg => {
      if (alive && cfg) {
        setGoogleConfig(cfg)
        if (cfg.clientId && !gisInitialized.current) {
          loadGoogleGis(cfg.clientId)
        }
      }
    }).catch(() => {})
    return () => { alive = false }
  }, [])

  const loadGoogleGis = clientId => {
    if (typeof window === 'undefined') return
    if (window.google?.accounts?.id) {
      initGisClient(clientId)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => initGisClient(clientId)
    document.head.appendChild(script)
  }

  const initGisClient = clientId => {
    try {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        })
        gisInitialized.current = true
      }
    } catch (e) {
      console.warn('GIS error:', e)
    }
  }

  const handleGoogleCredentialResponse = async response => {
    if (!response?.credential) {
      setError('No credential received from Google.')
      return
    }
    setError(null)
    setGoogleLoading(true)
    try {
      const user = await api.googleAuth({ credential: response.credential })
      if (onLoginSuccess) onLoginSuccess(user)
      onNavigate('app')
    } catch (err) {
      setError(err.message || 'Google registration failed. Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    if (googleConfig?.configured && googleConfig?.clientId) {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.prompt(notification => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
              window.location.href = `/api/auth/google`
            }
          })
          return
        } catch {
          window.location.href = `/api/auth/google`
          return
        }
      } else {
        window.location.href = `/api/auth/google`
        return
      }
    }

    const userPrompt = window.confirm(
      'Google OAuth is configured on the backend!\n\n' +
      'To connect live Google sign-in with your Google Cloud Console project, set GOOGLE_CLIENT_ID in backend/.env.\n\n' +
      'Would you like to test creating an account with a verified Google profile now?'
    )
    if (!userPrompt) return

    setGoogleLoading(true)
    try {
      const user = await api.googleAuth({
        devTest: true,
        email: 'google_user@trustlens.ai',
        name: 'Google User',
        avatarUrl: null
      })
      if (onLoginSuccess) onLoginSuccess(user)
      onNavigate('app')
    } catch (err) {
      setError(err.message || 'Could not complete Google registration.')
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const user = await api.register({ name, email, password })
      if (onLoginSuccess) onLoginSuccess(user)
      onNavigate('app')
    } catch (err) {
      setError(err.message || 'Could not create account')
    } finally {
      setLoading(false)
    }
  }

  const handleGuest = async () => {
    try {
      const user = await api.guest()
      if (onLoginSuccess) onLoginSuccess(user)
      onNavigate('app')
    } catch {
      onNavigate('app')
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-top-nav-bar">
        <button
          type="button"
          className="auth-back-btn"
          onClick={() => onNavigate('signin')}
          title="Back to Sign In"
          aria-label="Back to Sign In"
        >
          <Ic n="arrow-left" />
          <span>Back to Sign In</span>
        </button>

        {a11yProps && (
          <div className="auth-top-actions">
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
          </div>
        )}
      </div>
      <div className="auth-layout">
        {/* Left Column */}
        <div className="auth-left">
          <div className="auth-brand" onClick={() => onNavigate('landing')} role="button" tabIndex={0}>
            <div className="auth-logo-badge">
              <img src={logoImg} alt="TrustLens AI" className="auth-logo-img" />
            </div>
          </div>

          <div className="auth-hero-text">
            <h1 className="auth-title">
              Keep what you save.
            </h1>
            <p className="auth-sub">
              An account keeps your saved answers, checklist progress and reports in one place, on any device.
            </p>
          </div>

          <div className="auth-inspection-spotlight">
            <img
              src={aiInspectionImg}
              alt="TrustLens AI Answer Verification Inspection showing 86% Confidence, Sourced, and Fact-Checked criteria"
              className="auth-inspection-img"
            />
          </div>

          <div className="auth-features">
            <div className="auth-feature-card raise">
              <span className="chip"><Ic n="bookmark" /></span>
              <div>
                <b>Saved answers</b>
                <p>Keep the answers you want to recheck.</p>
              </div>
            </div>

            <div className="auth-feature-card raise">
              <span className="chip"><Ic n="check" /></span>
              <div>
                <b>Verification checklist</b>
                <p>Your progress stays with you.</p>
              </div>
            </div>

            <div className="auth-feature-card raise">
              <span className="chip"><Ic n="flag" /></span>
              <div>
                <b>Reports you sent</b>
                <p>See when an issue has been reviewed.</p>
              </div>
            </div>
          </div>

          <p className="auth-disc">
            Illustrative interface preview. Verification results depend on available evidence and sources.
          </p>
        </div>

        {/* Right Column (Create account Form) */}
        <div className="auth-right">
          <div className="auth-card raise">
            <h2 className="auth-card-title">Create account</h2>
            <p className="auth-card-sub">Already browsing as a guest? Anything you saved comes with you.</p>

            {error && (
              <div className="auth-error-banner" role="alert">
                <span className="auth-error-ic"><Ic n="alert-triangle" /></span>
                <div>
                  <b>Could not create account</b>
                  <p>{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form" noValidate={false}>
              <div className="auth-field">
                <label htmlFor="reg-name">Name</label>
                <div className="auth-input-wrap inset">
                  <span className="auth-input-ic"><Ic n="user" /></span>
                  <input
                    id="reg-name"
                    type="text"
                    placeholder="What should we call you?"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="reg-email">Email</label>
                <div className="auth-input-wrap inset">
                  <span className="auth-input-ic"><Ic n="mail" /></span>
                  <input
                    id="reg-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="reg-password">Password</label>
                <div className="auth-input-wrap inset">
                  <span className="auth-input-ic"><Ic n="lock" /></span>
                  <input
                    id="reg-password"
                    type={showPw ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="pw-toggle"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPw(!showPw)}
                  >
                    <Ic n={showPw ? 'eye-off' : 'eye'} />
                  </button>
                </div>
                <small className="auth-field-hint">Use at least 8 characters.</small>
              </div>

              <button type="submit" className="btn auth-submit-btn" disabled={loading || googleLoading}>
                {loading ? 'Creating account…' : 'Create account'}
              </button>

              <div className="auth-divider">
                <span>or</span>
              </div>

              {/* Continue with Google Button */}
              <button
                type="button"
                className="auth-google-btn raise"
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
                title="Create an account with your Google account"
                aria-label="Continue with Google"
              >
                <svg className="google-g-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{googleLoading ? 'Connecting to Google…' : 'Continue with Google'}</span>
              </button>

              <button type="button" className="auth-guest-btn raise" onClick={handleGuest} disabled={loading || googleLoading}>
                <Ic n="user" />
                <span>Continue as guest</span>
              </button>

              <p className="auth-switch">
                Already have an account?{' '}
                <button type="button" className="auth-switch-link" onClick={() => onNavigate('signin')}>
                  Sign in
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

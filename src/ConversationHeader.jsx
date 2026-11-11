import React, { useState } from 'react'
import Ic from './Ic.jsx'
import VerificationPulseLoader from './VerificationPulseLoader.jsx'
import logoIconImg from './assets/logo-icon.png'

export default function ConversationHeader({
  conversationTitle,
  updatedAt,
  isNewChat = false,
  isAnalysing = false,
  view = 'home',
  onRename,
  onShare,
  onSave,
  onDelete,
  onExportMarkdown,
  onClearConversation,
  onCopyTranscript,
  user,
  onNavigateAuth,
  onSignOut,
  a11yOpen,
  onToggleA11y,
  onToggleMobileNav
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  const handleStartEdit = () => {
    if (isNewChat || view !== 'home') return
    setEditTitle(conversationTitle || 'New Chat')
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    if (editTitle.trim() && onRename) {
      onRename(editTitle.trim())
    }
    setIsEditing(false)
  }

  const formatSubtitleTime = () => {
    if (!updatedAt) return 'Today, 6:42 PM'
    try {
      const d = new Date(updatedAt)
      const isToday = new Date().toDateString() === d.toDateString()
      const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      return isToday ? `Today, ${timeStr}` : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`
    } catch {
      return 'Today, 6:42 PM'
    }
  }

  const getHeaderMainTitle = () => {
    if (view === 'explore') return 'Explore Topics'
    if (view === 'saved') return 'Saved Answers & History'
    if (view === 'hub') return 'Verification Hub'
    if (view === 'feedback') return 'Feedback & Calibration'
    if (isNewChat) return 'New Chat'
    return conversationTitle || 'New Chat'
  }

  const getHeaderSubtitle = () => {
    if (isAnalysing && view === 'home') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--teal)', fontWeight: 600 }}>
          <VerificationPulseLoader size="mini" />
          <span>TrustLens is verifying answer…</span>
        </span>
      )
    }
    if (view === 'explore') return 'Curated Verification Guides'
    if (view === 'saved') return 'Audit Log & Bookmarks'
    if (view === 'hub') return 'Pre-Submission Safety Checklist'
    if (view === 'feedback') return 'Help fine-tune confidence calibration'
    if (isNewChat) return 'Start a fresh conversation'
    return `Conversation · ${formatSubtitleTime()}`
  }

  return (
    <header className="conv-header">
      {/* Left: Mobile Drawer Trigger + Brand Logo Icon + Title & Subtitle */}
      <div className="conv-header-left-group">
        {onToggleMobileNav && (
          <button
            type="button"
            className="mobile-menu-toggle-btn"
            onClick={onToggleMobileNav}
            title="Open conversation navigation menu"
            aria-label="Open conversation navigation menu"
          >
            <Ic n="menu" />
          </button>
        )}
        <div
          className="conv-header-logo-badge"
          onClick={() => onNavigateAuth && onNavigateAuth('landing')}
          title="TrustLens AI"
          aria-label="TrustLens AI Logo"
        >
          <img src={logoIconImg} alt="TrustLens AI" className="conv-header-logo-img" />
        </div>

        <div className="conv-header-info">
          {isEditing && !isNewChat && view === 'home' ? (
            <div className="conv-title-edit-wrap">
              <input
                type="text"
                className="conv-title-edit-input"
                value={editTitle}
                autoFocus
                onChange={e => setEditTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveEdit()
                  if (e.key === 'Escape') setIsEditing(false)
                }}
              />
              <button type="button" className="conv-title-save-btn" onClick={handleSaveEdit} title="Save title">
                <Ic n="check" />
              </button>
              <button type="button" className="conv-title-cancel-btn" onClick={() => setIsEditing(false)} title="Cancel">
                ×
              </button>
            </div>
          ) : (
            <div className="conv-title-row">
              <h1 className="conv-main-title" title={getHeaderMainTitle()}>
                {getHeaderMainTitle()}
              </h1>
              {!isNewChat && view === 'home' && (
                <button
                  type="button"
                  className="conv-edit-title-btn"
                  onClick={handleStartEdit}
                  title="Rename conversation"
                  aria-label="Rename conversation"
                >
                  <Ic n="edit" />
                </button>
              )}
            </div>
          )}

          <div className="conv-subtitle-row">
            <span>{getHeaderSubtitle()}</span>
          </div>
        </div>
      </div>

      {/* Right: Actions in a single well-aligned row */}
      <div className="conv-header-actions">
        <button
          type="button"
          className={`conv-action-btn a11y-header-btn ${a11yOpen ? 'is-active' : ''}`}
          onClick={onToggleA11y}
          title="Accessibility & Display settings"
          aria-label="Accessibility & Display"
        >
          <Ic n="a11y" />
          <span className="conv-btn-label">Accessibility</span>
        </button>

        <button
          type="button"
          className="conv-action-btn"
          onClick={onShare}
          title="Share conversation link or summary"
          aria-label="Share conversation"
        >
          <Ic n="share" />
          <span className="conv-btn-label">Share</span>
        </button>

        <button
          type="button"
          className="conv-action-btn"
          onClick={onSave}
          title="Save conversation bookmark"
          aria-label="Save conversation"
        >
          <Ic n="bookmark" />
          <span className="conv-btn-label">Save</span>
        </button>

        <div className="conv-more-wrap">
          <button
            type="button"
            className="conv-action-btn conv-more-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            title="More actions"
            aria-label="More actions"
          >
            <Ic n="more" />
          </button>

          {menuOpen && (
            <div className="conv-more-dropdown raise" onClick={() => setMenuOpen(false)}>
              {!isNewChat && (
                <button
                  type="button"
                  className="conv-dropdown-item"
                  onClick={handleStartEdit}
                >
                  <Ic n="edit" /> Rename conversation
                </button>
              )}
              <button
                type="button"
                className="conv-dropdown-item"
                onClick={onCopyTranscript || onShare}
              >
                <Ic n="copy" /> Copy transcript
              </button>
              <button
                type="button"
                className="conv-dropdown-item"
                onClick={onExportMarkdown}
              >
                <Ic n="arrow-down" /> Export as Markdown (.md)
              </button>
              {!isNewChat && onClearConversation && (
                <button
                  type="button"
                  className="conv-dropdown-item"
                  onClick={onClearConversation}
                >
                  <Ic n="refresh" /> Clear messages
                </button>
              )}
              {onDelete && !isNewChat && (
                <button
                  type="button"
                  className="conv-dropdown-item is-delete"
                  onClick={onDelete}
                >
                  <Ic n="trash" /> Delete conversation
                </button>
              )}
            </div>
          )}
        </div>

        {/* Auth sign in pill if guest, or sign out button if authenticated */}
        {!user || user.isGuest ? (
          <button
            type="button"
            className="conv-signin-btn"
            onClick={() => onNavigateAuth('signin')}
            title="Sign in to save your history across devices"
          >
            Sign In
          </button>
        ) : (
          <button
            type="button"
            className="conv-signin-btn"
            onClick={onSignOut}
            title="Sign out of account"
            style={{
              background: 'rgba(242, 144, 95, 0.15)',
              borderColor: 'rgba(242, 144, 95, 0.35)',
              color: 'var(--color-orange, #f2905f)'
            }}
          >
            <Ic n="logout" style={{ width: 14, height: 14, marginRight: 4 }} />
            Sign Out
          </button>
        )}
      </div>
    </header>
  )
}


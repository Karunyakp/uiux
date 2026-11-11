import React, { useState, useMemo } from 'react'
import Ic from './Ic.jsx'
import VerificationPulseLoader from './VerificationPulseLoader.jsx'
import logoIconImg from './assets/logo-icon.png'

function groupConversations(conversations) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 86400000
  const sevenDaysStart = todayStart - 7 * 86400000

  const groups = {
    today: [],
    yesterday: [],
    previous7Days: [],
    older: []
  }

  conversations.forEach(conv => {
    const rawTime = conv.updated_at || conv.updatedAt || conv.createdAt || conv.created_at || Date.now()
    const time = new Date(rawTime).getTime()
    if (time >= todayStart) {
      groups.today.push(conv)
    } else if (time >= yesterdayStart) {
      groups.yesterday.push(conv)
    } else if (time >= sevenDaysStart) {
      groups.previous7Days.push(conv)
    } else {
      groups.older.push(conv)
    }
  })

  return groups
}

export default function Sidebar({
  user,
  view,
  onGoView,
  onNewChat,
  conversations = [],
  activeConversationId,
  isAnalysing = false,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  onOpenSettings,
  onOpenProfile,
  onSignOut,
  onNavigateLanding,
  mobileNavOpen = false,
  onCloseMobileNav
}) {
  const [historyOpen, setHistoryOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingConvId, setEditingConvId] = useState(null)
  const [editTitleText, setEditTitleText] = useState('')
  const [menuConvId, setMenuConvId] = useState(null)

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(c => (c.title || '').toLowerCase().includes(q))
  }, [conversations, searchQuery])

  // Group filtered conversations
  const grouped = useMemo(() => groupConversations(filteredConversations), [filteredConversations])

  const handleStartRename = (e, conv) => {
    e.stopPropagation()
    setEditingConvId(conv.id)
    setEditTitleText(conv.title || 'New Conversation')
    setMenuConvId(null)
  }

  const handleSaveRename = (e, id) => {
    e.stopPropagation()
    if (editTitleText.trim()) {
      onRenameConversation(id, editTitleText.trim())
    }
    setEditingConvId(null)
  }

  const handleCancelRename = e => {
    e.stopPropagation()
    setEditingConvId(null)
  }

  const userInitial = (user?.name || 'K').charAt(0).toUpperCase()
  const isGuest = !user || user.isGuest

  const handleAction = fn => {
    if (onCloseMobileNav) onCloseMobileNav()
    if (fn) fn()
  }

  return (
    <aside className={`side ${mobileNavOpen ? 'is-mobile-open' : ''}`} aria-label="Main navigation and conversation history">
      {/* 1. BRANDING */}
      <div className="side-brand-header">
        <div
          className="side-brand-main-click"
          onClick={() => handleAction(onNavigateLanding)}
          role="button"
          tabIndex={0}
          title="TrustLens AI"
        >
          <div className="side-brand-badge">
            <img src={logoIconImg} alt="TrustLens AI" className="side-brand-logo-img" />
          </div>
          <div className="side-brand-text">
            <b className="side-brand-title">TrustLens AI</b>
            <span className="side-brand-tagline">AI · VERIFY · UNDERSTAND</span>
          </div>
        </div>
        {onCloseMobileNav && (
          <button
            type="button"
            className="side-mobile-close-btn"
            onClick={onCloseMobileNav}
            aria-label="Close menu"
            title="Close menu"
          >
            ×
          </button>
        )}
      </div>

      {/* 2. PROMINENT NEW CHAT BUTTON */}
      <button
        type="button"
        className="newchat"
        onClick={() => handleAction(onNewChat)}
        title="Start a fresh verification conversation"
        aria-label="New Chat"
      >
        <Ic n="plus" />
        <span>New Chat</span>
      </button>

      {/* 3. MAIN NAVIGATION ITEMS */}
      <div className="side-nav-scroll-area">
        {/* Home Navigation */}
        <button
          type="button"
          className={`side-nav-item ${view === 'home' && !activeConversationId ? 'is-active' : ''}`}
          onClick={() => handleAction(() => onGoView('home'))}
        >
          <Ic n="home" />
          <span>Home</span>
        </button>

        {/* Chat History Accordion Section */}
        <div className="side-history-accordion">
          <button
            type="button"
            className="side-history-header"
            onClick={() => setHistoryOpen(!historyOpen)}
            aria-expanded={historyOpen}
          >
            <div className="side-history-header-left">
              <Ic n="chat" />
              <span>Chat History</span>
            </div>
            <span className={`side-chevron ${historyOpen ? 'is-open' : ''}`}>
              <Ic n="chevron-down" />
            </span>
          </button>

          {historyOpen && (
            <div className="side-history-content">
              {/* Search conversations input */}
              <div className="side-search-wrapper">
                <span className="side-search-icon">
                  <Ic n="search" />
                </span>
                <input
                  type="text"
                  className="side-search-input"
                  placeholder="Search conversations…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  aria-label="Search conversations"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="side-search-clear"
                    onClick={() => setSearchQuery('')}
                    title="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Conversation Groups */}
              {conversations.length === 0 ? (
                <div className="side-empty-history">
                  <small>No past conversations yet</small>
                </div>
              ) : (
                <>
                  {/* Today */}
                  {grouped.today.length > 0 && (
                    <div className="side-group">
                      <div className="side-group-label">Today</div>
                      {grouped.today.map(conv => renderConvItem(conv))}
                    </div>
                  )}

                  {/* Yesterday */}
                  {grouped.yesterday.length > 0 && (
                    <div className="side-group">
                      <div className="side-group-label">Yesterday</div>
                      {grouped.yesterday.map(conv => renderConvItem(conv))}
                    </div>
                  )}

                  {/* Previous 7 Days */}
                  {grouped.previous7Days.length > 0 && (
                    <div className="side-group">
                      <div className="side-group-label">Previous 7 Days</div>
                      {grouped.previous7Days.map(conv => renderConvItem(conv))}
                    </div>
                  )}

                  {/* Older */}
                  {grouped.older.length > 0 && (
                    <div className="side-group">
                      <div className="side-group-label">Older</div>
                      {grouped.older.map(conv => renderConvItem(conv))}
                    </div>
                  )}

                  {filteredConversations.length === 0 && searchQuery && (
                    <div className="side-empty-history">
                      <small>No conversations matching "{searchQuery}"</small>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Other Sections */}
        <button
          type="button"
          className={`side-nav-item ${view === 'saved' ? 'is-active' : ''}`}
          onClick={() => handleAction(() => onGoView('saved'))}
        >
          <Ic n="bookmark" />
          <span>Saved Answers</span>
        </button>

        <button
          type="button"
          className={`side-nav-item ${view === 'hub' ? 'is-active' : ''}`}
          onClick={() => handleAction(() => onGoView('hub'))}
        >
          <Ic n="shield" />
          <span>Verification Hub</span>
        </button>

        <button
          type="button"
          className={`side-nav-item ${view === 'explore' ? 'is-active' : ''}`}
          onClick={() => handleAction(() => onGoView('explore'))}
        >
          <Ic n="compass" />
          <span>Explore Topics</span>
        </button>

        <button
          type="button"
          className={`side-nav-item ${view === 'feedback' ? 'is-active' : ''}`}
          onClick={() => handleAction(() => onGoView('feedback'))}
        >
          <Ic n="msg" />
          <span>Feedback</span>
        </button>
      </div>

      {/* 4. USER PROFILE AND SETTINGS AT BOTTOM */}
      <div className="side-user-footer">
        <div
          className="side-user-info"
          onClick={() => handleAction(onOpenProfile)}
          role="button"
          tabIndex={0}
          title="View profile & account statistics"
          style={{ cursor: 'pointer' }}
        >
          <div className="side-user-avatar" title={user?.name || 'User'}>
            {userInitial}
          </div>
          <div className="side-user-names">
            <b className="side-user-fullname">{user?.name || (isGuest ? 'Guest User' : 'User')}</b>
            <small className="side-user-plan">{isGuest ? 'Free Plan' : 'Verified Pro'}</small>
          </div>
        </div>
        <button
          type="button"
          className="side-settings-btn"
          onClick={() => handleAction(onOpenSettings)}
          title="Accessibility & Theme Settings"
          aria-label="Accessibility & Display settings"
        >
          <Ic n="a11y" />
        </button>

        {/* Sign Out Button in Sidebar Footer */}
        {user && !isGuest && (
          <button
            type="button"
            className="side-settings-btn"
            onClick={() => handleAction(onSignOut)}
            title="Sign out of TrustLens"
            aria-label="Sign out"
            style={{ color: 'var(--color-orange, #f2905f)' }}
          >
            <Ic n="logout" />
          </button>
        )}
      </div>
    </aside>
  )

  function renderConvItem(conv) {
    const isActive = activeConversationId === conv.id
    const isEditing = editingConvId === conv.id
    const isMenuOpen = menuConvId === conv.id

    if (isEditing) {
      return (
        <div key={conv.id} className="side-conv-item is-renaming" onClick={e => e.stopPropagation()}>
          <input
            type="text"
            className="side-rename-input"
            value={editTitleText}
            autoFocus
            onChange={e => setEditTitleText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSaveRename(e, conv.id)
              if (e.key === 'Escape') handleCancelRename(e)
            }}
          />
          <button type="button" className="side-rename-check" onClick={e => handleSaveRename(e, conv.id)}>
            <Ic n="check" />
          </button>
          <button type="button" className="side-rename-cancel" onClick={handleCancelRename}>
            ×
          </button>
        </div>
      )
    }

    return (
      <div
        key={conv.id}
        className={`side-conv-item ${isActive ? 'is-active' : ''}`}
        onClick={() => handleAction(() => onSelectConversation(conv.id))}
        role="button"
        tabIndex={0}
      >
        <span className="side-conv-icon">
          {isActive && isAnalysing ? <VerificationPulseLoader size="mini" /> : <Ic n="chat" />}
        </span>
        <span className="side-conv-title" title={conv.title || 'Conversation'}>
          {conv.title || 'New Conversation'}
        </span>

        {/* Action Menu Trigger */}
        <div className="side-conv-actions" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            className="side-conv-more-btn"
            onClick={e => {
              e.stopPropagation()
              setMenuConvId(isMenuOpen ? null : conv.id)
            }}
            title="Options"
          >
            <Ic n="more" />
          </button>

          {isMenuOpen && (
            <div className="side-conv-menu-dropdown raise">
              <button
                type="button"
                className="side-conv-menu-item"
                onClick={e => handleStartRename(e, conv)}
              >
                <Ic n="edit" /> Rename
              </button>
              <button
                type="button"
                className="side-conv-menu-item is-delete"
                onClick={e => {
                  setMenuConvId(null)
                  onDeleteConversation(e, conv.id)
                }}
              >
                <Ic n="trash" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }
}

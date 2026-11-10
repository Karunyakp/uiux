import { useState, useRef, useEffect } from 'react'
import { C as FALLBACK_C, K as FALLBACK_K } from './data.js'
import { api, ensureSession } from './api.js'
import Sprite from './Sprite.jsx'
import Ic from './Ic.jsx'
import Evidence from './Evidence.jsx'
import logoImg from './assets/logo.png'
import LandingPage from './LandingPage.jsx'
import SignInPage from './SignInPage.jsx'
import CreateAccountPage from './CreateAccountPage.jsx'
import AccessibilityPanel from './AccessibilityPanel.jsx'
import { UserMessage, AssistantMessage } from './ChatMessage.jsx'
import WelcomeChat from './WelcomeChat.jsx'
import Sidebar from './Sidebar.jsx'
import ConversationHeader from './ConversationHeader.jsx'
import ChatComposer from './ChatComposer.jsx'

const NAV = [
  ['home', 'home', 'Home'],
  ['explore', 'compass', 'Explore Topics'],
  ['saved', 'bookmark', 'Saved Answers'],
  ['hub', 'check', 'Verification Hub'],
  ['feedback', 'msg', 'Feedback'],
  ['landing', 'spark', 'Tour & Landing']
]
const HUB = ['Find the official source', 'Match degree, year and category', 'Compare published dates', 'Confirm before paying anything']

const CATEGORIES = [
  {
    id: 'elig',
    name: 'Eligibility Rules',
    sub: 'Degree & Criteria',
    ic: 'cap',
    defaultQuery: 'What are the official eligibility requirements for this program?'
  },
  {
    id: 'fee',
    name: 'Fee & Deadlines',
    sub: 'Costs & Schedules',
    ic: 'coin',
    defaultQuery: 'What are the published fee schedules, payment concessions, and deadlines?'
  },
  {
    id: 'conf',
    name: 'Discrepancy Check',
    sub: 'Conflict Detection',
    ic: 'conflict',
    defaultQuery: 'Are there conflicting statements across official notices and independent sources?'
  },
  {
    id: 'unk',
    name: 'Uncertainty Check',
    sub: 'Policy Ambiguity',
    ic: 'help',
    defaultQuery: 'What clauses or rules remain unverified by official authorities?'
  }
]

const A11Y_STORAGE_KEY = 'trustlens_a11y_settings'
const getStoredA11y = () => {
  try {
    const raw = localStorage.getItem(A11Y_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const pref = parsed.themePreference || parsed.theme
      const validTheme = ['light', 'dark', 'system'].includes(pref) ? pref : 'system'
      return {
        theme: validTheme,
        themePreference: validTheme,
        colorBlind: !!parsed.colorBlind,
        largeText: !!parsed.largeText,
        dyslexicFont: !!parsed.dyslexicFont,
        calmMotion: !!parsed.calmMotion,
        focusMode: !!parsed.focusMode
      }
    }
  } catch {}
  return {
    theme: 'system',
    themePreference: 'system',
    colorBlind: false,
    largeText: false,
    dyslexicFont: false,
    calmMotion: false,
    focusMode: false
  }
}

export default function App() {
  const [cur, setCur] = useState('elig')
  const [tab, setTab] = useState('e')
  const [view, setView] = useState('home')
  const [saved, setSaved] = useState([])
  const [savedItems, setSavedItems] = useState([])
  const [data, setData] = useState({ C: {}, K: [] })
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | offline
  const [checks, setChecks] = useState(HUB.map((label, i) => ({ id: i + 1, label, done: false })))
  const [unread, setUnread] = useState(0)
  const [search, setSearch] = useState('')
  const [follow, setFollow] = useState('')
  const [fb, setFb] = useState('')
  const [attachments, setAttachments] = useState([])
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [feedbackCategory, setFeedbackCategory] = useState('Confidence Calibration')
  const [feedbackRating, setFeedbackRating] = useState(5)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [selectedClaimIndex, setSelectedClaimIndex] = useState(0)
  const [isAnalysing, setIsAnalysing] = useState(false)
  const [conversationId, setConversationId] = useState(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'conv_' + Date.now()
  )
  const [conversationsList, setConversationsList] = useState([])
  const [savedTab, setSavedTab] = useState('saved') // 'saved' | 'history'

  // Chat message stream and active inspected message
  const [messages, setMessages] = useState([])
  const [activeMessageId, setActiveMessageId] = useState(null)
  const [showScrollBottom, setShowScrollBottom] = useState(false)

  const chatContainerRef = useRef(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const isUserScrolledUp = useRef(false)

  const [toastText, setToastText] = useState('')
  const [toastOn, setToastOn] = useState(false)
  const [a11yOpen, setA11yOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const streamIntervalRef = useRef(null)
  const conversationIdRef = useRef(conversationId)

  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])

  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current)
      }
    }
  }, [])

  // Centralized Theme Management:
  // themePreference = 'light' | 'dark' | 'system' (User preference stored in localStorage)
  // resolvedTheme = 'light' | 'dark' (Active visual appearance calculated & applied to DOM)
  const getSystemTheme = () => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  }

  const storedA11y = useRef(getStoredA11y()).current
  const [themePreference, setThemePreference] = useState(storedA11y.themePreference || storedA11y.theme || 'system')
  const theme = themePreference
  const setTheme = setThemePreference
  const [resolvedTheme, setResolvedTheme] = useState(() => {
    return storedA11y.themePreference || storedA11y.theme || 'system'
  })
  const [colorBlind, setColorBlind] = useState(!!storedA11y.colorBlind)
  const [largeText, setLargeText] = useState(!!storedA11y.largeText)
  const [dyslexicFont, setDyslexicFont] = useState(!!storedA11y.dyslexicFont)
  const [calmMotion, setCalmMotion] = useState(!!storedA11y.calmMotion)
  const [focusMode, setFocusMode] = useState(!!storedA11y.focusMode)
  const [isReading, setIsReading] = useState(false)
  const timer = useRef()

  const { C, K } = data
  const online = status === 'ready'
  const c = C[cur]
  const hr = new Date().getHours()
  const part = hr < 12 ? 'morning' : hr < 18 ? 'afternoon' : 'evening'

  // Load initial session and conversations
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const u = await ensureSession()
        const [t, s, cl, n, convs] = await Promise.all([
          api.topics(),
          api.saved(),
          api.checklist(),
          api.notifications(),
          api.conversations().catch(() => ({ conversations: [] }))
        ])
        if (!alive) return
        setUser(u)
        setData({ C: t.topics, K: t.order })
        setCur(t.order[0] || 'elig')
        setSaved(s.keys || [])
        setSavedItems(s.items || [])
        setChecks(cl.items || [])
        setUnread(n.unread || 0)
        setConversationsList(convs.conversations || [])
        setStatus('ready')
      } catch {
        if (!alive) return
        setData({ C: FALLBACK_C, K: FALLBACK_K })
        setCur(FALLBACK_K[0] || 'elig')
        setStatus('offline')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const getHashPage = () => {
    const h = (window.location.hash || '').replace(/^#\/?/, '').split('?')[0]
    return ['landing', 'signin', 'register', 'app'].includes(h) ? h : 'landing'
  }
  const [page, setPage] = useState(getHashPage)

  useEffect(() => {
    const onHashChange = () => setPage(getHashPage())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Handle Google OAuth callback token from URL
  useEffect(() => {
    try {
      const searchStr = window.location.search || (window.location.hash.includes('?') ? '?' + window.location.hash.split('?')[1] : '')
      const params = new URLSearchParams(searchStr)
      const oauthToken = params.get('token')
      if (oauthToken) {
        api.setToken(oauthToken)
        window.history.replaceState({}, document.title, window.location.pathname + '#/app')
        ensureSession().then(u => {
          if (u) {
            setUser(u)
            toast(`Signed in as ${u.name} via Google!`)
          }
        }).catch(() => {})
      }
    } catch {}
  }, [])

  // Persist accessibility & theme settings
  useEffect(() => {
    try {
      localStorage.setItem(
        A11Y_STORAGE_KEY,
        JSON.stringify({
          theme: themePreference,
          themePreference,
          resolvedTheme,
          colorBlind,
          largeText,
          dyslexicFont,
          calmMotion,
          focusMode
        })
      )
    } catch {}
  }, [themePreference, resolvedTheme, colorBlind, largeText, dyslexicFont, calmMotion, focusMode])

  useEffect(() => {
    document.body.classList.toggle('a11y-large-text', largeText)
    document.body.classList.toggle('a11y-color-blind', colorBlind)
    document.body.classList.toggle('a11y-dyslexic', dyslexicFont)
    document.body.classList.toggle('a11y-calm-motion', calmMotion)
    document.body.classList.toggle('a11y-focus-mode', focusMode)
  }, [largeText, colorBlind, dyslexicFont, calmMotion, focusMode])

  // Centralized Theme Resolution and OS prefers-color-scheme Listener
  useEffect(() => {
    const applyResolved = (activeTheme) => {
      setResolvedTheme(activeTheme)
      document.documentElement.setAttribute('data-theme', activeTheme)
      document.documentElement.setAttribute('data-theme-preference', themePreference)
      document.documentElement.setAttribute('data-resolved-theme', activeTheme)
      document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-system', 'light', 'dark', 'system')
      document.documentElement.classList.add(activeTheme, `theme-${activeTheme}`)
      document.documentElement.style.colorScheme = activeTheme

      if (document.body) {
        document.body.setAttribute('data-theme', activeTheme)
        document.body.classList.remove('theme-light', 'theme-dark', 'theme-system', 'light', 'dark', 'system')
        document.body.classList.add(activeTheme, `theme-${activeTheme}`)
      }
    }

    if (themePreference === 'light') {
      applyResolved('light')
    } else if (themePreference === 'dark') {
      applyResolved('dark')
    } else {
      // System mode: distinct Teal Blue theme (#0A2433 / #0D2D40)
      applyResolved('system')
    }
  }, [themePreference])

  // Audio speech cleanup
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [])

  // Detect scroll position in chat area
  const handleScroll = () => {
    if (!chatContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    const isUp = distanceFromBottom > 140
    setShowScrollBottom(isUp)
    isUserScrolledUp.current = isUp
  }

  // Smooth scroll to bottom
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
    }
  }

  // Auto-scroll when messages change or generation starts/ends
  useEffect(() => {
    if (!isUserScrolledUp.current) {
      scrollToBottom(true)
    }
  }, [messages.length, isAnalysing])

  const toggleReadAloud = () => {
    if (!('speechSynthesis' in window)) {
      toast('Speech synthesis is not supported in this browser.')
      return
    }
    if (isReading) {
      window.speechSynthesis.cancel()
      setIsReading(false)
      toast('Audio paused.')
    } else {
      window.speechSynthesis.cancel()
      const activeAsst =
        messages.find(m => m.id === activeMessageId && m.role === 'assistant') ||
        [...messages].reverse().find(m => m.role === 'assistant' && !m.pending && !m.error)
      const answerText = activeAsst?.plainAnswer || c?.plainAnswer || c?.a?.replace(/<[^>]+>/g, '') || ''
      const level = activeAsst?.lvl || c?.lvl || 'Moderate'
      const textToRead = `TrustLens Verification. Confidence level: ${level}. ${answerText}.`
      const utter = new SpeechSynthesisUtterance(textToRead)
      utter.rate = 0.95
      utter.pitch = 1.0
      utter.onend = () => setIsReading(false)
      utter.onerror = () => setIsReading(false)
      window.speechSynthesis.speak(utter)
      setIsReading(true)
      toast('Reading answer aloud...')
    }
  }

  const navigate = target => {
    if (target === 'landing') window.location.hash = '#/landing'
    else if (target === 'signin') window.location.hash = '#/signin'
    else if (target === 'register') window.location.hash = '#/register'
    else if (target === 'app') window.location.hash = '#/app'
    setPage(target)
  }

  const handleAuthSuccess = async u => {
    setUser(u)
    try {
      const [s, cl, n, convs] = await Promise.all([
        api.saved(),
        api.checklist(),
        api.notifications(),
        api.conversations().catch(() => ({ conversations: [] }))
      ])
      setSaved(s.keys || [])
      setSavedItems(s.items || [])
      setChecks(cl.items || [])
      setUnread(n.unread || 0)
      setConversationsList(convs.conversations || [])
    } catch {}
    toast(`Welcome, ${u.name}!`)
    navigate('app')
  }

  const toast = t => {
    setToastText(t)
    setToastOn(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToastOn(false), 2400)
  }

  // Category shortcut selection: loads template question into composer without hardcoded dumps
  const goCat = k => {
    setCur(k)
    setView('home')
    const cat = CATEGORIES.find(c => c.id === k) || (C && C[k])
    const query = cat?.defaultQuery || cat?.q
    if (query) {
      setFollow(query)
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + 'px'
      }
      toast(`Loaded template: "${query.slice(0, 42)}…"`)
    }
  }

  const goView = v => {
    if (v === 'landing') {
      navigate('landing')
      return
    }
    setView(v)
  }

  const onSearch = v => {
    setSearch(v)
    setView(v.trim() ? 'explore' : 'home')
  }
  const q = search.trim().toLowerCase()
  const results = K.filter(k => (C[k].q + C[k].claim + C[k].n).toLowerCase().includes(q))

  // Toggle saving an answer or topic
  const toggleSave = async messageItem => {
    const keyToSave = messageItem?.id ? String(messageItem.id) : cur
    const was = saved.includes(keyToSave)
    setSaved(s => (was ? s.filter(x => x !== keyToSave) : [...s, keyToSave]))
    toast(was ? 'Removed from saved.' : 'Answer saved to your account.')
    if (!online) return
    try {
      let res
      if (was) {
        res = await api.unsave(keyToSave)
      } else {
        const title = messageItem?.promptText || messageItem?.claims?.[0]?.text || activeTitle || 'Saved Answer'
        const content = messageItem?.plainAnswer || messageItem?.content || ''
        res = await api.save(keyToSave, {
          title: title.slice(0, 100),
          content,
          metadata: {
            level: messageItem?.lvl || 'High',
            score: messageItem?.pct ?? 86,
            sourcesCount: messageItem?.sources?.length || 0
          }
        })
      }
      if (res?.keys) setSaved(res.keys)
      if (res?.items) setSavedItems(res.items)
    } catch {
      // Revert if API fails
      setSaved(s => (was ? [...s, keyToSave] : s.filter(x => x !== keyToSave)))
      toast('Could not update saved answers.')
    }
  }

  // Handle file attachments
  const handleAddAttachments = async newFiles => {
    const readAsDataUrl = file =>
      new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

    const processed = []
    for (const file of newFiles) {
      try {
        const dataUrl = await readAsDataUrl(file)
        processed.push({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl
        })
      } catch (e) {
        console.error('Error reading file:', file.name, e)
      }
    }

    if (processed.length) {
      setAttachments(prev => [...prev, ...processed])
      toast(`Attached ${processed.length} file${processed.length > 1 ? 's' : ''}.`)
    }
  }

  const handleRemoveAttachment = id => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  // Handle clicking claim marks inside answers
  const handleClaimClick = (e, message) => {
    if (e.target.tagName !== 'MARK') return
    const marks = [...e.currentTarget.querySelectorAll('mark')]
    const idx = marks.indexOf(e.target)
    setActiveMessageId(message.id)
    setTab('e')
    setSelectedClaimIndex(idx >= 0 ? idx : 0)
    toast('Evidence panel focused on selected claim.')
  }

  // Handle selecting an assistant message
  const handleSelectMessage = msgId => {
    setActiveMessageId(msgId)
    setSelectedClaimIndex(0)
    toast('Inspecting this answer in Evidence panel.')
  }

  // Send question to Gemini & Trust Calibration Engine
  const handleAskQuestion = async (questionText, isRetry = false, retryAsstId = null, overrideAttachments = null) => {
    const currentAttachments = overrideAttachments !== null ? overrideAttachments : [...attachments]
    const rawText = (questionText || '').trim()
    const qText = rawText || (currentAttachments.length > 0 ? `Please verify and extract key details from the attached file: ${currentAttachments.map(a => a.name).join(', ')}` : '')
    if (!qText || isAnalysing) return
    setFollow('')
    setAttachments([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setView('home')
    setIsAnalysing(true)

    const userMsgId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const asstMsgId = retryAsstId || `asst_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    // Optimistically update message stream
    setMessages(prev => {
      const filtered = isRetry ? prev.filter(m => m.id !== retryAsstId) : prev
      const newItems = []
      if (!isRetry) {
        newItems.push({
          id: userMsgId,
          role: 'user',
          content: qText,
          attachments: currentAttachments.map(a => ({ name: a.name, size: a.size, type: a.type })),
          timestamp: timeStr
        })
      }
      newItems.push({
        id: asstMsgId,
        role: 'assistant',
        promptText: qText,
        attachments: currentAttachments,
        pending: true,
        error: false,
        timestamp: timeStr
      })
      return [...filtered, ...newItems]
    })

    // Reset user scroll lock so user sees new message
    isUserScrolledUp.current = false
    setTimeout(() => scrollToBottom(true), 40)
    toast('TrustLens is analysing your question...')

    try {
      // Build conversation history from existing messages in this conversation
      const hist = messages
        .filter(m => !m.pending && !m.error)
        .map(m => ({
          role: m.role,
          content: m.plainAnswer || m.content
        }))

      const targetConvId = conversationId
      const res = await api.chat(qText, targetConvId, hist, currentAttachments)

      if (conversationIdRef.current !== targetConvId) {
        // User switched conversations while this was being analyzed.
        // It is safely stored in the database under targetConvId, but do not overwrite the current active conversation view.
        return
      }

      // Progressive streaming response display
      const fullAnswer = res.answer || ''
      const fullHtml = res.answerHtml || fullAnswer
      const words = fullAnswer.split(' ')

      if (words.length <= 10) {
        setMessages(prev =>
          prev.map(item => {
            if (item.id !== asstMsgId) return item
            return {
              ...item,
              pending: false,
              error: false,
              content: fullAnswer,
              plainAnswer: fullAnswer,
              answerHtml: fullHtml,
              lvl: res.confidence?.level || 'High',
              pct: res.confidence?.score ?? 86,
              hasScore: res.confidence?.score !== null,
              ex: res.confidence?.explanation || '',
              why: res.why || [],
              by: res.before_you_act || res.beforeYouAct || '',
              claims: res.claims || [],
              sources: res.sources || [],
              attachments: currentAttachments.length > 0 ? currentAttachments : item.attachments,
              uncertainties: res.uncertainties || [],
              conflicts: res.conflicts || [],
              verificationStatus: res.verification_status || 'Verified',
              breakdown: res.confidence?.breakdown || res.ui?.breakdown || null,
              ui: res.ui
            }
          })
        )
      } else {
        let currentWordIdx = 6
        setMessages(prev =>
          prev.map(item => {
            if (item.id !== asstMsgId) return item
            const partialText = words.slice(0, currentWordIdx).join(' ')
            return {
              ...item,
              pending: false,
              error: false,
              content: partialText,
              plainAnswer: partialText,
              answerHtml: partialText,
              lvl: res.confidence?.level || 'High',
              pct: res.confidence?.score ?? 86,
              hasScore: res.confidence?.score !== null,
              ex: res.confidence?.explanation || '',
              why: res.why || [],
              by: res.before_you_act || res.beforeYouAct || '',
              claims: res.claims || [],
              sources: res.sources || [],
              attachments: currentAttachments.length > 0 ? currentAttachments : item.attachments,
              uncertainties: res.uncertainties || [],
              conflicts: res.conflicts || [],
              verificationStatus: res.verification_status || 'Verified',
              breakdown: res.confidence?.breakdown || res.ui?.breakdown || null,
              ui: res.ui
            }
          })
        )

        if (streamIntervalRef.current) {
          clearInterval(streamIntervalRef.current)
        }
        streamIntervalRef.current = setInterval(() => {
          if (conversationIdRef.current !== targetConvId) {
            clearInterval(streamIntervalRef.current)
            streamIntervalRef.current = null
            return
          }
          currentWordIdx += 6
          if (currentWordIdx >= words.length) {
            clearInterval(streamIntervalRef.current)
            streamIntervalRef.current = null
            setMessages(prev =>
              prev.map(item => {
                if (item.id !== asstMsgId) return item
                return {
                  ...item,
                  content: fullAnswer,
                  plainAnswer: fullAnswer,
                  answerHtml: fullHtml
                }
              })
            )
          } else {
            const partialText = words.slice(0, currentWordIdx).join(' ')
            setMessages(prev =>
              prev.map(item => {
                if (item.id !== asstMsgId) return item
                return {
                  ...item,
                  content: partialText,
                  plainAnswer: partialText,
                  answerHtml: partialText
                }
              })
            )
          }
        }, 30)
      }

      setActiveMessageId(asstMsgId)
      setSelectedClaimIndex(0)

      // Refresh conversations list in background
      api.conversations().then(data => {
        if (data?.conversations) setConversationsList(data.conversations)
      }).catch(() => {})

      toast('Answer calibrated with real evidence.')
    } catch (err) {
      let rawMsg = err.message || 'Could not connect to TrustLens AI service.'
      let cleanMsg = rawMsg

      try {
        const jsonMatch = rawMsg.match(/\{[\s\S]*"error"[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          if (parsed.error?.message) {
            cleanMsg = parsed.error.message
          }
        }
      } catch {}

      const lower = cleanMsg.toLowerCase()
      if (lower.includes('high demand') || lower.includes('unavailable') || lower.includes('503')) {
        cleanMsg = 'AI model is currently experiencing high demand. Please click Retry in a few moments.'
      } else if (lower.includes('rate limit') || lower.includes('429')) {
        cleanMsg = 'Rate limit reached. Please wait a few moments and retry.'
      } else {
        cleanMsg = cleanMsg.replace(/^Gemini API service error:\s*/i, '').trim()
      }

      setMessages(prev =>
        prev.map(item => {
          if (item.id !== asstMsgId) return item
          return {
            ...item,
            pending: false,
            error: true,
            errorMsg: cleanMsg,
            promptText: qText
          }
        })
      )
      toast(cleanMsg)
    } finally {
      setIsAnalysing(false)
      setTimeout(() => {
        if (!isUserScrolledUp.current) {
          scrollToBottom(true)
        }
      }, 60)
    }
  }

  // Retry generating a failed response
  const handleRetry = (failedAsstId, promptText) => {
    handleAskQuestion(promptText, true, failedAsstId)
  }

  // Multiline Textarea Change
  const handleTextareaChange = e => {
    setFollow(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }

  // Voice speech-to-text transcript update
  const handleVoiceInput = text => {
    setFollow(text)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }

  // Enter to submit, Shift+Enter for newline
  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if ((follow.trim() || attachments.length > 0) && !isAnalysing) {
        handleAskQuestion(follow)
      }
    }
  }

  const submitFollow = e => {
    if (e && e.preventDefault) e.preventDefault()
    handleAskQuestion(follow)
  }

  const copyAnswer = async textToCopy => {
    const text = textToCopy ? textToCopy.replace(/<[^>]+>/g, '') : ''
    if (!text) {
      toast('No answer text to copy.')
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      toast('Answer copied to clipboard.')
    } catch {
      toast('Could not copy to clipboard.')
    }
  }

  // 2. NEW CHAT FUNCTIONALITY - Fresh, isolated workspace (no unwanted notification flash)
  const handleNewChat = () => {
    if (isAnalysing) {
      toast('Please wait for the current analysis to complete before starting a new chat.')
      return
    }
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current)
      streamIntervalRef.current = null
    }

    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'conv_' + Date.now()
    setConversationId(newId)
    setMessages([])
    setAttachments([])
    setActiveMessageId(null)
    setFollow('')
    setSelectedClaimIndex(0)
    setIsAnalysing(false)
    setSearch('')
    setView('home')
    isUserScrolledUp.current = false
    setShowScrollBottom(false)

    // Clear any active toast immediately so no flash or rectangle appears
    if (timer.current) clearTimeout(timer.current)
    setToastOn(false)
    setToastText('')

    if (textareaRef.current) {
      textareaRef.current.value = ''
      textareaRef.current.style.height = 'auto'
      textareaRef.current.focus()
    }
  }

  // Load a past conversation
  const loadConversation = async id => {
    if (isAnalysing) {
      toast('Please wait for the current analysis to finish.')
      return
    }
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current)
      streamIntervalRef.current = null
    }

    try {
      toast('Loading conversation…')
      const data = await api.conversation(id)
      if (data?.messages) {
        const mapped = data.messages.map(m => {
          const sd = m.structuredData
          return {
            id: `msg_${m.id}`,
            role: m.role,
            content: m.content,
            timestamp: m.createdAt
              ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '',
            pending: false,
            error: false,
            plainAnswer: m.role === 'assistant' ? m.content : undefined,
            answerHtml: sd?.answerHtml || m.content,
            lvl: sd?.confidence?.level || 'Moderate',
            pct: sd?.confidence?.score ?? 85,
            hasScore: sd?.confidence?.score !== null,
            ex: sd?.confidence?.explanation || '',
            why: sd?.why || [],
            by: sd?.beforeYouAct || sd?.before_you_act || '',
            claims: sd?.claims || [],
            sources: sd?.sources || [],
            uncertainties: sd?.uncertainties || [],
            conflicts: sd?.conflicts || [],
            verificationStatus: sd?.verificationStatus || sd?.verification_status || 'verified',
            breakdown: sd?.confidence?.breakdown || sd?.breakdown || null,
            ui: sd?.ui || null
          }
        })
        setMessages(mapped)
        setConversationId(id)
        const lastAsst = [...mapped].reverse().find(m => m.role === 'assistant')
        if (lastAsst) {
          setActiveMessageId(lastAsst.id)
        }
        setView('home')
        toast('Conversation loaded.')
        setTimeout(() => scrollToBottom(false), 50)
      }
    } catch (err) {
      toast(err.message || 'Could not load conversation.')
    }
  }

  // Delete past conversation
  const handleDeleteConversation = async (e, id) => {
    if (e && e.stopPropagation) e.stopPropagation()
    if (!window.confirm('Delete this conversation?')) return
    try {
      await api.deleteConversation(id)
      setConversationsList(prev => prev.filter(c => c.id !== id))
      if (conversationId === id) {
        handleNewChat()
      }
      toast('Conversation deleted.')
    } catch {
      toast('Could not delete conversation.')
    }
  }

  // Rename past conversation
  const handleRenameConversation = async (id, newTitle) => {
    const trimmed = (newTitle || '').trim()
    if (!trimmed) return
    try {
      await api.renameConversation(id, trimmed)
      setConversationsList(prev => prev.map(c => c.id === id ? { ...c, title: trimmed } : c))
      toast('Conversation renamed.')
    } catch {
      toast('Could not rename conversation.')
    }
  }

  const handleRenameActiveConversation = async newTitle => {
    await handleRenameConversation(conversationId, newTitle)
  }

  // Share conversation summary
  const handleShareConversation = async () => {
    try {
      const summary = messages.map(m => `${m.role.toUpperCase()}: ${m.plainAnswer || m.content}`).join('\n\n')
      await navigator.clipboard.writeText(summary || window.location.href)
      toast('Copied conversation summary to clipboard.')
    } catch {
      toast('Could not copy to clipboard.')
    }
  }

  // Export conversation as Markdown (.md)
  const handleExportMarkdown = () => {
    if (!messages.length) {
      toast('No messages in this conversation to export.')
      return
    }
    const lines = [
      `# TrustLens AI – Verification Transcript`,
      ``,
      `**Title:** ${activeTitle}`,
      `**Conversation ID:** \`${conversationId}\``,
      `**Exported At:** ${new Date().toLocaleString()}`,
      `**Total Messages:** ${messages.length}`,
      ``,
      `---`,
      ``
    ]

    messages.forEach((m, idx) => {
      if (m.role === 'user') {
        lines.push(`### 👤 User (${m.timestamp || `Step ${idx + 1}`})`)
        lines.push(``)
        lines.push(m.content)
        if (m.attachments?.length) {
          lines.push(``)
          lines.push(`*Attached files: ${m.attachments.map(a => a.name).join(', ')}*`)
        }
        lines.push(``)
      } else {
        lines.push(`### 🛡️ TrustLens AI (${m.timestamp || `Step ${idx + 1}`})`)
        lines.push(``)
        lines.push(`**Confidence:** ${m.lvl || 'High'} (${m.pct ?? 86}%) · **Status:** ${m.verificationStatus || 'Verified'}`)
        lines.push(``)
        lines.push(m.plainAnswer || (m.answerHtml ? m.answerHtml.replace(/<[^>]+>/g, '') : m.content))
        lines.push(``)
        if (m.claims?.length) {
          lines.push(`#### Key Claims Assessed:`)
          m.claims.forEach(cl => lines.push(`- ${cl.text || cl}`))
          lines.push(``)
        }
        if (m.sources?.length) {
          lines.push(`#### Authoritative Sources:`)
          m.sources.forEach(s => lines.push(`- **${s.title || s.src}** (${s.publisher || s.sec || 'Official'}): ${s.url || 'Official brochure'}`))
          lines.push(``)
        }
      }
      lines.push(`---`)
      lines.push(``)
    })

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trustlens-verification-${conversationId.slice(0, 8)}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast('Conversation exported as Markdown (.md)!')
  }

  // Clear messages in current conversation view
  const handleClearConversation = () => {
    if (window.confirm('Clear all messages in this conversation view?')) {
      setMessages([])
      setActiveMessageId(null)
      toast('Conversation messages cleared.')
    }
  }

  // Copy plain text transcript to clipboard
  const handleCopyTranscript = async () => {
    if (!messages.length) {
      toast('No messages to copy.')
      return
    }
    const text = messages.map(m => {
      const sender = m.role === 'user' ? 'USER' : `TRUSTLENS AI (${m.lvl || 'High'} Confidence - ${m.pct ?? 86}%)`
      const body = m.plainAnswer || (m.answerHtml ? m.answerHtml.replace(/<[^>]+>/g, '') : m.content)
      return `[${sender}]\n${body}`
    }).join('\n\n---\n\n')

    try {
      await navigator.clipboard.writeText(text)
      toast('Transcript copied to clipboard!')
    } catch {
      toast('Could not copy transcript.')
    }
  }

  // Save conversation bookmark
  const handleSaveConversation = async () => {
    const lastAsst = [...messages].reverse().find(m => m.role === 'assistant')
    if (lastAsst) {
      await toggleSave(lastAsst)
    } else {
      toast('Conversation saved.')
    }
  }

  const handleReportIssue = async ({ kind, details, messageId }) => {
    if (online) {
      try {
        await api.report({ topicKey: messageId || cur, kind, details })
        setUnread(u => u + 1)
        toast('Thanks, your report was sent for review.')
      } catch (err) {
        toast(err.message || 'Could not send report.')
      }
    } else {
      toast('Thanks, your report was noted.')
    }
  }

  const handleSendFeedback = async e => {
    if (e && e.preventDefault) e.preventDefault()
    const msg = feedbackMessage.trim() || fb.trim()
    if (!msg) {
      toast('Please write your feedback details first.')
      return
    }
    if (online) {
      try {
        await api.feedback({ category: feedbackCategory, rating: feedbackRating, message: msg })
      } catch (err) {
        toast(err.message || 'Could not send feedback.')
        return
      }
    }
    setFeedbackMessage('')
    setFb('')
    toast('Thanks! Your feedback was successfully submitted.')
  }

  const toggleCheck = async (item, done) => {
    setChecks(cs => cs.map(x => (x.id === item.id ? { ...x, done } : x)))
    if (!online) return
    try {
      await api.setCheck(item.id, done)
    } catch {
      setChecks(cs => cs.map(x => (x.id === item.id ? { ...x, done: !done } : x)))
      toast('Could not save progress.')
    }
  }

  const [profileOpen, setProfileOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [notifs, setNotifs] = useState([])

  const openBell = async () => {
    if (bellOpen) {
      setBellOpen(false)
      return
    }
    setProfileOpen(false)
    if (!online) {
      setNotifs([{ id: 1, title: 'Welcome to TrustLens', body: 'Save answers, explore evidence, and verify claims.' }])
      setBellOpen(true)
      return
    }
    try {
      const n = await api.notifications()
      setNotifs(n.notifications || [])
      setBellOpen(true)
      if (n.unread) {
        await api.readNotifications()
        setUnread(0)
      }
    } catch {
      toast('Could not load notifications.')
    }
  }

  const openProfile = () => {
    setBellOpen(false)
    setProfileOpen(!profileOpen)
  }

  const handleSignOut = async () => {
    api.logout()
    setProfileOpen(false)
    toast('Signed out.')
    try {
      const u = await api.guest()
      setUser(u)
      const [s, cl, n, convs] = await Promise.all([
        api.saved(),
        api.checklist(),
        api.notifications(),
        api.conversations().catch(() => ({ conversations: [] }))
      ])
      setSaved(s.keys || [])
      setSavedItems(s.items || [])
      setChecks(cl.items || [])
      setUnread(n.unread || 0)
      setConversationsList(convs.conversations || [])
    } catch {}
    navigate('landing')
  }

  const handleUpdateName = async () => {
    if (!user) return
    const newName = window.prompt('Update your display name:', user.name)
    if (newName && newName.trim() && newName.trim() !== user.name) {
      try {
        const r = await api.rename(newName.trim())
        setUser(r.user)
        setProfileOpen(false)
        toast('Name updated.')
      } catch (err) {
        toast(err.message || 'Could not update name.')
      }
    }
  }

  const openTopicFromLanding = key => {
    if (key && C[key]) {
      handleAskQuestion(C[key].q)
    } else {
      handleNewChat()
    }
    navigate('app')
  }

  const a11yProps = {
    theme: themePreference,
    themePreference,
    setTheme: setThemePreference,
    setThemePreference,
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
    onToggleRead: toggleReadAloud,
    a11yOpen,
    setA11yOpen
  }

  // Active calibration data for the right Evidence panel
  const activeAssistantMessage =
    messages.find(m => m.id === activeMessageId && m.role === 'assistant') ||
    [...messages].reverse().find(m => m.role === 'assistant' && !m.pending && !m.error)

  const activeEvidenceData = activeAssistantMessage ? {
    ...(activeAssistantMessage.ui || {}),
    claims: activeAssistantMessage.claims || activeAssistantMessage.ui?.claims || [],
    sources: activeAssistantMessage.sources || activeAssistantMessage.ui?.sources || [],
    uncertainties: activeAssistantMessage.uncertainties || [],
    conflicts: activeAssistantMessage.conflicts || [],
    verificationStatus: activeAssistantMessage.verificationStatus || activeAssistantMessage.ui?.verificationStatus,
    lvl: activeAssistantMessage.lvl || activeAssistantMessage.ui?.lvl,
    pct: activeAssistantMessage.pct ?? activeAssistantMessage.ui?.pct,
    hasScore: activeAssistantMessage.hasScore ?? activeAssistantMessage.ui?.hasScore,
    ex: activeAssistantMessage.ex || activeAssistantMessage.ui?.ex,
    why: activeAssistantMessage.why || activeAssistantMessage.ui?.why || [],
    by: activeAssistantMessage.by || activeAssistantMessage.ui?.by || '',
    breakdown: activeAssistantMessage.breakdown || activeAssistantMessage.confidence?.breakdown || activeAssistantMessage.ui?.breakdown || null,
    pillars: activeAssistantMessage.pillars || activeAssistantMessage.confidence?.pillars || activeAssistantMessage.ui?.pillars || [],
    epistemicStatus: activeAssistantMessage.epistemicStatus || activeAssistantMessage.confidence?.epistemicStatus || activeAssistantMessage.ui?.epistemicStatus,
    epistemicCeilingApplied: activeAssistantMessage.epistemicCeilingApplied ?? activeAssistantMessage.confidence?.epistemicCeilingApplied ?? activeAssistantMessage.ui?.epistemicCeilingApplied,
    humanVerification: activeAssistantMessage.humanVerification || activeAssistantMessage.ui?.humanVerification,
    verificationUuid: activeAssistantMessage.verificationUuid || activeAssistantMessage.ui?.verificationUuid,
    verificationTimestamp: activeAssistantMessage.verificationTimestamp || activeAssistantMessage.ui?.verificationTimestamp,
    plainAnswer: activeAssistantMessage.plainAnswer || activeAssistantMessage.ui?.plainAnswer || activeAssistantMessage.content,
    answerHtml: activeAssistantMessage.answerHtml || activeAssistantMessage.ui?.a
  } : null

  // Full Page Routes (Landing, Sign In, Register)
  if (page === 'landing') {
    return (
      <>
        <Sprite />
        <LandingPage onNavigate={navigate} onOpenTopic={openTopicFromLanding} a11yProps={a11yProps} />
        {toastOn && toastText && toastText.trim() && <div className="toast on" role="status">{toastText}</div>}
      </>
    )
  }

  if (page === 'signin') {
    return (
      <>
        <Sprite />
        <SignInPage onNavigate={navigate} onLoginSuccess={handleAuthSuccess} a11yProps={a11yProps} />
        {toastOn && toastText && toastText.trim() && <div className="toast on" role="status">{toastText}</div>}
      </>
    )
  }

  if (page === 'register') {
    return (
      <>
        <Sprite />
        <CreateAccountPage onNavigate={navigate} onLoginSuccess={handleAuthSuccess} a11yProps={a11yProps} />
        {toastOn && toastText && toastText.trim() && <div className="toast on" role="status">{toastText}</div>}
      </>
    )
  }

  if (status === 'loading') return <div className="toast on" role="status">Loading TrustLens…</div>

  const activeConv = conversationsList.find(c => c.id === conversationId)
  const firstUserMsg = messages.find(m => m.role === 'user')?.content
  const activeTitle = activeConv?.title || (firstUserMsg ? (firstUserMsg.trim().length > 55 ? (firstUserMsg.trim().slice(0, 55).lastIndexOf(' ') > 20 ? firstUserMsg.trim().slice(0, firstUserMsg.trim().slice(0, 55).lastIndexOf(' ')) : firstUserMsg.trim().slice(0, 52)) + '…' : firstUserMsg.trim()) : 'New Chat')
  const activeUpdatedAt = activeConv?.updated_at || activeConv?.updatedAt || activeConv?.createdAt || new Date().toISOString()
  const userInitial = (user?.name || 'Karunya').charAt(0).toUpperCase()

  return (
    <>
      <Sprite />
      {mobileNavOpen && (
        <div
          className="mobile-side-backdrop"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className="app-three-col">
        {/* COLUMN 1: LEFT SIDEBAR */}
        <Sidebar
          user={user}
          view={view}
          onGoView={goView}
          onNewChat={handleNewChat}
          conversations={conversationsList}
          activeConversationId={conversationId}
          isAnalysing={isAnalysing}
          onSelectConversation={loadConversation}
          onRenameConversation={handleRenameConversation}
          onDeleteConversation={handleDeleteConversation}
          onOpenSettings={() => setSettingsModalOpen(true)}
          onOpenProfile={() => setProfileModalOpen(true)}
          onNavigateLanding={() => navigate('landing')}
          mobileNavOpen={mobileNavOpen}
          onCloseMobileNav={() => setMobileNavOpen(false)}
        />

        {/* COLUMN 2: CENTRAL WORKSPACE */}
        <main className="workspace-central">
          <ConversationHeader
            conversationTitle={activeTitle}
            updatedAt={activeUpdatedAt}
            isNewChat={messages.length === 0}
            isAnalysing={isAnalysing}
            view={view}
            onRename={handleRenameActiveConversation}
            onShare={handleShareConversation}
            onSave={handleSaveConversation}
            onDelete={() => handleDeleteConversation({ stopPropagation: () => {} }, conversationId)}
            onExportMarkdown={handleExportMarkdown}
            onClearConversation={handleClearConversation}
            onCopyTranscript={handleCopyTranscript}
            user={user}
            onNavigateAuth={navigate}
            a11yOpen={a11yOpen}
            onToggleA11y={() => setA11yOpen(!a11yOpen)}
            onToggleMobileNav={() => setMobileNavOpen(prev => !prev)}
          />

          {/* Central Scroll Area */}
          <div
            className="workspace-scroll-area"
            ref={chatContainerRef}
            onScroll={handleScroll}
            aria-label="Conversation message stream"
          >
            {/* 1. HOME VIEW */}
            {view === 'home' && (
              <>
                {messages.length === 0 ? (
                  <WelcomeChat />
                ) : (
                  <div className="chat-messages-container">
                    {messages.map(msg => {
                      if (msg.role === 'user') {
                        return <UserMessage key={msg.id} message={msg} userInitial={userInitial} />
                      }
                      return (
                        <AssistantMessage
                          key={msg.id}
                          message={msg}
                          isSelected={activeMessageId === msg.id}
                          onSelect={handleSelectMessage}
                          onClaimClick={handleClaimClick}
                          onCopy={copyAnswer}
                          onSave={toggleSave}
                          isSaved={saved.includes(msg.id)}
                          onShare={(text) => {
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(text)
                              toast('Shareable answer copied to clipboard!')
                            }
                          }}
                          onExplain={() => handleAskQuestion('Please explain this answer in simpler, more accessible terms with everyday examples.')}
                          onVerify={() => handleSelectMessage(msg.id)}
                          onReport={handleReportIssue}
                          onRetry={handleRetry}
                          onNotify={toast}
                        />
                      )
                    })}
                  </div>
                )}
                <div ref={messagesEndRef} style={{ height: 1 }} />
              </>
            )}

            {/* 2. EXPLORE VIEW */}
            {view === 'explore' && (
              <section className="view" style={{ maxWidth: 860, margin: '0 auto', width: '100%' }}>
                <div className="subview-back-bar">
                  <button type="button" className="subview-back-btn" onClick={() => setView('home')}>
                    <Ic n="arrow-left" />
                    <span>Back to Verification Chat</span>
                  </button>
                </div>
                <div className="card raise">
                  <h2 className="hd" style={{ marginBottom: 14 }}>
                    {q ? `Results for “${q}”` : 'Explore Verification Topics'}
                  </h2>
                  <div className="list">
                    {results.length ? (
                      results.map(k => (
                        <button
                          className="inset"
                          key={k}
                          onClick={() => {
                            handleAskQuestion(C[k].q)
                          }}
                        >
                          <b>{C[k].q}</b>
                          <br />
                          <small>{C[k].n} · {C[k].lvl} confidence</small>
                        </button>
                      ))
                    ) : (
                      <p className="empty">No matching sample topics found.</p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* 3. SAVED & CONVERSATION HISTORY VIEW */}
            {view === 'saved' && (
              <section className="view" style={{ maxWidth: 860, margin: '0 auto', width: '100%' }}>
                <div className="subview-back-bar">
                  <button type="button" className="subview-back-btn" onClick={() => setView('home')}>
                    <Ic n="arrow-left" />
                    <span>Back to Verification Chat</span>
                  </button>
                </div>
                <div className="card raise">
                  <div className="seg inset" style={{ marginBottom: 16 }}>
                    <button
                      role="tab"
                      aria-selected={savedTab === 'saved'}
                      onClick={() => setSavedTab('saved')}
                    >
                      Saved Answers ({savedItems.length || saved.length})
                    </button>
                    <button
                      role="tab"
                      aria-selected={savedTab === 'history'}
                      onClick={() => setSavedTab('history')}
                    >
                      Conversation History ({conversationsList.length})
                    </button>
                  </div>

                  {savedTab === 'saved' ? (
                    <div className="list">
                      {savedItems.length > 0 ? (
                        savedItems.map(item => (
                          <div key={item.id} className="conv-card-item inset" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flex: 1, marginRight: 12 }}>
                              <b style={{ color: 'var(--text-primary)', fontSize: 14.5 }}>{item.title || item.itemKey}</b>
                              <p style={{ color: 'var(--text-secondary)', fontSize: 12.5, margin: '4px 0 0 0', maxHeight: 42, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.content ? item.content.slice(0, 120) + '…' : 'Saved answer excerpt'}
                              </p>
                              <small style={{ color: 'var(--teal)', fontSize: 11.5, fontWeight: 600, display: 'block', marginTop: 4 }}>
                                {item.metadata?.level || 'Verified'} Confidence ({item.metadata?.score ?? 86}%) · {item.metadata?.sourcesCount || 1} Sources
                              </small>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <button
                                type="button"
                                className="pill sm"
                                onClick={() => {
                                  if (item.content) {
                                    setFollow(`Regarding saved answer "${item.title}": `)
                                    setView('home')
                                  } else {
                                    handleAskQuestion(item.title)
                                  }
                                }}
                              >
                                Open in Chat ↗
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleSave({ id: item.itemKey })}
                                title="Remove from saved"
                                style={{ color: '#E53935', padding: '6px 8px', fontSize: 14, cursor: 'pointer' }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))
                      ) : saved.length ? (
                        saved.map(k => {
                          const item = C[k] || { q: 'Saved Answer', n: 'Custom Saved', lvl: 'Saved' }
                          return (
                            <div key={k} className="conv-card-item inset" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <b style={{ color: 'var(--text-primary)', fontSize: 14.5 }}>{item.q}</b>
                                <br />
                                <small style={{ color: 'var(--teal)', fontSize: 12 }}>{item.lvl} confidence · bookmarked</small>
                              </div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <button type="button" className="pill sm" onClick={() => handleAskQuestion(item.q)}>
                                  Open in Chat ↗
                                </button>
                                <button type="button" onClick={() => toggleSave({ id: k })} title="Remove" style={{ color: '#E53935', padding: '4px 8px' }}>
                                  ✕
                                </button>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <p className="empty">Nothing saved yet. Click Save on any answer in the chat to bookmark it here.</p>
                      )}
                    </div>
                  ) : (
                    <div className="list">
                      {conversationsList.length ? (
                        conversationsList.map(conv => (
                          <div
                            key={conv.id}
                            className="conv-card-item inset"
                            onClick={() => loadConversation(conv.id)}
                          >
                            <div>
                              <b style={{ color: 'var(--text-primary)', fontSize: 14.5 }}>{conv.title || 'Conversation'}</b>
                              <br />
                              <small style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                                {conv.updated_at ? new Date(conv.updated_at).toLocaleDateString() : 'Recent'} · ID: {conv.id.slice(0, 8)}…
                              </small>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span className="pill sm">Open Chat ↗</span>
                              <button
                                type="button"
                                onClick={e => handleDeleteConversation(e, conv.id)}
                                title="Delete conversation"
                                style={{ color: '#f87171', padding: '4px 8px', fontSize: 13 }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="empty">No previous conversations yet. Ask questions in chat to build history.</p>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 4. VERIFICATION HUB VIEW */}
            {view === 'hub' && (
              <section className="view" style={{ maxWidth: 860, margin: '0 auto', width: '100%' }}>
                <div className="subview-back-bar">
                  <button type="button" className="subview-back-btn" onClick={() => setView('home')}>
                    <Ic n="arrow-left" />
                    <span>Back to Verification Chat</span>
                  </button>
                </div>
                <div className="card raise">
                  <h2 className="hd" style={{ marginBottom: 6 }}>Verification Hub</h2>
                  <p className="empty">Follow this checklist before acting on any high-stakes answer.</p>
                  <div className="list">
                    {checks.map(i => (
                      <div className="inset" style={{ padding: '14px 16px' }} key={i.id}>
                        <label style={{ display: 'flex', gap: 10, cursor: 'pointer', color: 'var(--text-primary)' }}>
                          <input
                            type="checkbox"
                            checked={i.done}
                            onChange={e => toggleCheck(i, e.target.checked)}
                          />
                          <span>{i.label}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* 5. FEEDBACK VIEW */}
            {view === 'feedback' && (
              <section className="view" style={{ maxWidth: 860, margin: '0 auto', width: '100%' }}>
                <div className="subview-back-bar">
                  <button type="button" className="subview-back-btn" onClick={() => setView('home')}>
                    <Ic n="arrow-left" />
                    <span>Back to Verification Chat</span>
                  </button>
                </div>
                <div className="card raise">
                  <h2 className="hd" style={{ marginBottom: 10 }}>Feedback & Model Calibration</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, marginBottom: 16, lineHeight: 1.45 }}>
                    Help us improve the TrustLens accuracy engine. Report calibration discrepancies, missing citations, or propose feature improvements.
                  </p>
                  <form onSubmit={handleSendFeedback} style={{ display: 'grid', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
                        Feedback Category
                      </label>
                      <select
                        value={feedbackCategory}
                        onChange={e => setFeedbackCategory(e.target.value)}
                        className="inset"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                      >
                        <option value="Confidence Calibration">Confidence Score Calibration</option>
                        <option value="Evidence Extraction">Evidence & Excerpt Extraction</option>
                        <option value="Source Citations">Official Source Citations</option>
                        <option value="User Interface">User Experience & Controls</option>
                        <option value="Feature Request">Feature Request</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
                        Rating (1 to 5 Stars)
                      </label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setFeedbackRating(star)}
                            style={{
                              fontSize: 22,
                              cursor: 'pointer',
                              color: star <= feedbackRating ? 'var(--warn-amber, #F5B86B)' : 'var(--border-color)',
                              background: 'none',
                              border: 'none',
                              padding: '2px 4px'
                            }}
                            title={`${star} Star${star > 1 ? 's' : ''}`}
                          >
                            ★
                          </button>
                        ))}
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', alignSelf: 'center', marginLeft: 8 }}>
                          {feedbackRating} of 5 Stars
                        </span>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
                        Detailed Comments
                      </label>
                      <textarea
                        rows={4}
                        value={feedbackMessage}
                        onChange={e => setFeedbackMessage(e.target.value)}
                        placeholder="Tell us what you liked or what needs improvement…"
                        className="inset"
                        required
                        style={{
                          width: '100%',
                          padding: 14,
                          borderRadius: 12,
                          border: '1px solid var(--border-color)',
                          background: 'var(--card-bg)',
                          color: 'var(--text-primary)',
                          font: 'inherit'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                      <button type="submit" className="btn btn-teal">
                        Submit Feedback
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setFeedbackMessage('')
                          setFeedbackCategory('Confidence Calibration')
                          setFeedbackRating(5)
                        }}
                      >
                        Clear Form
                      </button>
                    </div>
                  </form>
                </div>
              </section>
            )}
          </div>

          {/* Composer docked at bottom (only on Home) */}
          {view === 'home' && (
            <ChatComposer
              follow={follow}
              isAnalysing={isAnalysing}
              textareaRef={textareaRef}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              onSubmit={submitFollow}
              showScrollBottom={messages.length > 0 && showScrollBottom}
              onScrollToBottom={() => {
                isUserScrolledUp.current = false
                scrollToBottom(true)
              }}
              onVoiceInput={handleVoiceInput}
              onNotify={toast}
              attachments={attachments}
              onAddAttachments={handleAddAttachments}
              onRemoveAttachment={handleRemoveAttachment}
            />
          )}
        </main>

        {/* COLUMN 3: RIGHT EVIDENCE PANEL */}
        <Evidence
          view={view}
          activeData={activeEvidenceData}
          selectedClaimIndex={selectedClaimIndex}
          setSelectedClaimIndex={setSelectedClaimIndex}
          checks={checks}
          savedCount={savedItems.length || saved.length}
          conversationsCount={conversationsList.length}
          onNewChat={handleNewChat}
          onNotify={toast}
        />
      </div>

      {/* Profile Modal */}
      {profileModalOpen && (
        <div className="modal-backdrop" onClick={() => setProfileModalOpen(false)}>
          <div className="modal-content raise" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="user-avatar-chip large">
                  <span>{userInitial}</span>
                </div>
                <div>
                  <h3 className="modal-title">{user?.name || (user?.isGuest ? 'Guest User' : 'Verified User')}</h3>
                  <span className="modal-sub">{user?.isGuest ? 'Guest Session (Local Storage)' : (user?.email || 'Registered Account')}</span>
                </div>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setProfileModalOpen(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="profile-stats-grid">
                <div className="profile-stat-card inset">
                  <b className="stat-number">{conversationsList.length}</b>
                  <span className="stat-label">Conversations</span>
                </div>
                <div className="profile-stat-card inset">
                  <b className="stat-number">{savedItems.length || saved.length}</b>
                  <span className="stat-label">Saved Answers</span>
                </div>
                <div className="profile-stat-card inset">
                  <b className="stat-number">{checks.filter(c => c.done).length}/{checks.length}</b>
                  <span className="stat-label">Safety Checks</span>
                </div>
              </div>

              <div className="profile-details-card inset" style={{ marginTop: 14 }}>
                <div className="profile-row">
                  <span className="p-key">Account Status:</span>
                  <span className="p-val badge-teal">{user?.isGuest ? 'Guest Access' : 'Active Pro'}</span>
                </div>
                <div className="profile-row">
                  <span className="p-key">Verification Engine:</span>
                  <span className="p-val">Gemini 2.5 Flash + Grounding</span>
                </div>
                <div className="profile-row">
                  <span className="p-key">User ID:</span>
                  <span className="p-val">{user?.id ? `USR-${user.id}` : 'Guest'}</span>
                </div>
              </div>

              <div className="profile-actions-row" style={{ marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={handleUpdateName}>
                  <Ic n="edit" /> Edit Name
                </button>
                {user && !user.isGuest ? (
                  <button type="button" className="btn btn-danger" onClick={handleSignOut}>
                    Sign Out
                  </button>
                ) : (
                  <button type="button" className="btn btn-teal" onClick={() => { setProfileModalOpen(false); navigate('signin'); }}>
                    Sign In to Sync
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsModalOpen && (
        <div className="modal-backdrop" onClick={() => setSettingsModalOpen(false)}>
          <div className="modal-content raise" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Settings & Data Preferences</h3>
              <button type="button" className="modal-close-btn" onClick={() => setSettingsModalOpen(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="settings-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <b className="settings-section-title">Display Theme</b>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
                    Active: {themePreference === 'system' ? 'System Mode (Teal Blue)' : (themePreference === 'dark' ? 'Dark Mode (Black)' : 'Light Mode')}
                  </span>
                </div>
                <div className="settings-theme-options">
                  <button
                    type="button"
                    className={`theme-pick-btn ${themePreference === 'light' ? 'is-active' : ''}`}
                    onClick={() => setThemePreference('light')}
                  >
                    ☀️ Light Mode
                  </button>
                  <button
                    type="button"
                    className={`theme-pick-btn ${themePreference === 'dark' ? 'is-active' : ''}`}
                    onClick={() => setThemePreference('dark')}
                  >
                    🌙 Dark Mode (Black)
                  </button>
                  <button
                    type="button"
                    className={`theme-pick-btn ${themePreference === 'system' ? 'is-active' : ''}`}
                    onClick={() => setThemePreference('system')}
                  >
                    💻 System (Teal Blue)
                  </button>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.4 }}>
                  {themePreference === 'system'
                    ? 'System mode features TrustLens signature deep Teal Blue background and surfaces.'
                    : (themePreference === 'dark' ? 'TrustLens Dark Mode active with pure black background.' : 'TrustLens Light Mode active.')}
                </p>
              </div>

              <div className="settings-section" style={{ marginTop: 18 }}>
                <b className="settings-section-title">Data & Storage Management</b>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  Manage your offline cache, local conversation transcripts, and verification bookmarks.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
                        conversations: conversationsList,
                        saved,
                        timestamp: new Date().toISOString()
                      }, null, 2))
                      const dlAnchor = document.createElement('a')
                      dlAnchor.setAttribute("href", dataStr)
                      dlAnchor.setAttribute("download", `trustlens-backup-${Date.now()}.json`)
                      dlAnchor.click()
                      toast('All data exported as JSON!')
                    }}
                  >
                    <Ic n="arrow-down" /> Export All History (JSON)
                  </button>

                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to delete ALL conversation history? This cannot be undone.')) {
                        for (const conv of conversationsList) {
                          try { await api.deleteConversation(conv.id) } catch {}
                        }
                        setConversationsList([])
                        handleNewChat()
                        setSettingsModalOpen(false)
                        toast('All conversation history cleared.')
                      }
                    }}
                  >
                    <Ic n="trash" /> Clear All Chat History
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accessibility Flyout Modal */}
      {a11yOpen && (
        <AccessibilityPanel
          onClose={() => setA11yOpen(false)}
          theme={theme}
          setTheme={setTheme}
          resolvedTheme={resolvedTheme}
          colorBlind={colorBlind}
          setColorBlind={setColorBlind}
          largeText={largeText}
          setLargeText={setLargeText}
          dyslexicFont={dyslexicFont}
          setDyslexicFont={setDyslexicFont}
          calmMotion={calmMotion}
          setCalmMotion={setCalmMotion}
          focusMode={focusMode}
          setFocusMode={setFocusMode}
          isReading={isReading}
          onToggleRead={toggleReadAloud}
        />
      )}

      {toastOn && toastText && toastText.trim() && <div className="toast on" role="status">{toastText}</div>}
    </>
  )
}

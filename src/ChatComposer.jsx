import React, { useState, useRef, useEffect, useCallback } from 'react'
import Ic from './Ic.jsx'

export default function ChatComposer({
  follow,
  isAnalysing,
  textareaRef,
  onChange,
  onKeyDown,
  onSubmit,
  showScrollBottom,
  onScrollToBottom,
  onVoiceInput,
  onNotify,
  attachments = [],
  onAddAttachments,
  onRemoveAttachment,
  suggestedFollowUps = [],
  onSelectSuggestion
}) {
  const [voiceState, setVoiceState] = useState('idle') // 'idle' | 'listening' | 'transcribing'
  const recognitionRef = useRef(null)
  const baseTextRef = useRef('')
  const isManuallyStoppedRef = useRef(false)
  const fileInputRef = useRef(null)

  const formatSize = bytes => {
    if (!bytes || bytes < 1024) return `${bytes || 0} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleFileSelect = e => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const allowedExts = ['pdf', 'docx', 'doc', 'txt', 'png', 'jpg', 'jpeg']
    const maxBytes = 10 * 1024 * 1024 // 10MB
    const valid = []

    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase()
      if (!allowedExts.includes(ext)) {
        if (onNotify) onNotify(`Unsupported file type ".${ext}". Supported: PDF, DOCX, DOC, TXT, PNG, JPG, JPEG.`)
        continue
      }
      if (file.size > maxBytes) {
        if (onNotify) onNotify(`File "${file.name}" exceeds the 10 MB size limit.`)
        continue
      }
      if (attachments.some(a => a.name === file.name && a.size === file.size)) {
        if (onNotify) onNotify(`"${file.name}" is already attached.`)
        continue
      }
      valid.push(file)
    }

    if (valid.length && onAddAttachments) {
      onAddAttachments(valid)
    }
    // Reset file input so user can pick the same file again if they remove and re-add
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Cleanup SpeechRecognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {}
        recognitionRef.current = null
      }
    }
  }, [])

  const stopListening = useCallback(() => {
    isManuallyStoppedRef.current = true
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
    }
    setVoiceState('idle')
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [textareaRef])

  const startListening = useCallback(() => {
    const SpeechRecognition = typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null

    if (!SpeechRecognition) {
      if (onNotify) {
        onNotify('Voice speech recognition is not supported in this browser. Please type your question.')
      }
      return
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch {}
      recognitionRef.current = null
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      // Keep whatever text is already in the composer to prevent overwriting or duplicating words
      const existing = (follow || '').trim()
      baseTextRef.current = existing ? existing + ' ' : ''
      isManuallyStoppedRef.current = false

      recognition.onstart = () => {
        setVoiceState('listening')
        if (onNotify) onNotify('Listening... Speak your question.')
      }

      recognition.onresult = event => {
        setVoiceState('listening')
        let finalSegment = ''
        let interimSegment = ''

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i]
          if (res.isFinal) {
            finalSegment += res[0].transcript
          } else {
            interimSegment += res[0].transcript
          }
        }

        const combinedSpoken = (finalSegment + ' ' + interimSegment).trim()
        const fullNewText = (baseTextRef.current + combinedSpoken).trim()

        if (fullNewText && onVoiceInput) {
          onVoiceInput(fullNewText)
        }
      }

      recognition.onerror = event => {
        console.warn('SpeechRecognition error:', event.error)
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          if (onNotify) onNotify('Microphone access was denied. Please allow microphone permissions in your browser.')
        } else if (event.error === 'no-speech') {
          // Normal silence, don't interrupt
          return
        } else if (event.error === 'audio-capture') {
          if (onNotify) onNotify('No microphone detected on your device. You can type your question.')
        } else if (event.error !== 'aborted') {
          if (onNotify) onNotify(`Voice input notice: ${event.error}. You can continue typing.`)
        }
        setVoiceState('idle')
      }

      recognition.onend = () => {
        setVoiceState('idle')
        if (textareaRef.current) {
          textareaRef.current.focus()
        }
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (err) {
      console.error('Failed to initialize SpeechRecognition:', err)
      if (onNotify) onNotify('Could not activate microphone. Please check your browser audio settings.')
      setVoiceState('idle')
    }
  }, [follow, onNotify, onVoiceInput, textareaRef])

  const toggleVoiceInput = () => {
    if (isAnalysing) return
    if (voiceState === 'listening') {
      stopListening()
      if (onNotify) onNotify('Voice input stopped. Review or edit your question before sending.')
    } else {
      startListening()
    }
  }

  const handleFormSubmit = e => {
    if (voiceState === 'listening') {
      stopListening()
    }
    onSubmit(e)
  }

  return (
    <div className="chat-composer-sticky">
      {showScrollBottom && (
        <button
          type="button"
          className="jump-to-latest-btn"
          onClick={onScrollToBottom}
          aria-label="Jump to latest message"
        >
          <Ic n="arrow-down" /> Jump to latest
        </button>
      )}

      {/* Visual Status Banner when listening */}
      {voiceState === 'listening' && (
        <div className="voice-listening-status" role="status" aria-live="polite">
          <span className="voice-pulse-dot" />
          <span>Listening... Speak your question</span>
          <button
            type="button"
            className="voice-stop-text-btn"
            onClick={stopListening}
            title="Finish speaking and review text"
          >
            Done
          </button>
        </div>
      )}

      {/* Hidden file input supporting PDF, DOCX, DOC, TXT, PNG, JPG, JPEG */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg,text/plain"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Attachments preview tray above input */}
      {attachments && attachments.length > 0 && (
        <div className="composer-attachments-tray" aria-label="Attached files">
          {attachments.map(att => (
            <div key={att.id} className="composer-att-chip">
              <span className="composer-att-icon">
                {att.type?.startsWith('image/') ? '🖼️' : att.name?.endsWith('.pdf') ? '📄' : '📝'}
              </span>
              <div className="composer-att-info">
                <span className="composer-att-name" title={att.name}>{att.name}</span>
                <span className="composer-att-size">{formatSize(att.size)}</span>
              </div>
              <button
                type="button"
                className="composer-att-remove"
                onClick={() => onRemoveAttachment(att.id)}
                title={`Remove ${att.name}`}
                aria-label={`Remove ${att.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <form className="composer-capsule raise" onSubmit={handleFormSubmit}>
        {/* Paperclip attachment icon */}
        <button
          type="button"
          className="composer-clip-btn"
          title="Attach file or reference (PDF, DOCX, TXT, PNG, JPG)"
          aria-label="Attachments"
          onClick={() => fileInputRef.current?.click()}
        >
          <Ic n="paperclip" />
        </button>

        {/* Multiline auto-expanding textarea */}
        <textarea
          ref={textareaRef}
          rows={1}
          className="composer-textarea chat-multiline-input"
          placeholder={
            isAnalysing
              ? 'TrustLens is analysing your question…'
              : voiceState === 'listening'
              ? 'Listening to speech…'
              : 'Message TrustLens AI...'
          }
          aria-label="Message TrustLens AI"
          disabled={isAnalysing}
          value={follow}
          onChange={onChange}
          onKeyDown={onKeyDown}
        />

        {/* Right tools: Microphone & Send Button */}
        <div className="composer-right-tools">
          <button
            type="button"
            className={`composer-tool-btn ${voiceState === 'listening' ? 'is-listening' : ''}`}
            onClick={toggleVoiceInput}
            title={
              voiceState === 'listening'
                ? 'Stop recording (click when done speaking)'
                : 'Speak your question'
            }
            aria-label={voiceState === 'listening' ? 'Stop recording' : 'Speak your question'}
          >
            <Ic n={voiceState === 'listening' ? 'square' : 'mic'} />
          </button>

          <button
            type="submit"
            className="composer-send-btn"
            aria-label="Send question"
            disabled={isAnalysing || (!follow.trim() && (!attachments || attachments.length === 0))}
            title={
              follow.trim() || (attachments && attachments.length > 0)
                ? 'Send question (Enter)'
                : 'Type a question or attach a file to send'
            }
          >
            <Ic n="send" />
          </button>
        </div>
      </form>

      {/* Suggested Follow-up Questions Tray */}
      {Array.isArray(suggestedFollowUps) && suggestedFollowUps.length > 0 && !isAnalysing && (
        <div className="composer-suggested-tray">
          <span className="composer-suggested-label">
            <Ic n="spark" />
            <span>Suggested:</span>
          </span>
          <div className="composer-suggested-chips">
            {suggestedFollowUps.slice(0, 3).map((sug, idx) => (
              <button
                key={idx}
                type="button"
                className="composer-suggested-chip"
                onClick={() => onSelectSuggestion && onSelectSuggestion(sug)}
                title={sug}
              >
                <span>{sug}</span>
                <span className="sug-arrow">→</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

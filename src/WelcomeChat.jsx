import React from 'react'
import Ic from './Ic.jsx'

export default function WelcomeChat() {
  return (
    <div className="welcome-chat-clean">
      <div className="welcome-center-header">
        <div className="welcome-icon-shield">
          <Ic n="shield" />
        </div>
        <h2 className="welcome-heading">Welcome to TrustLens AI</h2>
        <p className="welcome-subheading">
          Ask any question below to calibrate evidence, extract verified claims, and view authoritative sources.
        </p>
      </div>
    </div>
  )
}

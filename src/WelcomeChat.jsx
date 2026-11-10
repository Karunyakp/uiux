import React from 'react'
import Ic from './Ic.jsx'

export default function WelcomeChat() {
  return (
    <div className="welcome-chat-clean">
      <div className="welcome-center-header">
        <div className="welcome-icon-shield">
          <Ic n="shield" />
        </div>
        <h2 className="welcome-heading">What would you like to know?</h2>
        <p className="welcome-subheading">
          Ask anything. I'll help you understand the answer, check its evidence and assess its reliability.
        </p>
      </div>
    </div>
  )
}

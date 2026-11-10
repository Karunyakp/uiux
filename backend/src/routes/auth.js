import express from 'express'
import { config } from '../config.js'
import { hashPassword, verifyPassword, signToken, requireAuth } from '../lib/auth.js'
import { HttpError, wrap } from '../lib/http.js'
import { email as vEmail, str } from '../lib/validate.js'
import { rateLimit } from '../lib/ratelimit.js'
import { publicUser } from '../services/users.js'

const DAY = 86400
const DUMMY_HASH = 'scrypt$AAAAAAAAAAAAAAAAAAAAAA$' + 'A'.repeat(86)

export function authRoutes({ users, engagement }) {
  const r = express.Router()
  r.use(rateLimit({ windowMs: 60_000, max: 20, name: 'auth' }))

  const session = (u, days) => ({ token: signToken({ sub: u.id, role: u.role }, days * DAY), user: publicUser(u) })

  // Google OAuth Configuration query
  r.get('/google/config', (req, res) => {
    res.json({
      configured: !!config.googleClientId,
      clientId: config.googleClientId
    })
  })

  // Google OAuth verification and sign-in / registration
  r.post('/google', wrap(async (req, res) => {
    let email = null
    let name = 'Google User'
    let googleId = null
    let avatarUrl = null

    const credential = req.body?.credential || req.body?.idToken
    const code = req.body?.code
    const isDevTest = req.body?.devTest && !config.isProd

    if (isDevTest) {
      // Offline/Local Test mode when testing without live Google credentials
      email = vEmail(req.body.email || 'google_user@example.com')
      name = str(req.body.name || 'Google User', 'name', { max: 60 })
      googleId = str(req.body.googleId || `g_${Date.now()}`, 'googleId', { max: 100 })
      avatarUrl = req.body.avatarUrl || null
    } else if (credential) {
      // Verify Google ID token via Google tokeninfo API
      const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
      const verifyRes = await fetch(tokenInfoUrl)
      if (!verifyRes.ok) {
        throw new HttpError(401, 'Google ID token verification failed. Please try signing in again.')
      }
      const tokenData = await verifyRes.json()

      // Validate issuer and audience
      const validIssuers = ['accounts.google.com', 'https://accounts.google.com']
      if (!validIssuers.includes(tokenData.iss)) {
        throw new HttpError(401, 'Invalid Google token issuer.')
      }
      if (config.googleClientId && tokenData.aud !== config.googleClientId) {
        throw new HttpError(401, 'Google token audience mismatch.')
      }
      if (tokenData.email_verified !== 'true' && tokenData.email_verified !== true) {
        throw new HttpError(400, 'Your Google email address is not verified by Google.')
      }

      email = vEmail(tokenData.email)
      name = (tokenData.name || tokenData.given_name || email.split('@')[0] || 'Google User').slice(0, 60)
      googleId = String(tokenData.sub || '')
      avatarUrl = tokenData.picture || null
    } else if (code) {
      // Exchange OAuth2 authorization code with Google token endpoint
      if (!config.googleClientId || !config.googleClientSecret) {
        throw new HttpError(500, 'Google OAuth credentials are not configured on the backend.')
      }
      const tokenExchangeRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: config.googleClientId,
          client_secret: config.googleClientSecret,
          redirect_uri: req.body.redirectUri || config.googleRedirectUri,
          grant_type: 'authorization_code'
        })
      })

      if (!tokenExchangeRes.ok) {
        const errJson = await tokenExchangeRes.json().catch(() => ({}))
        throw new HttpError(401, errJson.error_description || 'Failed to exchange authorization code with Google.')
      }

      const tokenJson = await tokenExchangeRes.json()
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` }
      })

      if (!userinfoRes.ok) {
        throw new HttpError(401, 'Failed to fetch user profile from Google.')
      }

      const profile = await userinfoRes.json()
      email = vEmail(profile.email)
      name = (profile.name || profile.given_name || email.split('@')[0] || 'Google User').slice(0, 60)
      googleId = String(profile.sub || '')
      avatarUrl = profile.picture || null
    } else {
      throw new HttpError(400, 'A valid Google credential token or authorization code is required.')
    }

    if (!email) {
      throw new HttpError(400, 'No email address was returned by Google.')
    }

    // Resolve user in TrustLens database
    let u = googleId ? users.byGoogleId(googleId) : null

    if (!u) {
      u = users.byEmail(email)
      if (u) {
        // Link existing email account to Google ID and profile image
        u = users.linkGoogle(u.id, googleId, avatarUrl)
        engagement.audit(u.id, 'auth.google_link')
      } else if (req.user?.is_guest) {
        // Seamlessly upgrade guest session, preserving all saved answers, history and checklist
        u = users.upgradeGuest(req.user.id, { email, name, googleId, avatarUrl })
        engagement.notify(u.id, 'Google Account Linked', 'Your guest data has been transferred to your Google account.')
        engagement.audit(u.id, 'auth.google_upgrade_guest')
      } else {
        // Create new user profile for first-time Google sign-in
        u = users.create({ email, name, isGuest: 0, googleId, avatarUrl })
        engagement.notify(u.id, 'Welcome to TrustLens', 'Your account was created via Google Sign-In.')
        engagement.audit(u.id, 'auth.google_register')
      }
    } else {
      engagement.audit(u.id, 'auth.google_login')
    }

    res.json(session(u, 30))
  }))

  // Optional: OAuth redirect initiation endpoint
  r.get('/google', (req, res) => {
    if (!config.googleClientId) {
      return res.status(503).send('GOOGLE_CLIENT_ID is not configured in backend/.env.')
    }
    const redirectUri = config.googleRedirectUri || `${req.protocol}://${req.get('host')}/api/auth/google/callback`
    const params = new URLSearchParams({
      client_id: config.googleClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account'
    })
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
  })

  // Optional: OAuth redirect callback endpoint
  r.get('/google/callback', wrap(async (req, res) => {
    const code = req.query.code
    const error = req.query.error

    if (error) {
      return res.redirect(`/#/signin?error=${encodeURIComponent(error)}`)
    }
    if (!code) {
      return res.redirect('/#/signin?error=no_code_provided')
    }

    try {
      const tokenExchangeRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: String(code),
          client_id: config.googleClientId,
          client_secret: config.googleClientSecret,
          redirect_uri: config.googleRedirectUri,
          grant_type: 'authorization_code'
        })
      })

      const tokenJson = await tokenExchangeRes.json()
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` }
      })
      const profile = await userinfoRes.json()
      const email = vEmail(profile.email)
      const name = (profile.name || email.split('@')[0] || 'Google User').slice(0, 60)
      const googleId = String(profile.sub)
      const avatarUrl = profile.picture || null

      let u = users.byGoogleId(googleId) || users.byEmail(email)
      if (!u) {
        u = users.create({ email, name, isGuest: 0, googleId, avatarUrl })
      } else if (!u.google_id) {
        u = users.linkGoogle(u.id, googleId, avatarUrl)
      }

      const sess = session(u, 30)
      // Redirect with session token to app
      res.redirect(`/#/app?token=${encodeURIComponent(sess.token)}&auth=google_success`)
    } catch (err) {
      res.redirect(`/#/signin?error=${encodeURIComponent(err.message || 'Google authentication failed')}`)
    }
  }))

  r.post('/guest', wrap(async (req, res) => {
    const name = str(req.body?.name, 'name', { max: 60, optional: true }) || 'Guest'
    const u = users.create({ name, isGuest: 1 })
    engagement.notify(u.id, 'Welcome to TrustLens', 'Save answers and report issues. Create an account to keep them across devices.')
    res.status(201).json(session(u, 90))
  }))

  r.post('/register', wrap(async (req, res) => {
    const name = str(req.body?.name, 'name', { max: 60 })
    const mail = vEmail(req.body?.email)
    const password = str(req.body?.password, 'password', { min: 8, max: 200 })
    if (users.byEmail(mail)) throw new HttpError(409, 'An account with this email already exists')
    const passwordHash = await hashPassword(password)
    let u
    if (req.user?.is_guest) {
      u = users.upgradeGuest(req.user.id, { email: mail, name, passwordHash })
      engagement.audit(u.id, 'auth.upgrade_guest')
    } else {
      u = users.create({ email: mail, name, passwordHash })
      engagement.notify(u.id, 'Welcome to TrustLens', 'Your account is ready.')
      engagement.audit(u.id, 'auth.register')
    }
    res.status(201).json(session(u, 30))
  }))

  r.post('/login', wrap(async (req, res) => {
    const mail = vEmail(req.body?.email)
    const password = str(req.body?.password, 'password', { max: 200 })
    const u = users.byEmail(mail)
    const ok = await verifyPassword(password, u?.password_hash ?? DUMMY_HASH)
    if (!u || !ok) throw new HttpError(401, 'Invalid email or password')
    engagement.audit(u.id, 'auth.login')
    res.json(session(u, 30))
  }))

  r.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }))

  r.patch('/me', requireAuth, wrap(async (req, res) => {
    const name = str(req.body?.name, 'name', { max: 60 })
    res.json({ user: publicUser(users.rename(req.user.id, name)) })
  }))
  return r
}

import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import { config } from './config.js'
import { authenticate } from './lib/auth.js'
import { errorHandler, notFound } from './lib/http.js'
import { rateLimit } from './lib/ratelimit.js'
import { usersService } from './services/users.js'
import { topicsService } from './services/topics.js'
import { engagementService } from './services/engagement.js'
import { assistantService } from './services/assistant.js'
import { trustlensService } from './services/trustlens.js'
import { conversationsService } from './services/conversations.js'
import { authRoutes } from './routes/auth.js'
import { topicRoutes } from './routes/topics.js'
import { chatRoutes } from './routes/chat.js'
import { meRoutes } from './routes/me.js'
import { adminRoutes } from './routes/admin.js'

export function createApp(db, { staticDir = config.staticDir, corsOrigin = config.corsOrigin } = {}) {
  const users = usersService(db)
  const topics = topicsService(db)
  const engagement = engagementService(db)
  const assistant = assistantService(topics)
  const trustlens = trustlensService()
  const conversations = conversationsService(db)

  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Referrer-Policy', 'no-referrer')
    if (corsOrigin) {
      res.setHeader('Access-Control-Allow-Origin', corsOrigin)
      res.setHeader('Vary', 'Origin')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      if (req.method === 'OPTIONS') return res.status(204).end()
    }
    next()
  })

  const api = express.Router()
  api.use(express.json({ limit: '25mb' }))
  api.use(express.urlencoded({ extended: true, limit: '25mb' }))
  api.use(rateLimit({ windowMs: 60_000, max: 300, name: 'api' }))
  api.use(authenticate(users))

  api.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }))
  api.use('/auth', authRoutes({ users, engagement }))
  api.use(chatRoutes({ trustlens, conversations }))
  api.use(topicRoutes({ topics, engagement, assistant, trustlens }))
  api.use(meRoutes({ engagement, db }))
  api.use(adminRoutes({ topics, engagement }))
  api.use(notFound)
  api.use(errorHandler)
  app.use('/api', api)

  // Serve the built React app (npm run build in the project root) when it exists.
  if (staticDir && fs.existsSync(path.join(staticDir, 'index.html'))) {
    app.use(express.static(staticDir))
    app.get('*', (req, res) => res.sendFile(path.join(staticDir, 'index.html')))
  }
  return app
}

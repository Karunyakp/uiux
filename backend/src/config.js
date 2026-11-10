import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(path.join(root, '.env'))
  }
} catch {
  // .env file is optional if env vars are provided in process environment
}

const isProd = process.env.NODE_ENV === 'production'

let jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) {
  if (isProd) throw new Error('JWT_SECRET must be set when NODE_ENV=production')
  jwtSecret = crypto.randomBytes(32).toString('hex')
  console.warn('[config] JWT_SECRET not set: using a temporary secret (tokens reset on restart).')
}

export const config = {
  isProd,
  root,
  port: Number(process.env.PORT) || 4000,
  dbPath: process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : path.join(root, 'data', 'trustlens.db'),
  jwtSecret,
  corsOrigin: process.env.CORS_ORIGIN || '',
  adminEmail: process.env.ADMIN_EMAIL || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || '',
  staticDir: path.resolve(root, '..', 'dist')
}

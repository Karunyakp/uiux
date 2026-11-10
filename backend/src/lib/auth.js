import crypto from 'node:crypto'
import { promisify } from 'node:util'
import { config } from '../config.js'
import { HttpError, wrap } from './http.js'

const scrypt = promisify(crypto.scrypt)
const b64u = v => Buffer.from(v).toString('base64url')

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const hash = await scrypt(password, salt, 64)
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`
}

export async function verifyPassword(password, stored) {
  const [alg, salt, hash] = String(stored || '').split('$')
  if (alg !== 'scrypt' || !salt || !hash) return false
  const expected = Buffer.from(hash, 'base64url')
  const actual = await scrypt(password, Buffer.from(salt, 'base64url'), expected.length)
  return crypto.timingSafeEqual(actual, expected)
}

export function signToken(payload, ttlSeconds, secret = config.jwtSecret) {
  const now = Math.floor(Date.now() / 1000)
  const head = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64u(JSON.stringify({ ...payload, iat: now, exp: now + ttlSeconds }))
  const sig = crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url')
  return `${head}.${body}.${sig}`
}

export function verifyToken(token, secret = config.jwtSecret) {
  const parts = String(token || '').split('.')
  if (parts.length !== 3) return null
  const [head, body, sig] = parts
  const expected = crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest()
  const given = Buffer.from(sig, 'base64url')
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null
  try {
    const header = JSON.parse(Buffer.from(head, 'base64url').toString())
    if (header.alg !== 'HS256') return null
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch { return null }
}

/** Loads req.user from the Bearer token when present (never rejects). */
export const authenticate = users => wrap(async (req, res, next) => {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '')
  if (m) {
    const payload = verifyToken(m[1])
    if (payload) req.user = users.byId(Number(payload.sub)) || null
  }
  next()
})

export const requireAuth = (req, res, next) =>
  req.user ? next() : next(new HttpError(401, 'Authentication required'))

export const requireAdmin = (req, res, next) => {
  if (!req.user) return next(new HttpError(401, 'Authentication required'))
  if (req.user.role !== 'admin') return next(new HttpError(403, 'Admin access required'))
  next()
}

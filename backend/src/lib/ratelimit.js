import { HttpError } from './http.js'

/** Small in-memory fixed-window limiter. Use a shared store (e.g. Redis) if you run several instances. */
export function rateLimit({ windowMs = 60_000, max = 60, name = 'global' } = {}) {
  const hits = new Map()
  const timer = setInterval(() => {
    const now = Date.now()
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k)
  }, windowMs)
  timer.unref?.()
  return (req, res, next) => {
    const id = `${name}:${req.ip}`
    const now = Date.now()
    let h = hits.get(id)
    if (!h || h.reset <= now) { h = { n: 0, reset: now + windowMs }; hits.set(id, h) }
    h.n++
    res.setHeader('X-RateLimit-Limit', String(max))
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - h.n)))
    if (h.n > max) {
      res.setHeader('Retry-After', String(Math.ceil((h.reset - now) / 1000)))
      return next(new HttpError(429, 'Too many requests, please slow down.'))
    }
    next()
  }
}

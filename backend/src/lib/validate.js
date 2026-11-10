import { HttpError } from './http.js'

export function str(v, name, { min = 1, max = 500, optional = false } = {}) {
  if (v === undefined || v === null || v === '') {
    if (optional) return null
    throw new HttpError(400, `${name} is required`)
  }
  if (typeof v !== 'string') throw new HttpError(400, `${name} must be text`)
  const t = v.trim()
  if (!t && optional) return null
  if (t.length < min) throw new HttpError(400, `${name} must be at least ${min} character${min === 1 ? '' : 's'}`)
  if (t.length > max) throw new HttpError(400, `${name} must be at most ${max} characters`)
  return t
}

export function email(v) {
  const e = str(v, 'email', { max: 254 }).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new HttpError(400, 'email is not valid')
  return e
}

export function oneOf(v, name, list) {
  if (!list.includes(v)) throw new HttpError(400, `${name} must be one of: ${list.join(', ')}`)
  return v
}

export function int(v, name, { min = -Infinity, max = Infinity, optional = false } = {}) {
  if (v === undefined || v === null || v === '') {
    if (optional) return null
    throw new HttpError(400, `${name} is required`)
  }
  const n = Number(v)
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, `${name} must be a whole number between ${min} and ${max}`)
  return n
}

export function bool(v, name) {
  if (typeof v !== 'boolean') throw new HttpError(400, `${name} must be true or false`)
  return v
}

export function key(v, name = 'key') {
  const k = str(v, name, { max: 40 }).toLowerCase()
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(k)) throw new HttpError(400, `${name} may only contain letters, numbers, - and _`)
  return k
}

// Thin client for the TrustLens backend. Vite proxies /api to http://localhost:4000 in dev;
// set VITE_API_URL if the API lives on another origin.
const BASE = import.meta.env.VITE_API_URL || ''
const store = {
  get: () => { try { return localStorage.getItem('tl_token') } catch { return null } },
  set: t => { try { localStorage.setItem('tl_token', t) } catch { /* private mode */ } }
}
let token = store.get()

async function req(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const err = new Error(data?.error || res.statusText || 'Request failed')
    err.status = res.status
    throw err
  }
  return data
}

/** Reuses the stored session, or silently creates a guest account. */
export async function ensureSession() {
  if (token) {
    try { return (await req('/auth/me')).user } catch (e) { if (e.status !== 401) throw e }
  }
  const { token: t, user } = await req('/auth/guest', { method: 'POST', body: {} })
  token = t; store.set(t)
  return user
}

export const api = {
  chat: (message, conversationId, history = [], attachments = []) => req('/chat', { method: 'POST', body: { message, conversationId, history, attachments } }),
  conversations: () => req('/conversations'),
  conversation: id => req(`/conversations/${id}`),
  deleteConversation: id => req(`/conversations/${id}`, { method: 'DELETE' }),
  renameConversation: (id, title) => req(`/conversations/${id}`, { method: 'PATCH', body: { title } }),
  topics: () => req('/topics'),
  saved: () => req('/me/saved'),
  save: (key, data = {}) => req(`/me/saved/${encodeURIComponent(key)}`, { method: 'PUT', body: data }),
  unsave: key => req(`/me/saved/${encodeURIComponent(key)}`, { method: 'DELETE' }),
  report: body => req('/reports', { method: 'POST', body }),
  feedback: body => req('/feedback', { method: 'POST', body }),
  followup: (key, question) => req(`/topics/${key}/followups`, { method: 'POST', body: { question } }),
  checklist: () => req('/checklist'),
  setCheck: (id, done) => req(`/checklist/${id}`, { method: 'PUT', body: { done } }),
  notifications: () => req('/notifications'),
  readNotifications: () => req('/notifications/read', { method: 'POST' }),
  rename: name => req('/auth/me', { method: 'PATCH', body: { name } }),
  register: body => req('/auth/register', { method: 'POST', body }).then(r => { token = r.token; store.set(r.token); return r.user }),
  login: body => req('/auth/login', { method: 'POST', body }).then(r => { token = r.token; store.set(r.token); return r.user }),
  googleConfig: () => req('/auth/google/config'),
  googleAuth: body => req('/auth/google', { method: 'POST', body }).then(r => { token = r.token; store.set(r.token); return r.user }),
  setToken: t => { token = t; store.set(t) },
  guest: () => req('/auth/guest', { method: 'POST', body: {} }).then(r => { token = r.token; store.set(r.token); return r.user }),
  logout: () => { token = null; try { localStorage.removeItem('tl_token') } catch {} }
}

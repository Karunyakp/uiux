export const publicUser = u => u && ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  isGuest: !!u.is_guest,
  avatarUrl: u.avatar_url || null,
  googleLinked: !!u.google_id
})

export function usersService(db) {
  const self = {
    byId: id => db.prepare('SELECT * FROM users WHERE id = ?').get(id),
    byEmail: email => db.prepare('SELECT * FROM users WHERE email = ?').get(email),
    byGoogleId: gid => db.prepare('SELECT * FROM users WHERE google_id = ?').get(gid),
    create({ email = null, name, passwordHash = null, role = 'user', isGuest = 0, googleId = null, avatarUrl = null }) {
      const r = db.prepare('INSERT INTO users (email, name, password_hash, role, is_guest, google_id, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(email, name, passwordHash, role, isGuest, googleId, avatarUrl)
      return self.byId(Number(r.lastInsertRowid))
    },
    /** Turns a guest into a real account, keeping everything they saved. */
    upgradeGuest(id, { email, name, passwordHash = null, googleId = null, avatarUrl = null }) {
      db.prepare(`UPDATE users SET email = ?, name = ?, password_hash = COALESCE(?, password_hash), google_id = COALESCE(?, google_id), avatar_url = COALESCE(?, avatar_url), is_guest = 0 WHERE id = ?`)
        .run(email, name, passwordHash, googleId, avatarUrl, id)
      return self.byId(id)
    },
    linkGoogle(id, googleId, avatarUrl = null) {
      db.prepare('UPDATE users SET google_id = ?, avatar_url = COALESCE(?, avatar_url) WHERE id = ?')
        .run(googleId, avatarUrl, id)
      return self.byId(id)
    },
    rename(id, name) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, id)
      return self.byId(id)
    }
  }
  return self
}

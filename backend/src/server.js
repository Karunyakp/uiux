import { config } from './config.js'
import { openDb } from './db.js'
import { createApp } from './app.js'
import { seed } from './seed.js'

const db = openDb(config.dbPath)
await seed(db)
const server = createApp(db).listen(config.port, () =>
  console.log(`TrustLens API listening on http://localhost:${config.port}  (db: ${config.dbPath})`))

const shutdown = () => server.close(() => { db.close(); process.exit(0) })
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

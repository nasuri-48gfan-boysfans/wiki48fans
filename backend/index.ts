import cors from 'cors'
import express from 'express'
import { connectMongo, mongoClient } from './mongodb.js'
import { env } from './env.js'
import { supabaseAdmin } from './supabaseAdmin.js'
import { getLiveSessions, startLiveTracker } from './liveTracker.js'

const app = express()
let mongoConnected = false

app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, services: { supabase: true, mongodb: mongoConnected } })
})

app.get('/api/health/supabase', async (_request, response) => {
  const { error } = await supabaseAdmin.from('roles').select('name').limit(1)
  if (error) return response.status(503).json({ ok: false, service: 'supabase', error: error.message })
  return response.json({ ok: true, service: 'supabase' })
})

app.get('/api/live', async (_request, response) => {
  if (!mongoConnected) return response.status(503).json({ ok: false, error: 'MongoDB is not connected' })
  return response.json({ ok: true, sessions: await getLiveSessions() })
})

const server = app.listen(env.PORT, () => console.log(`API listening on http://localhost:${env.PORT}`))

const trackerSources = [{ platform: 'SHOWROOM' as const, endpoint: env.SHOWROOM_TRACKER_URL }, { platform: 'IDN' as const, endpoint: env.IDN_TRACKER_URL }]
let trackerTimer: ReturnType<typeof setInterval> | undefined
connectMongo().then(() => { mongoConnected = true; console.log('MongoDB connected'); trackerTimer = startLiveTracker(trackerSources, env.LIVE_TRACKER_INTERVAL_MS) }).catch((error: Error) => console.error(`MongoDB connection failed: ${error.message}`))

function shutdown() { if (trackerTimer) clearInterval(trackerTimer); void mongoClient.close(); server.close(() => process.exit(0)) }
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

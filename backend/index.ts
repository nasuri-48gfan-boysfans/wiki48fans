import cors from 'cors'
import express from 'express'
import { connectMongo, mongoClient } from './mongodb.js'
import { env } from './env.js'
import { supabaseAdmin } from './supabaseAdmin.js'
import { getLiveSessions, getTrackerStatus, ensureLiveIndexes, startLiveTracker, stopLiveTracker, type LivePlatform, type PlatformMemberMapping, type NewLiveHook } from './liveTracker.js'
import { IdnAdapter, ShowroomAdapter } from './liveAdapters.js'
import { createOshiNotifierDeps, notifyOshiLive, type OshiNotifierDeps } from './liveNotifications.js'

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
  const platform = typeof _request.query.platform === 'string' ? _request.query.platform.toLowerCase() as LivePlatform : undefined
  const memberId = typeof _request.query.member === 'string' ? _request.query.member : undefined
  if (platform && !['showroom', 'idn'].includes(platform)) return response.status(400).json({ ok: false, error: 'platform must be showroom or idn' })
  return response.json({ ok: true, sessions: await getLiveSessions({ platform, memberId }) })
})

async function requireAdmin(request: express.Request, response: express.Response) {
  const token = request.headers.authorization?.startsWith('Bearer ') ? request.headers.authorization.slice(7) : ''
  if (!token) { response.status(401).json({ ok: false, error: 'Authentication required' }); return false }
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData.user) { response.status(401).json({ ok: false, error: 'Invalid access token' }); return false }
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', userData.user.id).maybeSingle()
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) { response.status(403).json({ ok: false, error: 'Admin permission required' }); return false }
  return true
}

app.get('/api/admin/live-tracker/status', async (request, response) => { if (!(await requireAdmin(request, response))) return; return response.json({ ok: true, tracker: await getTrackerStatus() }) })

const server = app.listen(env.PORT, () => console.log(`API listening on http://localhost:${env.PORT}`))

const showroomAdapter = new ShowroomAdapter(env.TRACKER_TIMEOUT_MS)
const idnAdapter = new IdnAdapter(env.TRACKER_TIMEOUT_MS)
const trackerAdapters = [showroomAdapter, idnAdapter]
const trackerSources = trackerAdapters
let trackerTimer: ReturnType<typeof setInterval> | undefined
async function loadMappings(): Promise<PlatformMemberMapping[]> { const { data, error } = await supabaseAdmin.from('members').select('id, showroom_room_id, idn_user_id').eq('is_active', true); if (error) throw error; return (data || []).flatMap((member) => [{ memberId: member.id, platformMemberId: member.showroom_room_id }, { memberId: member.id, platformMemberId: member.idn_user_id }].filter((mapping): mapping is PlatformMemberMapping => typeof mapping.platformMemberId === 'string' && mapping.platformMemberId.length > 0)) }
connectMongo().then(async () => { mongoConnected = true; await ensureLiveIndexes(); const mappings = await loadMappings(); console.log(`MongoDB connected; tracking ${mappings.length} platform mapping(s)`); let oshiNotifierDeps: OshiNotifierDeps | undefined; try { oshiNotifierDeps = await createOshiNotifierDeps() } catch (error) { console.error(`[oshiNotifications] deps failed: ${error instanceof Error ? error.message : String(error)}`) } const onNewLive: NewLiveHook = (session) => { if (!oshiNotifierDeps) return; void notifyOshiLive({ memberId: session.memberId, platform: session.platform, liveId: session.liveId, title: session.title, url: session.url }, oshiNotifierDeps).catch((error: Error) => console.error(`[oshiNotifications] failed: ${error.message}`)) }; trackerTimer = startLiveTracker(trackerSources, mappings, env.LIVE_TRACKER_INTERVAL_MS, onNewLive) }).catch((error: Error) => console.error(`MongoDB connection failed: ${error.message}`))

function shutdown() { if (trackerTimer) clearInterval(trackerTimer); stopLiveTracker(); void mongoClient.close(); server.close(() => process.exit(0)) }
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

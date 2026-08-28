import cors from 'cors'
import express from 'express'
import { connectMongo, mongoClient } from './mongodb.js'
import { env } from './env.js'
import { supabaseAdmin } from './supabaseAdmin.js'

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

const server = app.listen(env.PORT, () => console.log(`API listening on http://localhost:${env.PORT}`))

connectMongo().then(() => { mongoConnected = true; console.log('MongoDB connected') }).catch((error: Error) => console.error(`MongoDB connection failed: ${error.message}`))

function shutdown() { void mongoClient.close(); server.close(() => process.exit(0)) }
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

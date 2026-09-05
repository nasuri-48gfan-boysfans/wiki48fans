import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config({ path: '../.env.local' })
dotenv.config({ path: '../.env' })

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  MONGODB_URI: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(8787),
  // Strip trailing slashes: browsers send Origin without one, and cors@2.x
  // reflects an exact-match header, so a stray "/" breaks CORS production-wide.
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173').transform((origin) => origin.replace(/\/+$/, '')),
  LIVE_TRACKER_INTERVAL_MS: z.coerce.number().int().positive().default(60000),
  SHOWROOM_TRACKER_URL: z.string().url().optional(),
  IDN_TRACKER_URL: z.string().url().optional(),
  TRACKER_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  VIEWER_SNAPSHOT_INTERVAL_MS: z.coerce.number().int().positive().default(60000),
  JKT48_CONNECT_API_KEY: z.string().optional(),
  JKT48_48PEDIA_API_KEY: z.string().optional(),
})

export const env = envSchema.parse({
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  MONGODB_URI: process.env.MONGODB_URI,
  PORT: process.env.PORT,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN,
  LIVE_TRACKER_INTERVAL_MS: process.env.LIVE_TRACKER_INTERVAL_MS,
  SHOWROOM_TRACKER_URL: process.env.SHOWROOM_TRACKER_URL,
  IDN_TRACKER_URL: process.env.IDN_TRACKER_URL,
  TRACKER_TIMEOUT_MS: process.env.TRACKER_TIMEOUT_MS,
  VIEWER_SNAPSHOT_INTERVAL_MS: process.env.VIEWER_SNAPSHOT_INTERVAL_MS,
  JKT48_CONNECT_API_KEY: process.env.JKT48_CONNECT_API_KEY,
  JKT48_48PEDIA_API_KEY: process.env.JKT48_48PEDIA_API_KEY,
})

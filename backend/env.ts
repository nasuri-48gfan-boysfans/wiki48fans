import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config({ path: '../.env.local' })
dotenv.config({ path: '../.env' })

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  MONGODB_URI: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(8787),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  LIVE_TRACKER_INTERVAL_MS: z.coerce.number().int().positive().default(60000),
  SHOWROOM_TRACKER_URL: z.string().url().optional(),
  IDN_TRACKER_URL: z.string().url().optional(),
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
})

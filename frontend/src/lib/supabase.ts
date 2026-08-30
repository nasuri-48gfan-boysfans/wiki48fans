import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function requireEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing ${name} in .env.local`)
  return value
}
export const supabase = createClient(requireEnv(supabaseUrl, 'VITE_SUPABASE_URL'), requireEnv(supabaseAnonKey, 'VITE_SUPABASE_ANON_KEY'))

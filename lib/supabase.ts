import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)

export const isSupabaseConfigured =
  !!supabaseUrl && supabaseUrl !== 'YOUR_SUPABASE_URL' &&
  !!supabaseAnonKey && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY'

export type User = {
  id: number
  username: string
  full_name: string
  role: 'Admin' | 'User'
}

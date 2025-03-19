import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
)

// Types for Supabase tables
export interface Message {
  id: string
  conversation_id: string
  content: string
  created_at: string
  sender_type: "user" | "bot" | "agent"
  user_id: string
  read: boolean
}

export interface Conversation {
  id: string
  user_id: string
  message?: string
  message_type?: string
  status: string
  last_message_time: string
  created_at: string
  business_id?: string
  is_bot_active: boolean
}

export interface Profile {
  id: string
  email: string
  name?: string
  avatar_url?: string
  whatsapp_number?: string
}

export interface Business {
  id: string
  name: string
  gupshup_api_key: string | null
  whatsapp_number: string
  plan_type: 'basic' | 'premium' | 'enterprise'
  max_concurrent_chats: number | null
  created_at: string
  updated_at: string
} 
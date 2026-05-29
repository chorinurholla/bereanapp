import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser client — use this in Client Components
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnon)
}

// Types
export interface UserProfile {
  id: string
  email: string
  name: string
  occupation: string
  api_key?: string
  created_at: string
}

export interface BereanData {
  user_id: string
  data_type: 'tracker' | 'history' | 'journal' | 'devotion_count'
  payload: string
  updated_at: string
}

export interface HistoryEntry {
  id: number
  date: string
  dateLabel: string
  query: string
  reply: string
  refs: string
  books: string
}

export interface JournalEntry {
  id: number
  devotionId: number
  date: string
  dateLabel: string
  text: string
  refs: string
}

export interface TrackerEntry {
  id: string
  ref: string
  title: string
  book: string
  date: string
}

export interface ConversationEntry {
  id: number
  date: string
  dateLabel: string
  title: string           // first question asked
  messages: Array<{ role: 'user' | 'assistant'; content: string; sources?: string[] }>
  refs: string            // all passages cited
}

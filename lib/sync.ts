import { createClient } from './supabase'
import type { HistoryEntry, JournalEntry, TrackerEntry } from './supabase'

// ── Storage keys (user-scoped) ──
export function keys(uid: string) {
  const s = uid.slice(0, 8)
  return {
    tracker:       `brn_tracker_${s}`,
    history:       `brn_history_${s}`,
    conversations: `brn_conversations_${s}`,
    sermons:       `brn_sermons_${s}`,
    journal:       `brn_journal_${s}`,
    devcount:      `brn_devcount_${s}`,
    apikey:        `brn_apikey`,
  }
}

// ── Local helpers ──
export function loadLocal<T>(key: string, def: T): T {
  if (typeof window === 'undefined') return def
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : def
  } catch { return def }
}

export function saveLocal(key: string, val: unknown) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(val))
}

// ── Wipe stale data from previous users ──
export function wipeStaleData(currentUid: string) {
  if (typeof window === 'undefined') return
  const prefix = 'brn_'
  const mySlice = currentUid.slice(0, 8)
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith(prefix) && !k.endsWith('apikey')) {
      // If the key is scoped to a different user, remove it
      const match = k.match(/_([a-f0-9]{8})$/)
      if (match && match[1] !== mySlice) {
        localStorage.removeItem(k)
      }
    }
  })
}

// ── Supabase sync helpers ──
async function sbGet(uid: string, type: string) {
  const sb = createClient()
  const { data } = await sb
    .from('berean_data')
    .select('payload')
    .eq('user_id', uid)
    .eq('data_type', type)
    .single()
  if (!data?.payload) return null
  try { return JSON.parse(data.payload) } catch { return null }
}

async function sbSet(uid: string, type: string, payload: unknown) {
  const sb = createClient()
  await sb.from('berean_data').upsert({
    user_id: uid,
    data_type: type,
    payload: JSON.stringify(payload),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,data_type' })
}

// ── Full sync: cloud → local (cloud wins) ──
export async function syncFromCloud(uid: string) {
  const k = keys(uid)
  try {
    const [tracker, history, journal, sermons, conversations, devcount] = await Promise.all([
      sbGet(uid, 'tracker'),
      sbGet(uid, 'history'),
      sbGet(uid, 'journal'),
      sbGet(uid, 'sermons'),
      sbGet(uid, 'conversations'),
      sbGet(uid, 'devotion_count'),
    ])

    // Tracker
    if (tracker && typeof tracker === 'object') {
      const local = loadLocal<Record<string, TrackerEntry>>(k.tracker, {})
      saveLocal(k.tracker, { ...local, ...tracker })
    } else {
      const local = loadLocal<Record<string, TrackerEntry>>(k.tracker, {})
      if (Object.keys(local).length) await sbSet(uid, 'tracker', local)
    }

    // Devotion history
    if (history && Array.isArray(history)) {
      const local = loadLocal<HistoryEntry[]>(k.history, [])
      const cloudIds = new Set(history.map((e: HistoryEntry) => e.id))
      const merged = [...history, ...local.filter((e: HistoryEntry) => !cloudIds.has(e.id))]
      merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      saveLocal(k.history, merged.slice(0, 365))
    } else {
      const local = loadLocal<HistoryEntry[]>(k.history, [])
      if (local.length) await sbSet(uid, 'history', local)
    }

    // Prayer journal
    if (journal && Array.isArray(journal)) {
      const local = loadLocal<JournalEntry[]>(k.journal, [])
      const cloudIds = new Set(journal.map((e: JournalEntry) => e.id))
      const merged = [...journal, ...local.filter((e: JournalEntry) => !cloudIds.has(e.id))]
      merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      saveLocal(k.journal, merged)
    } else {
      const local = loadLocal<JournalEntry[]>(k.journal, [])
      if (local.length) await sbSet(uid, 'journal', local)
    }

    // Sermon notes
    if (sermons && Array.isArray(sermons)) {
      const local = loadLocal<Record<string, unknown>[]>(k.sermons, [])
      const cloudIds = new Set(sermons.map((e: Record<string, unknown>) => e.id))
      const merged = [
        ...sermons,
        ...local.filter((e: Record<string, unknown>) => !cloudIds.has(e.id)),
      ]
      merged.sort((a, b) =>
        new Date((b as Record<string, string>).date).getTime() -
        new Date((a as Record<string, string>).date).getTime()
      )
      saveLocal(k.sermons, merged)
    } else {
      const local = loadLocal<Record<string, unknown>[]>(k.sermons, [])
      if (local.length) await sbSet(uid, 'sermons', local)
    }

    // Saved conversations
    if (conversations && Array.isArray(conversations)) {
      const local = loadLocal<Record<string, unknown>[]>(k.conversations, [])
      const cloudIds = new Set(conversations.map((e: Record<string, unknown>) => e.id))
      const merged = [
        ...conversations,
        ...local.filter((e: Record<string, unknown>) => !cloudIds.has(e.id)),
      ]
      saveLocal(k.conversations, merged)
    } else {
      const local = loadLocal<Record<string, unknown>[]>(k.conversations, [])
      if (local.length) await sbSet(uid, 'conversations', local)
    }

    // Devotion count
    if (devcount !== null) {
      const localCount = parseInt(localStorage.getItem(k.devcount) || '0')
      const cloudCount = typeof devcount === 'number' ? devcount : parseInt(devcount) || 0
      localStorage.setItem(k.devcount, String(Math.max(localCount, cloudCount)))
    }
  } catch (e) {
    console.warn('[Berean sync] Cloud sync failed:', e)
  }
}

// ── Push local → cloud (fire and forget) ──
export function pushToCloud(uid: string, type: string, payload: unknown) {
  sbSet(uid, type, payload).catch(e => console.warn('[Berean sync] Push failed:', e))
}

// ── Streak calculation ──
export function calcStreak(history: HistoryEntry[]): number {
  if (!history.length) return 0
  const dates = [...new Set(history.map(h => new Date(h.date).toDateString()))]
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
  let streak = 0
  let check = new Date(); check.setHours(0,0,0,0)
  for (const d of dates) {
    const dd = new Date(d); dd.setHours(0,0,0,0)
    const diff = (check.getTime() - dd.getTime()) / 86400000
    if (diff <= 1) { streak++; check = dd } else break
  }
  return streak
}

// ── Format date label ──
export function dateLabel(date: Date = new Date()): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  })
}

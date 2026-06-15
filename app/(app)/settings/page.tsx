'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Save } from 'lucide-react'

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth()
  const [name,   setName]   = useState('')
  const [occ,    setOcc]    = useState('')
  const [saving, setSaving] = useState(false)
  const sb = createClient()

  useEffect(() => {
    if (profile) { setName(profile.name || ''); setOcc(profile.occupation || '') }
  }, [profile])

  const save = async () => {
    if (!user) return
    setSaving(true)
    try {
      await sb.from('user_profiles').upsert({
        id: user.id, email: user.email || '',
        name: name.trim(),
        occupation: occ.trim(),
      }, { onConflict: 'id' })
      await refreshProfile()
      toast.success('Settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace',
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-4 flex-shrink-0"
           style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <h2 className="font-mono text-[0.65rem] tracking-[0.2em] uppercase"
            style={{ color: 'var(--gold)' }}>
          Account Settings
        </h2>
      </div>

      <div className="px-4 py-6 max-w-md space-y-6">

        {/* Account info */}
        <div>
          <div className="font-mono text-[0.55rem] tracking-[0.18em] uppercase mb-3"
               style={{ color: 'var(--text-mute)' }}>
            Account
          </div>
          <div className="px-3 py-2.5 font-mono text-xs"
               style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>
            {user?.email}
          </div>
        </div>

        {/* Profile */}
        <div>
          <div className="font-mono text-[0.55rem] tracking-[0.18em] uppercase mb-3"
               style={{ color: 'var(--text-mute)' }}>
            Profile — used to personalise devotions
          </div>
          <div className="space-y-3">
            <div>
              <label className="font-mono text-[0.5rem] tracking-[0.12em] uppercase block mb-1"
                     style={{ color: 'var(--text-mute)' }}>
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your first name"
                className="w-full px-3 py-2.5 text-sm outline-none"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
                onBlur={e  => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <div>
              <label className="font-mono text-[0.5rem] tracking-[0.12em] uppercase block mb-1"
                     style={{ color: 'var(--text-mute)' }}>
                Occupation / Life Context
              </label>
              <input
                type="text"
                value={occ}
                onChange={e => setOcc(e.target.value)}
                placeholder="e.g. Pastor, Entrepreneur, Teacher, Parent"
                className="w-full px-3 py-2.5 text-sm outline-none"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
                onBlur={e  => e.target.style.borderColor = 'var(--border)'}
              />
              <p className="font-mono text-[0.48rem] mt-1 leading-relaxed"
                 style={{ color: 'var(--text-mute)' }}>
                This context is used to personalise how Berean applies Scripture to your specific life situation.
              </p>
            </div>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-3 font-mono text-[0.6rem] tracking-[0.18em] uppercase transition-all cursor-pointer w-full justify-center"
          style={{
            background: 'var(--gold-dim)', border: '1px solid var(--gold)',
            color: 'var(--gold)', opacity: saving ? 0.6 : 1,
          }}
        >
          <Save size={12} />
          {saving ? 'Saving…' : 'Save Changes'}
        </button>

        {/* App info */}
        <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="font-mono text-[0.55rem] tracking-[0.18em] uppercase mb-3"
               style={{ color: 'var(--text-mute)' }}>
            About Berean
          </div>
          {[
            ['Corpus', '66 books · 1,185 chapters · 4,065 principles'],
            ['Methodology', 'Observation → Interpretation → Timeless Principle → Application → God Shot'],
            ['Sync', 'History, journal, and tracker sync across all your devices automatically'],
            ['Built by', 'Aloniros Inc.'],
            ['Website', 'monskisnote.com'],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-3 mb-2">
              <span className="font-mono text-[0.5rem] tracking-[0.1em] uppercase w-20 flex-shrink-0 mt-0.5"
                    style={{ color: 'var(--text-mute)' }}>
                {label}
              </span>
              <span className="font-mono text-[0.5rem] leading-relaxed"
                    style={{ color: 'var(--text-dim)' }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

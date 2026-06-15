'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

export default function LoginPage() {
  const [tab,  setTab]  = useState<'in'|'up'>('in')
  const [f,    setF]    = useState({ email:'', password:'', name:'', occ:'' })
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  const sb = createClient()
  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF(p => ({...p,[k]:e.target.value}))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.email || !f.password) { toast.error('Email and password required'); return }
    if (tab === 'up' && f.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setBusy(true)
    try {
      if (tab === 'in') {
        const { error } = await sb.auth.signInWithPassword({ email: f.email, password: f.password })
        if (error) throw error
        router.push('/devotion')
      } else {
        const { data, error } = await sb.auth.signUp({ email: f.email, password: f.password })
        if (error) throw error
        if (data.user) {
          await sb.from('user_profiles').upsert({
            id: data.user.id, email: f.email,
            name: f.name || f.email.split('@')[0],
            occupation: f.occ || '', api_key: '',
            created_at: new Date().toISOString(),
          }, { onConflict: 'id' })
        }
        if (data.session) router.push('/devotion')
        else { toast.success('Check your email to confirm, then sign in.'); setTab('in') }
      }
    } catch (err: unknown) {
      toast.error((err as {message?:string})?.message || 'Something went wrong')
      setBusy(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'var(--paper)',
    }}>
      {/* Left panel — branding */}
      <div style={{
        width: '420px', flexShrink: 0,
        background: 'var(--ink)',
        padding: '60px 48px',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
      }} className="hide-on-small">
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '32px',
            fontWeight: 500, color: 'white', letterSpacing: '0.04em', marginBottom: '8px' }}>
            Bere<span style={{ color: 'var(--gold3)' }}>an</span>
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 400,
            letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)',
            marginBottom: '48px' }}>
            Biblical Principles Corpus
          </div>

          <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '19px',
            lineHeight: 1.8, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic',
            marginBottom: '40px', maxWidth: '300px' }}>
            "Every chapter of Scripture. One transferable principle. Grounded in the story."
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[['66', 'Books of the Bible'],
              ['960', 'Chapters documented'],
              ['5,956', 'Timeless principles']].map(([n, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px',
                  fontWeight: 500, color: 'var(--gold3)', lineHeight: 1 }}>{n}</span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
                  color: 'rgba(255,255,255,0.5)' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
          color: 'rgba(255,255,255,0.3)' }}>
          Aloniros Inc. · monskisnote.com
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          {/* Mobile logo */}
          <div className="show-on-small" style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px',
              fontWeight: 500, color: 'var(--ink)' }}>
              Bere<span style={{ color: 'var(--gold2)' }}>an</span>
            </div>
          </div>

          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px',
            fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>
            {tab === 'in' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
            color: 'var(--ink4)', marginBottom: '28px' }}>
            {tab === 'in'
              ? 'Sign in to access your devotions, journal, and history.'
              : 'Join Berean and begin your daily devotion journey.'}
          </p>

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: '0', marginBottom: '28px',
            border: '1.5px solid var(--rule)', borderRadius: '4px', overflow: 'hidden' }}>
            {[['in','Sign In'],['up','Create Account']].map(([t,l]) => (
              <button key={t} onClick={() => setTab(t as 'in'|'up')} style={{
                flex: 1, padding: '10px', border: 'none', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600,
                letterSpacing: '0.04em', transition: 'all 0.15s',
                background: tab === t ? 'var(--gold)' : 'transparent',
                color: tab === t ? 'white' : 'var(--ink4)',
              }}>
                {l}
              </button>
            ))}
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="field-label">Email address</label>
              <input type="email" value={f.email} onChange={upd('email')}
                placeholder="you@email.com" autoComplete="email" className="input-field"
                style={{ padding: '12px 16px' }} />
            </div>
            <div>
              <label className="field-label">Password</label>
              <input type="password" value={f.password} onChange={upd('password')}
                placeholder={tab === 'up' ? 'Minimum 6 characters' : ''}
                autoComplete={tab === 'in' ? 'current-password' : 'new-password'}
                className="input-field" style={{ padding: '12px 16px' }} />
            </div>

            {tab === 'up' && (
              <>
                <div>
                  <label className="field-label">First name</label>
                  <input type="text" value={f.name} onChange={upd('name')}
                    placeholder="How Berean will address you" className="input-field"
                    style={{ padding: '12px 16px' }} />
                </div>
                <div>
                  <label className="field-label">Occupation / context</label>
                  <input type="text" value={f.occ} onChange={upd('occ')}
                    placeholder="e.g. Pastor, Entrepreneur, Parent"
                    className="input-field" style={{ padding: '12px 16px' }} />
                  <p style={{ marginTop: '5px', fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
                    color: 'var(--ink5)', fontStyle: 'italic' }}>
                    Used to personalise how principles apply to your life
                  </p>
                </div>
              </>
            )}

            <button type="submit" disabled={busy} className="btn btn-gold"
              style={{ width: '100%', padding: '14px', fontSize: '13px', marginTop: '4px' }}>
              {busy ? 'Please wait…' : tab === 'in' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {tab === 'in' && (
            <button onClick={async () => {
              if (!f.email) { toast.error('Enter your email first'); return }
              const { error } = await sb.auth.resetPasswordForEmail(f.email)
              if (error) toast.error(error.message)
              else toast.success('Password reset email sent')
            }} style={{ marginTop: '14px', width: '100%', padding: '8px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--ink5)' }}>
              Forgot password?
            </button>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) { .hide-on-small { display: none !important; } }
        @media (min-width: 768px) { .show-on-small { display: none !important; } }
      `}</style>
    </div>
  )
}

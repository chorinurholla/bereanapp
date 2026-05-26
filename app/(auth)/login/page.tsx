'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { toast } from 'sonner'

export default function LoginPage() {
  const [tab,      setTab]      = useState<'signin'|'signup'>('signin')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [occ,      setOcc]      = useState('')
  const [loading,  setLoading]  = useState(false)
  const router = useRouter()
  const sb = createClient()

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Email and password required'); return }
    setLoading(true)
    try {
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push('/devotion')
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || 'Sign in failed')
      setLoading(false)
    }
  }

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Email and password required'); return }
    if (password.length < 6)  { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const { data, error } = await sb.auth.signUp({ email, password })
      if (error) throw error
      if (data.user) {
        await sb.from('user_profiles').upsert({
          id: data.user.id, email,
          name: name || email.split('@')[0],
          occupation: occ || '', api_key: '',
          created_at: new Date().toISOString(),
        }, { onConflict: 'id' })
      }
      if (data.session) router.push('/devotion')
      else { toast.success('Check your email to confirm your account, then sign in.'); setTab('signin') }
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || 'Sign up failed')
      setLoading(false)
    }
  }

  const forgot = async () => {
    if (!email) { toast.error('Enter your email first'); return }
    const { error } = await sb.auth.resetPasswordForEmail(email)
    if (error) toast.error(error.message)
    else toast.success('Password reset email sent')
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--parchment)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
      backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(154,123,58,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(42,61,90,0.04) 0%, transparent 60%)',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '32px', fontWeight: 500,
            letterSpacing: '0.25em', color: 'var(--gold)', marginBottom: '8px' }}>
            BEREAN
          </h1>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', letterSpacing: '0.2em',
            textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 500 }}>
            Biblical Principles Corpus
          </p>
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '24px' }}>
            {[['66', 'Books'], ['960', 'Chapters'], ['5,956', 'Principles']].map(([n, l]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: '16px', color: 'var(--gold)', fontWeight: 500 }}>{n}</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.5rem', letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: 'var(--ink-mute)', marginTop: '2px' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="card" style={{ background: 'white', overflow: 'hidden' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {(['signin', 'signup'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: '14px 0',
                background: tab === t ? 'white' : 'var(--parchment)',
                border: 'none',
                borderBottom: tab === t ? '2px solid var(--gold2)' : '2px solid transparent',
                fontFamily: 'Inter, sans-serif', fontSize: '0.65rem',
                letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600,
                color: tab === t ? 'var(--gold)' : 'var(--ink-mute)',
                cursor: 'pointer', marginBottom: '-1px', transition: 'all 0.15s',
              }}>
                {t === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* Form */}
          <div style={{ padding: '28px' }}>
            <form onSubmit={tab === 'signin' ? signIn : signUp}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '0.6rem',
                  letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500,
                  color: 'var(--ink-mute)', marginBottom: '6px' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" autoComplete="email"
                  className="field" style={{ marginBottom: 0 }} />
              </div>

              <div style={{ marginBottom: tab === 'signup' ? '14px' : '20px' }}>
                <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '0.6rem',
                  letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500,
                  color: 'var(--ink-mute)', marginBottom: '6px' }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={tab === 'signup' ? 'Minimum 6 characters' : 'Your password'}
                  autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                  className="field" style={{ marginBottom: 0 }} />
              </div>

              {tab === 'signup' && (
                <>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '0.6rem',
                      letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500,
                      color: 'var(--ink-mute)', marginBottom: '6px' }}>First Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="How Berean will address you" className="field" style={{ marginBottom: 0 }} />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '0.6rem',
                      letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500,
                      color: 'var(--ink-mute)', marginBottom: '6px' }}>Occupation / Context</label>
                    <input type="text" value={occ} onChange={e => setOcc(e.target.value)}
                      placeholder="e.g. Pastor, Entrepreneur, Parent"
                      className="field" style={{ marginBottom: 0 }} />
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', color: 'var(--ink-mute)',
                      marginTop: '5px', fontStyle: 'italic' }}>
                      Used to personalise how principles apply to your life
                    </p>
                  </div>
                </>
              )}

              <button type="submit" disabled={loading} className="btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '0.68rem' }}>
                {loading ? 'Please wait…' : tab === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            {tab === 'signin' && (
              <button onClick={forgot} className="btn-ghost"
                style={{ width: '100%', marginTop: '10px', justifyContent: 'center',
                  fontSize: '0.6rem', color: 'var(--ink-mute)' }}>
                Forgot password?
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: '24px', fontFamily: 'Cormorant Garamond, serif',
          fontSize: '0.9rem', color: 'var(--ink-mute)', fontStyle: 'italic' }}>
          Genesis through Revelation — every chapter, every principle
        </p>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const router = useRouter()
  const sb = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Email and password required'); return }
    setLoading(true)
    try {
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push('/devotion')
    } catch (err: unknown) {
      const e = err as { message?: string }
      toast.error(e?.message || 'Sign in failed')
      setLoading(false)
    }
  }

  const handleForgot = async () => {
    if (!email) { toast.error('Enter your email first'); return }
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    if (error) toast.error(error.message)
    else toast.success('Password reset email sent')
  }

  const field: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '13px',
    outline: 'none',
    marginBottom: '10px',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '20px',
    }}>
      {/* Glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 40% at 30% 50%, rgba(201,168,76,0.04) 0%, transparent 70%)'
      }} />

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
        <div style={{
          position: 'relative',
          padding: '44px 40px 36px',
          background: 'var(--surface)',
          border: '1px solid var(--border2)',
        }}>
          {/* Gold top line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
            background: 'linear-gradient(90deg, transparent, var(--gold), transparent)'
          }} />

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{
              fontFamily: 'Cinzel, Georgia, serif',
              fontSize: '28px',
              fontWeight: 500,
              letterSpacing: '0.25em',
              color: 'var(--gold)',
              margin: 0,
            }}>BEREAN</h1>
            <p style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '9px',
              letterSpacing: '0.22em',
              color: 'var(--text-mute)',
              textTransform: 'uppercase',
              marginTop: '6px',
            }}>Biblical Principles Corpus</p>
          </div>

          <form onSubmit={handleSubmit}>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email address" autoComplete="email" style={field}
              onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
              onBlur={e  => e.target.style.borderColor = 'var(--border)'}
            />
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Password" autoComplete="current-password" style={field}
              onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
              onBlur={e  => e.target.style.borderColor = 'var(--border)'}
            />
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px 0', marginBottom: '10px',
              background: 'var(--gold-dim)', border: '1px solid var(--gold)',
              color: 'var(--gold)', fontFamily: 'JetBrains Mono, monospace',
              fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <button onClick={handleForgot} style={{
            width: '100%', padding: '8px 0', background: 'transparent', border: 'none',
            color: 'var(--text-mute)', fontFamily: 'JetBrains Mono, monospace',
            fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer',
          }}
          onMouseOver={e => (e.currentTarget.style.color = 'var(--gold)')}
          onMouseOut={e  => (e.currentTarget.style.color = 'var(--text-mute)')}
          >
            Forgot password?
          </button>

          <div style={{
            marginTop: '24px', paddingTop: '20px',
            borderTop: '1px solid var(--border)', textAlign: 'center'
          }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: '9px',
              letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-mute)'
            }}>New to Berean?{'  '}</span>
            <Link href="/signup" style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: '9px',
              letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)',
              textDecoration: 'none'
            }}>Create account →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

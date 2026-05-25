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

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{ background: 'var(--bg)' }}>

      {/* Background radial glow */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 60% 40% at 30% 50%, rgba(201,168,76,0.04) 0%, transparent 70%)' }} />

      <div className="w-full max-w-sm relative">
        {/* Card */}
        <div className="relative p-10 border"
             style={{ background: 'var(--surface)', borderColor: 'var(--border2)' }}>

          {/* Gold top line */}
          <div className="absolute top-0 left-0 right-0 h-px"
               style={{ background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }} />

          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="font-mono text-3xl tracking-[0.25em]"
                style={{ color: 'var(--gold)', fontFamily: "'Cinzel', serif" }}>
              BEREAN
            </h1>
            <p className="font-mono text-[0.55rem] tracking-[0.22em] mt-1.5 uppercase"
               style={{ color: 'var(--text-mute)' }}>
              Biblical Principles Corpus
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              autoComplete="email"
              className="w-full px-3.5 py-3 text-sm outline-none transition-colors"
              style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
              onBlur={e  => e.target.style.borderColor = 'var(--border)'}
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              className="w-full px-3.5 py-3 text-sm outline-none transition-colors"
              style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
              onBlur={e  => e.target.style.borderColor = 'var(--border)'}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 font-mono text-[0.65rem] tracking-[0.22em] uppercase transition-all cursor-pointer"
              style={{
                background: 'var(--gold-dim)', border: '1px solid var(--gold)',
                color: 'var(--gold)',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <button
            onClick={handleForgot}
            className="w-full mt-3 py-2 font-mono text-[0.6rem] tracking-[0.15em] uppercase transition-colors cursor-pointer"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-mute)' }}
            onMouseOver={e => (e.target as HTMLElement).style.color = 'var(--gold)'}
            onMouseOut={e  => (e.target as HTMLElement).style.color = 'var(--text-mute)'}
          >
            Forgot password?
          </button>

          <div className="mt-6 pt-5 border-t text-center"
               style={{ borderColor: 'var(--border)' }}>
            <span className="font-mono text-[0.6rem] tracking-[0.1em] uppercase"
                  style={{ color: 'var(--text-mute)' }}>
              New to Berean?{' '}
            </span>
            <Link href="/signup"
                  className="font-mono text-[0.6rem] tracking-[0.1em] uppercase transition-colors"
                  style={{ color: 'var(--gold)' }}>
              Create account →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

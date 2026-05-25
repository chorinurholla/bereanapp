'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { toast } from 'sonner'

export default function SignUpPage() {
  const [form, setForm] = useState({ email: '', password: '', name: '', occupation: '' })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const sb = createClient()

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password) { toast.error('Email and password required'); return }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const { data, error } = await sb.auth.signUp({ email: form.email, password: form.password })
      if (error) throw error
      if (data.user) {
        await sb.from('user_profiles').upsert({
          id: data.user.id, email: form.email,
          name: form.name || form.email.split('@')[0],
          occupation: form.occupation || '', api_key: '',
          created_at: new Date().toISOString(),
        }, { onConflict: 'id' })
      }
      if (data.session) { router.push('/devotion') }
      else { toast.success('Check your email to confirm, then sign in.'); router.push('/login') }
    } catch (err: unknown) {
      const e = err as { message?: string }
      toast.error(e?.message || 'Sign up failed')
      setLoading(false)
    }
  }

  const field: React.CSSProperties = {
    width: '100%', padding: '12px 14px', marginBottom: '10px',
    background: 'var(--surface2)', border: '1px solid var(--border)',
    color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace',
    fontSize: '13px', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', padding: '20px'
    }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 40% at 70% 50%, rgba(74,143,255,0.03) 0%, transparent 70%)' }} />

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
        <div style={{
          position: 'relative', padding: '44px 40px 36px',
          background: 'var(--surface)', border: '1px solid var(--border2)',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
            background: 'linear-gradient(90deg, transparent, var(--gold), transparent)'
          }} />

          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{
              fontFamily: 'Cinzel, Georgia, serif', fontSize: '28px', fontWeight: 500,
              letterSpacing: '0.25em', color: 'var(--gold)', margin: 0,
            }}>BEREAN</h1>
            <p style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: '9px',
              letterSpacing: '0.22em', color: 'var(--text-mute)',
              textTransform: 'uppercase', marginTop: '6px'
            }}>Create your account</p>
          </div>

          <form onSubmit={handleSubmit}>
            {[
              { key: 'email',      type: 'email',    ph: 'Email address',                           auto: 'email'            },
              { key: 'password',   type: 'password', ph: 'Password (min 6 chars)',                  auto: 'new-password'     },
              { key: 'name',       type: 'text',     ph: 'First name',                              auto: 'given-name'      },
              { key: 'occupation', type: 'text',     ph: 'Occupation / context (e.g. Pastor, Entrepreneur)', auto: 'organization-title' },
            ].map(({ key, type, ph, auto }) => (
              <input key={key} type={type}
                value={form[key as keyof typeof form]}
                onChange={set(key)} placeholder={ph} autoComplete={auto}
                style={field}
                onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
                onBlur={e  => e.target.style.borderColor = 'var(--border)'}
              />
            ))}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px 0', marginTop: '4px',
              background: 'var(--gold-dim)', border: '1px solid var(--gold)',
              color: 'var(--gold)', fontFamily: 'JetBrains Mono, monospace',
              fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            }}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div style={{
            marginTop: '24px', paddingTop: '20px',
            borderTop: '1px solid var(--border)', textAlign: 'center'
          }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: '9px',
              letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-mute)'
            }}>Already have an account?{'  '}</span>
            <Link href="/login" style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: '9px',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--gold)', textDecoration: 'none'
            }}>Sign in →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

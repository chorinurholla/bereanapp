'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { toast } from 'sonner'

export default function SignUpPage() {
  const [form, setForm] = useState({
    email: '', password: '', name: '', occupation: '',
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const sb = createClient()

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password) { toast.error('Email and password required'); return }
    if (form.password.length < 6)      { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const { data, error } = await sb.auth.signUp({
        email: form.email, password: form.password,
      })
      if (error) throw error
      if (data.user) {
        await sb.from('user_profiles').upsert({
          id: data.user.id,
          email: form.email,
          name: form.name || form.email.split('@')[0],
          occupation: form.occupation || '',
          api_key: '',
          created_at: new Date().toISOString(),
        }, { onConflict: 'id' })
      }
      if (data.session) {
        router.push('/devotion')
      } else {
        toast.success('Check your email to confirm your account, then sign in.')
        router.push('/login')
      }
    } catch (err: unknown) {
      const e = err as { message?: string }
      toast.error(e?.message || 'Sign up failed')
      setLoading(false)
    }
  }

  const inputStyle = {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace',
  }
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.target.style.borderColor = 'rgba(201,168,76,0.5)')
  const onBlur  = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.target.style.borderColor = 'var(--border)')

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8"
         style={{ background: 'var(--bg)' }}>
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 60% 40% at 70% 50%, rgba(74,143,255,0.03) 0%, transparent 70%)' }} />

      <div className="w-full max-w-sm relative">
        <div className="relative p-10 border"
             style={{ background: 'var(--surface)', borderColor: 'var(--border2)' }}>
          <div className="absolute top-0 left-0 right-0 h-px"
               style={{ background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }} />

          <div className="text-center mb-8">
            <h1 className="text-3xl tracking-[0.25em]"
                style={{ color: 'var(--gold)', fontFamily: "'Cinzel', serif" }}>
              BEREAN
            </h1>
            <p className="font-mono text-[0.55rem] tracking-[0.22em] mt-1.5 uppercase"
               style={{ color: 'var(--text-mute)' }}>
              Create your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {[
              { key:'email',      type:'email',    placeholder:'Email address',                          auto:'email'       },
              { key:'password',   type:'password', placeholder:'Password (min 6 chars)',                 auto:'new-password'},
              { key:'name',       type:'text',     placeholder:'First name',                             auto:'given-name'  },
              { key:'occupation', type:'text',     placeholder:'Occupation / context (e.g. Pastor, Entrepreneur)', auto:'organization-title'},
            ].map(({ key, type, placeholder, auto }) => (
              <input
                key={key}
                type={type}
                value={form[key as keyof typeof form]}
                onChange={set(key)}
                placeholder={placeholder}
                autoComplete={auto}
                className="w-full px-3.5 py-3 text-sm outline-none transition-colors"
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 font-mono text-[0.65rem] tracking-[0.22em] uppercase transition-all cursor-pointer mt-1"
              style={{
                background: 'var(--gold-dim)', border: '1px solid var(--gold)',
                color: 'var(--gold)', opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t text-center"
               style={{ borderColor: 'var(--border)' }}>
            <span className="font-mono text-[0.6rem] tracking-[0.1em] uppercase"
                  style={{ color: 'var(--text-mute)' }}>
              Already have an account?{' '}
            </span>
            <Link href="/login"
                  className="font-mono text-[0.6rem] tracking-[0.1em] uppercase"
                  style={{ color: 'var(--gold)' }}>
              Sign in →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

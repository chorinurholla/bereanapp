'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

// Landing page for the Supabase password-recovery link.
//
// Flow: login page calls resetPasswordForEmail({ redirectTo: <this page> }).
// Supabase emails a link carrying a recovery token. When the user lands here,
// supabase-js exchanges that token for a session and fires PASSWORD_RECOVERY.
// That session is what makes updateUser() possible — without it the user has
// no authenticated context in which to change their own password.
//
// NOTE: this route must also be listed under Authentication -> URL Configuration
// -> Redirect URLs in the Supabase dashboard, or the link will be rejected.

type Status = 'checking' | 'ready' | 'invalid' | 'done'

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>('checking')
  const [pw,     setPw]     = useState('')
  const [pw2,    setPw2]    = useState('')
  const [busy,   setBusy]   = useState(false)
  const router = useRouter()
  const sb = createClient()

  // Establish whether we actually have a recovery session before showing a form
  // the user cannot submit. Arriving here directly (bookmark, expired link, or
  // a link already consumed) must fail loudly rather than silently.
  //
  // @supabase/ssr uses the PKCE flow, so the link arrives as ?code=<uuid> rather
  // than a #access_token fragment. detectSessionInUrl normally exchanges that
  // automatically, but we do not rely on it: if no session has appeared and a
  // code is still in the URL, we exchange it ourselves.
  useEffect(() => {
    let settled = false
    const markReady = () => { settled = true; setStatus('ready') }

    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) markReady()
    })

    ;(async () => {
      const { data: { session } } = await sb.auth.getSession()
      if (session) { markReady(); return }

      const code = new URLSearchParams(window.location.search).get('code')
      if (!code) return   // no session and nothing to exchange — timeout handles it

      const { error } = await sb.auth.exchangeCodeForSession(code)
      if (!error) {
        markReady()
        // Strip the code so a refresh doesn't retry an already-spent exchange.
        window.history.replaceState({}, '', '/reset-password')
      } else {
        console.error('exchangeCodeForSession:', error.message)
      }
    })()

    // Exchange is async; give it a moment before declaring the link dead,
    // otherwise a valid link can flash the error state.
    const t = setTimeout(() => { if (!settled) setStatus('invalid') }, 3000)

    return () => { subscription.unsubscribe(); clearTimeout(t) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.length < 6)  { toast.error('Password must be at least 6 characters'); return }
    if (pw !== pw2)     { toast.error('Passwords do not match'); return }

    setBusy(true)
    try {
      const { error } = await sb.auth.updateUser({ password: pw })
      if (error) throw error
      setStatus('done')
      toast.success('Password updated')
      // The recovery session is already a valid session, so send them straight in.
      setTimeout(() => router.push('/devotion'), 1200)
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || 'Could not update password')
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--paper)' }}>

      {/* Left panel — branding (mirrors login) */}
      <div style={{
        width: '420px', flexShrink: 0, background: 'var(--ink)',
        padding: '60px 48px', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
      }} className="hide-on-small">
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '32px',
            fontWeight: 500, color: 'white', letterSpacing: '0.04em', marginBottom: '8px' }}>
            Bere<span style={{ color: 'var(--gold3)' }}>an</span>
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 400,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.45)', marginBottom: '48px' }}>
            Biblical Principles Corpus
          </div>
          <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: '19px',
            lineHeight: 1.8, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic',
            maxWidth: '300px' }}>
            &ldquo;Every chapter of Scripture. One transferable principle. Grounded in the story.&rdquo;
          </p>
        </div>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
          color: 'rgba(255,255,255,0.3)' }}>
          Aloniros Inc. · monskisnote.com
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          <div className="show-on-small" style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px',
              fontWeight: 500, color: 'var(--ink)' }}>
              Bere<span style={{ color: 'var(--gold2)' }}>an</span>
            </div>
          </div>

          {status === 'checking' && (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--ink4)' }}>
              Verifying your reset link…
            </p>
          )}

          {status === 'invalid' && (
            <>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px',
                fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>
                This link is no longer valid
              </h2>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
                color: 'var(--ink4)', lineHeight: 1.7, marginBottom: '24px' }}>
                Password reset links expire, and each one can only be used once.
                Request a fresh link from the sign-in page and it will work.
              </p>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
                color: 'var(--ink5)', lineHeight: 1.7, marginBottom: '24px',
                fontStyle: 'italic' }}>
                If you requested the link on a different device or browser than
                you are using now, open it on the original one — the reset can
                only be completed where it was started.
              </p>
              <button onClick={() => router.push('/login')} className="btn btn-gold"
                style={{ width: '100%', padding: '14px', fontSize: '13px' }}>
                Back to sign in
              </button>
            </>
          )}

          {status === 'done' && (
            <>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px',
                fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>
                Password updated
              </h2>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
                color: 'var(--ink4)', lineHeight: 1.7 }}>
                Taking you to your devotion…
              </p>
            </>
          )}

          {status === 'ready' && (
            <>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px',
                fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>
                Choose a new password
              </h2>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
                color: 'var(--ink4)', marginBottom: '28px' }}>
                Enter it twice so we know it is the one you meant.
              </p>

              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="field-label">New password</label>
                  <input type="password" value={pw} onChange={e => setPw(e.target.value)}
                    placeholder="Minimum 6 characters" autoComplete="new-password"
                    className="input-field" style={{ padding: '12px 16px' }} />
                </div>
                <div>
                  <label className="field-label">Confirm new password</label>
                  <input type="password" value={pw2} onChange={e => setPw2(e.target.value)}
                    autoComplete="new-password"
                    className="input-field" style={{ padding: '12px 16px' }} />
                </div>
                <button type="submit" disabled={busy} className="btn btn-gold"
                  style={{ width: '100%', padding: '14px', fontSize: '13px', marginTop: '4px' }}>
                  {busy ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
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

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { login } from '../api/auth';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [showPass,  setShowPass]  = useState(false);
  const [mounted,   setMounted]   = useState(false);

  // Focus trap refs
  const firstFocusRef = useRef<HTMLInputElement>(null);
  const lastFocusRef  = useRef<HTMLButtonElement>(null);
  const cardRef       = useRef<HTMLDivElement>(null);

  // Entrance animation
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Auto-focus on mount
  useEffect(() => {
    const id = setTimeout(() => firstFocusRef.current?.focus(), 80);
    return () => clearTimeout(id);
  }, []);

  // Focus trap: keep Tab/Shift+Tab inside the card
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const focusable = cardRef.current?.querySelectorAll<HTMLElement>(
      'input, button, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Try again.');
      // Return focus to email field on error
      setTimeout(() => firstFocusRef.current?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden grid-bg"
      style={{ background: '#010828' }}
      role="main"
    >
      <div className="texture-overlay" aria-hidden />
      <div className="blob w-96 h-96 top-0 -left-32"       style={{ background: '#6FFF00' }} aria-hidden />
      <div className="blob w-80 h-80 bottom-0 right-0"     style={{ background: '#1a3aff' }} aria-hidden />
      <div className="blob w-64 h-64 top-1/2 right-1/4"    style={{ background: '#6FFF00', opacity: 0.06 }} aria-hidden />
      <div className="scan-line" aria-hidden />

      {/* Animated card wrapper */}
      <div
        className="relative z-10 w-full max-w-md mx-4 transition-all duration-500"
        style={{
          opacity:   mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10" aria-hidden>
          <div className="relative w-10 h-10">
            <div
              className="absolute inset-0 rounded-full border border-neon opacity-50"
              style={{ animation: 'ping 2.2s cubic-bezier(0,0,0.2,1) infinite' }}
            />
            <div className="absolute inset-1.5 rounded-full bg-neon" />
          </div>
          <span className="font-grotesk text-cream text-2xl tracking-widest uppercase">IRTDP</span>
        </div>

        {/* Glass panel with focus trap */}
        <div
          ref={cardRef}
          className="glass p-8 md:p-10"
          onKeyDown={handleKeyDown}
          role="region"
          aria-label="Sign in form"
        >
          {/* Header */}
          <div className="mb-8">
            <div className="font-condiment text-neon text-xl tracking-widest mb-1">Secure access</div>
            <h1 className="font-grotesk text-cream text-4xl uppercase leading-none">
              Sign<br /><span className="text-neon">In</span>
            </h1>
            <p className="font-mono text-cream/30 text-xs mt-3 leading-relaxed">
              Authenticate to access the IRTDP incident management platform.
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div
              className="mb-6 flex items-start gap-3 rounded-xl px-4 py-3"
              style={{ background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.28)' }}
              role="alert"
              aria-live="assertive"
            >
              <span className="text-red-400 text-base mt-0.5 shrink-0" aria-hidden>⚠</span>
              <span className="font-mono text-red-400 text-xs leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div>
              <label
                htmlFor="irtdp-email"
                className="font-mono text-cream/40 text-xs tracking-widest uppercase block mb-2"
              >
                Email
              </label>
              <input
                id="irtdp-email"
                ref={firstFocusRef}
                className="input-glass"
                type="email"
                placeholder="admin@irtdp.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                disabled={loading}
                aria-required="true"
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="irtdp-password"
                className="font-mono text-cream/40 text-xs tracking-widest uppercase block mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="irtdp-password"
                  className="input-glass pr-14"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  aria-required="true"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-cream/30 hover:text-cream/70 transition-colors tracking-widest px-2 py-1 rounded focus-visible:outline-neon"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  aria-pressed={showPass}
                >
                  {showPass ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              ref={lastFocusRef}
              type="submit"
              disabled={loading}
              className="btn-neon w-full flex items-center justify-center gap-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Authenticating…
                </>
              ) : '🔐 Sign In'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse" aria-hidden />
              <span className="font-mono text-cream/20 text-[10px] tracking-widest">
                IRTDP v2.4.1 — All transmissions encrypted
              </span>
            </div>
          </div>
        </div>

        <p className="text-center font-mono text-cream/12 text-[10px] mt-5 tracking-wider">
          Incident Real-Time Detection Platform
        </p>
      </div>
    </div>
  );
}

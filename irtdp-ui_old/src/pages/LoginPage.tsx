// filepath: src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useLoading } from '../context/LoadingContext';
import { useError } from '../context/ErrorContext';

export function LoginPage() {
  const [email, setEmail] = useState('admin@irtdp.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const { startLoading, stopLoading } = useLoading();
  const { addError } = useError();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    startLoading();

    try {
      const response = await api.post<{ accessToken: string }>('/auth/login', { email, password });
      localStorage.setItem('token', response.accessToken);
      navigate('/dashboard');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      addError({ message: errorMessage, type: 'error' });
    } finally {
      setIsSubmitting(false);
      stopLoading();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 mb-4">
            <span className="text-3xl">🛡️</span>
          </div>
          <h1 className="text-3xl font-bold text-white">IRTDP</h1>
          <p className="text-indigo-300 mt-1">Incident Response & Tracking</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white text-center mb-6">Secure Login</h2>
          
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-indigo-200 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@irtdp.com"
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-indigo-200 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98]"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Authenticating...
                </span>
              ) : (
                'Access System'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-indigo-300/60">
            Demo: admin@irtdp.com / admin123
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
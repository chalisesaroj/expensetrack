import React, { useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { useBudget } from '../context/BudgetContext';
import { PWAInstallButton } from './PWAInstallButton';

export const AuthScreen: React.FC = () => {
  const { showToast } = useBudget();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const supabase = getSupabase();
    if (!supabase) {
      setErrorMessage('Supabase is not configured properly.');
      return;
    }

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        if (data.session) {
          showToast('Account created and signed in!');
        } else if (data.user) {
          setSuccessMessage(
            'Account created! If you have email confirmation enabled in Supabase, check your inbox. If you disabled "Confirm email", you can now switch to Sign in.'
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        showToast('Signed in successfully!');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      console.error('Auth error:', err);
      if (msg.toLowerCase().includes('email not confirmed')) {
        setErrorMessage(
          'Email not confirmed. Check your email inbox or disable "Confirm email" in Supabase: Authentication → Providers → Email.'
        );
      } else if (msg.toLowerCase().includes('invalid login credentials')) {
        setErrorMessage('Invalid email or password. Please check your credentials or click "Create account".');
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="app" style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <header className="top" style={{ textAlign: 'center', justifyContent: 'center', marginBottom: 20, flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 32 }}>Budget Book</h1>
          <p className="sub" style={{ fontSize: 15, marginTop: 6 }}>
            Sign in to access your personal cloud ledger.
          </p>
        </div>
        <PWAInstallButton />
      </header>

      <div className="card stack" style={{ maxWidth: 440, margin: '0 auto', width: '100%' }}>
        <div className="row-between" style={{ borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
          <h2>{mode === 'signin' ? 'Sign In' : 'Create Account'}</h2>
          <button
            type="button"
            className="btn small"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
          >
            {mode === 'signin' ? 'Need an account? Sign up' : 'Already registered? Sign in'}
          </button>
        </div>

        {errorMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              background: 'var(--bad-bg)',
              color: 'var(--bad)',
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              background: 'var(--good-bg)',
              color: 'var(--good)',
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="stack" style={{ gap: 14 }}>
          <label className="f" htmlFor="auth-email">
            Email address
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="f" htmlFor="auth-password">
            Password
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            className="btn primary"
            style={{ marginTop: 8, padding: '11px 16px', fontSize: 15 }}
            disabled={loading}
          >
            {loading ? 'Authenticating…' : mode === 'signin' ? 'Sign In to Ledger' : 'Create Account'}
          </button>
        </form>

        <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: 8 }}>
          All data is strictly stored in your private Supabase PostgreSQL database. Only authenticated sessions can view or edit records.
        </p>
      </div>
    </div>
  );
};

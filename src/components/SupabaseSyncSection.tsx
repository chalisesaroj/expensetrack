import React, { useState, useEffect } from 'react';
import {
  getSupabase,
  getSupabaseCredentials,
  saveCustomSupabaseCredentials,
  resetToDefaultSupabaseCredentials,
  fetchRemoteBudgetData,
  pushFullBudgetToSupabase,
} from '../lib/supabase';
import { useBudget } from '../context/BudgetContext';
import type { User } from '@supabase/supabase-js';

export const SupabaseSyncSection: React.FC = () => {
  const { cats, spends, cfg, restoreData, showToast } = useBudget();

  const [creds, setCreds] = useState(getSupabaseCredentials);
  const [urlInput, setUrlInput] = useState(creds.url);
  const [keyInput, setKeyInput] = useState(creds.key);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showConfig, setShowConfig] = useState(!creds.isConfigured);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'error' | 'success' | 'warn' } | null>(null);

  // Check auth state on mount and creds change
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setUser(null);
      return;
    }

    supabase.auth.getUser().then(({ data, error }) => {
      if (!error && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [creds]);

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    saveCustomSupabaseCredentials(urlInput, keyInput);
    const updated = getSupabaseCredentials();
    setCreds(updated);
    if (updated.isConfigured) {
      showToast('Supabase connection details saved.');
      setShowConfig(false);
    } else {
      showToast('Switched back to local-only storage.');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    const supabase = getSupabase();
    if (!supabase) {
      setStatusMsg({
        text: 'Please configure your Supabase Project URL and Anon Public Key first.',
        type: 'error',
      });
      return;
    }
    if (!email.trim() || !password) {
      setStatusMsg({
        text: 'Please enter both an email address and a password.',
        type: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        if (data.session) {
          setStatusMsg({
            text: 'Account created and signed in successfully!',
            type: 'success',
          });
          showToast('Account created and signed in!');
        } else if (data.user && !data.session) {
          setStatusMsg({
            text: `Account created for ${data.user.email}! Supabase requires email verification. Check your inbox (or turn OFF "Confirm email" in Supabase: Dashboard → Authentication → Providers → Email).`,
            type: 'warn',
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setStatusMsg({
          text: 'Signed in successfully!',
          type: 'success',
        });
        showToast('Signed in to Supabase!');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      console.error('Supabase Auth error:', err);
      if (msg.toLowerCase().includes('email not confirmed')) {
        setStatusMsg({
          text: 'Email not confirmed yet. To fix this instantly: Go to Supabase Dashboard → Authentication → Providers → Email → uncheck "Confirm email" and click Save.',
          type: 'error',
        });
      } else if (msg.toLowerCase().includes('failed to fetch')) {
        setStatusMsg({
          text: 'Network error connecting to Supabase. Check that your Project URL and Anon Key are correct and you are online.',
          type: 'error',
        });
      } else {
        setStatusMsg({
          text: msg,
          type: 'error',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setStatusMsg(null);
    const supabase = getSupabase();
    if (!supabase) {
      setStatusMsg({
        text: 'Please enter your Supabase URL & Anon Key first.',
        type: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      if (data.user) {
        setStatusMsg({
          text: 'Signed in as Guest!',
          type: 'success',
        });
        showToast('Signed in as Guest!');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Guest sign-in failed';
      setStatusMsg({
        text: `${msg}. (To use guest login, enable Anonymous Sign-ins in Supabase: Authentication → Providers → Anonymous)`,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
      setUser(null);
      setStatusMsg(null);
      showToast('Signed out from Supabase');
    }
  };

  const handleSyncToCloud = async () => {
    if (!user) {
      showToast('Sign in first to sync data to your cloud database.');
      return;
    }
    setLoading(true);
    try {
      const res = await pushFullBudgetToSupabase(user.id, cats, spends, cfg);
      showToast(`Successfully synced: ${res.catsCount} categories and ${res.spendsCount} expenses to Supabase!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      console.error('Sync failed:', err);
      showToast('Error syncing to cloud: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePullFromCloud = async () => {
    if (!user) {
      showToast('Sign in first to pull data from your cloud database.');
      return;
    }
    setLoading(true);
    try {
      const remote = await fetchRemoteBudgetData(user.id);
      if (!remote || !remote.cats) {
        showToast('No existing budget found in your cloud database.');
        return;
      }
      restoreData({
        cats: remote.cats.length ? remote.cats : cats,
        spends: remote.spends || [],
        cfg: remote.cfg || cfg,
      });
      showToast('Loaded latest data from Supabase!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fetch failed';
      showToast('Error pulling from cloud: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card stack">
      <div className="row-between">
        <div>
          <h2>Cloud Database (Supabase)</h2>
          <span className="muted" style={{ fontSize: 13 }}>
            Free PostgreSQL cloud database. Persists your data across all phones, tablets, and computers.
          </span>
        </div>
        <button
          type="button"
          className="btn small"
          onClick={() => setShowConfig((prev) => !prev)}
        >
          {showConfig ? 'Hide connection settings' : creds.isConfigured ? 'Edit connection' : 'Connect Supabase'}
        </button>
      </div>

      {showConfig && (
        <form onSubmit={handleSaveCredentials} className="stack" style={{ border: '1px dashed var(--line)', padding: 14, borderRadius: 8 }}>
          <p className="muted" style={{ fontSize: 13 }}>
            Create a free project at <b>supabase.com</b> (no credit card needed). Find these in <b>Project Settings → API</b>.
          </p>
          <div className="formgrid">
            <label className="f" htmlFor="sb-url">
              Project URL
              <input
                id="sb-url"
                placeholder="https://xyzcompany.supabase.co"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
            </label>
            <label className="f wide" htmlFor="sb-key">
              Anon Public Key
              <input
                id="sb-key"
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
              />
            </label>
            <div className="btnrow" style={{ alignItems: 'flex-end' }}>
              <button type="submit" className="btn primary">
                Save connection
              </button>
              <button
                type="button"
                className="btn small"
                onClick={() => {
                  resetToDefaultSupabaseCredentials();
                  const updated = getSupabaseCredentials();
                  setCreds(updated);
                  setUrlInput(updated.url);
                  setKeyInput(updated.key);
                  showToast('Reset to default project credentials.');
                }}
              >
                Reset to default
              </button>
            </div>
          </div>
        </form>
      )}

      {creds.isConfigured ? (
        <div className="stack" style={{ gap: 12 }}>
          {user ? (
            <div className="row-between" style={{ alignItems: 'center', background: 'var(--surface-2)', padding: '10px 14px', borderRadius: 8 }}>
              <div>
                <span className="label" style={{ display: 'block' }}>Connected User</span>
                <b>{user.email || 'Guest User (' + user.id.slice(0, 8) + '...)'}</b>
                <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  Local data: <b>{cats.length}</b> categories · <b>{spends.length}</b> expenses (Auto-sync active)
                </p>
              </div>
              <div className="btnrow">
                <button
                  type="button"
                  className="btn primary small"
                  disabled={loading}
                  onClick={handleSyncToCloud}
                >
                  {loading ? 'Syncing…' : 'Push local to Cloud'}
                </button>
                <button
                  type="button"
                  className="btn small"
                  disabled={loading}
                  onClick={handlePullFromCloud}
                >
                  Pull from Cloud
                </button>
                <button
                  type="button"
                  className="btn small"
                  onClick={handleSignOut}
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAuth} className="stack" style={{ border: '1px solid var(--line)', padding: 14, borderRadius: 8 }}>
              <div className="row-between">
                <h3>{authMode === 'signin' ? 'Sign in with your account' : 'Create new cloud account'}</h3>
                <button
                  type="button"
                  className="btn small"
                  onClick={() => {
                    setAuthMode((m) => (m === 'signin' ? 'signup' : 'signin'));
                    setStatusMsg(null);
                  }}
                >
                  {authMode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
                </button>
              </div>

              {statusMsg && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    fontSize: 13,
                    background:
                      statusMsg.type === 'error'
                        ? 'var(--bad-bg)'
                        : statusMsg.type === 'warn'
                        ? 'var(--warn-bg)'
                        : 'var(--good-bg)',
                    color:
                      statusMsg.type === 'error'
                        ? 'var(--bad)'
                        : statusMsg.type === 'warn'
                        ? 'var(--warn)'
                        : 'var(--good)',
                    lineHeight: 1.4,
                  }}
                >
                  {statusMsg.text}
                </div>
              )}

              <div className="formgrid">
                <label className="f" htmlFor="sb-email">
                  Email
                  <input
                    id="sb-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label className="f" htmlFor="sb-pass">
                  Password
                  <input
                    id="sb-pass"
                    type="password"
                    autoComplete="current-password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                <button type="submit" className="btn primary" disabled={loading}>
                  {loading ? 'Please wait…' : authMode === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              </div>

              <div className="row-between" style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 4 }}>
                <span className="muted" style={{ fontSize: 12 }}>
                  Tip: In Supabase Dashboard, disable <b>Confirm email</b> under <i>Authentication → Providers → Email</i> to allow instant logins without email verification.
                </span>
                <button
                  type="button"
                  className="btn small"
                  disabled={loading}
                  onClick={handleAnonymousSignIn}
                  title="Sign in instantly without email or password"
                >
                  Sign in as Guest
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--muted)', background: 'var(--surface-2)', padding: 12, borderRadius: 6 }}>
          <b>Currently running on Local Storage.</b> Your data is stored directly in this device's browser. To sync across multiple devices for free, click <b>Connect Supabase</b> above.
        </div>
      )}
    </section>
  );
};

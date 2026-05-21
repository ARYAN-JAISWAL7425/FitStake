import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Mail, Lock, Dumbbell, Eye, EyeOff } from 'lucide-react';
import { StatusBar } from '../components/StatusBar';
import { Button } from '../components/Button';
import { routes } from '../lib/routes';
import { api, ApiError } from '../lib/api';
import { setToken, setStoredUser, AuthUser } from '../lib/auth';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.includes('@') && password.length >= 6 && !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const { token, user } = await api.post<{ token: string; user: AuthUser }>(
        '/auth/login',
        { email, password },
        { skipAuth: true }
      );
      setToken(token);
      setStoredUser(user);
      // Returning user → land on Home. New user flow is via Register → GoalSetup.
      navigate(routes.home);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full w-full bg-surface-primary flex flex-col">
      <StatusBar />
      <form onSubmit={submit} className="flex-1 flex flex-col px-6 pt-6 pb-8 overflow-y-auto no-scrollbar">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <div className="w-7 h-7 rounded-lg bg-fg-primary grid place-items-center">
            <Dumbbell className="w-4 h-4 text-accent-lime" strokeWidth={2.5} />
          </div>
          <span className="font-h font-bold text-[18px] tracking-tight text-fg-primary">FitStake</span>
        </div>

        <h1 className="font-h font-bold text-[28px] -tracking-tight text-fg-primary mb-2">Welcome back</h1>
        <p className="text-[13px] text-fg-secondary mb-7">Sign in to continue your cycle.</p>

        {/* Email */}
        <label className="text-[11px] font-semibold tracking-wider text-fg-muted mb-1.5">EMAIL</label>
        <div className="rounded-xl bg-surface-card border border-border-soft flex items-center gap-2 px-3.5 mb-3.5 focus-within:border-fg-primary transition">
          <Mail className="w-4 h-4 text-fg-muted" strokeWidth={2.2} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 py-3.5 bg-transparent text-[14px] text-fg-primary placeholder:text-fg-muted outline-none"
            autoComplete="email"
          />
        </div>

        {/* Password */}
        <label className="text-[11px] font-semibold tracking-wider text-fg-muted mb-1.5">PASSWORD</label>
        <div className="rounded-xl bg-surface-card border border-border-soft flex items-center gap-2 px-3.5 mb-2.5 focus-within:border-fg-primary transition">
          <Lock className="w-4 h-4 text-fg-muted" strokeWidth={2.2} />
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="flex-1 py-3.5 bg-transparent text-[14px] text-fg-primary placeholder:text-fg-muted outline-none"
            autoComplete="current-password"
          />
          <button type="button" onClick={() => setShowPw((s) => !s)} className="text-fg-muted">
            {showPw ? <EyeOff className="w-4 h-4" strokeWidth={2.2} /> : <Eye className="w-4 h-4" strokeWidth={2.2} />}
          </button>
        </div>

        <div className="flex justify-end mb-6">
          <Link to={routes.forgotPassword} className="text-[12px] font-medium text-accent-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-warning/10 border border-warning/30 px-3.5 py-2.5 text-[12px] text-warning font-medium">
            {error}
          </div>
        )}

        <Button type="submit" variant="primary" iconRight={ArrowRight} disabled={!canSubmit} className="w-full">
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>

        <div className="text-center text-[13px] text-fg-secondary mt-6">
          New here?{' '}
          <Link to={routes.register} className="font-semibold text-fg-primary hover:underline">
            Create an account
          </Link>
        </div>
      </form>
    </div>
  );
}

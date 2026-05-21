import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Mail, Lock, Dumbbell, Eye, EyeOff, User, ArrowLeft } from 'lucide-react';
import { StatusBar } from '../components/StatusBar';
import { Button } from '../components/Button';
import { routes } from '../lib/routes';
import { api, ApiError } from '../lib/api';
import { setToken, setStoredUser, AuthUser } from '../lib/auth';

export function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = name.trim().length >= 2 && email.includes('@') && password.length >= 6 && !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const { token, user } = await api.post<{ token: string; user: AuthUser }>(
        '/auth/register',
        { name: name.trim(), email, password },
        { skipAuth: true }
      );
      setToken(token);
      setStoredUser(user);
      navigate(routes.goalSetup);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full w-full bg-surface-primary flex flex-col">
      <StatusBar />
      <form onSubmit={submit} className="flex-1 flex flex-col px-6 pt-4 pb-8 overflow-y-auto no-scrollbar">
        {/* Back */}
        <Link to={routes.login} className="w-10 h-10 rounded-full bg-surface-card border border-border-soft grid place-items-center mb-4 hover:bg-surface-secondary/40 transition">
          <ArrowLeft className="w-[18px] h-[18px] text-fg-primary" strokeWidth={2.2} />
        </Link>

        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-lg bg-fg-primary grid place-items-center">
            <Dumbbell className="w-4 h-4 text-accent-lime" strokeWidth={2.5} />
          </div>
          <span className="font-h font-bold text-[18px] tracking-tight text-fg-primary">FitStake</span>
        </div>

        <h1 className="font-h font-bold text-[28px] -tracking-tight text-fg-primary mb-2">Create account</h1>
        <p className="text-[13px] text-fg-secondary mb-6">Stake on yourself. Show up for 30 days.</p>

        {/* Name */}
        <label className="text-[11px] font-semibold tracking-wider text-fg-muted mb-1.5">NAME</label>
        <div className="rounded-xl bg-surface-card border border-border-soft flex items-center gap-2 px-3.5 mb-3 focus-within:border-fg-primary transition">
          <User className="w-4 h-4 text-fg-muted" strokeWidth={2.2} />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="flex-1 py-3.5 bg-transparent text-[14px] text-fg-primary placeholder:text-fg-muted outline-none"
            autoComplete="name"
          />
        </div>

        {/* Email */}
        <label className="text-[11px] font-semibold tracking-wider text-fg-muted mb-1.5">EMAIL</label>
        <div className="rounded-xl bg-surface-card border border-border-soft flex items-center gap-2 px-3.5 mb-3 focus-within:border-fg-primary transition">
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
        <div className="rounded-xl bg-surface-card border border-border-soft flex items-center gap-2 px-3.5 mb-2 focus-within:border-fg-primary transition">
          <Lock className="w-4 h-4 text-fg-muted" strokeWidth={2.2} />
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="flex-1 py-3.5 bg-transparent text-[14px] text-fg-primary placeholder:text-fg-muted outline-none"
            autoComplete="new-password"
          />
          <button type="button" onClick={() => setShowPw((s) => !s)} className="text-fg-muted">
            {showPw ? <EyeOff className="w-4 h-4" strokeWidth={2.2} /> : <Eye className="w-4 h-4" strokeWidth={2.2} />}
          </button>
        </div>

        <p className="text-[11px] text-fg-muted mb-6 leading-snug">
          By creating an account you agree to the FitStake terms and privacy policy. Real money stakes are governed by Indian law (DPDP-compliant).
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-warning/10 border border-warning/30 px-3.5 py-2.5 text-[12px] text-warning font-medium">
            {error}
          </div>
        )}

        <Button type="submit" variant="primary" iconRight={ArrowRight} disabled={!canSubmit} className="w-full">
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>

        <div className="text-center text-[13px] text-fg-secondary mt-6">
          Already have an account?{' '}
          <Link to={routes.login} className="font-semibold text-fg-primary hover:underline">
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}

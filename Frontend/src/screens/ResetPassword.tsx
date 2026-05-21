import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Lock, CircleCheck } from 'lucide-react';
import { StatusBar } from '../components/StatusBar';
import { Button } from '../components/Button';
import { routes } from '../lib/routes';
import { api, ApiError } from '../lib/api';
import { setToken, setStoredUser, AuthUser } from '../lib/auth';

export function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const canSubmit = pw.length >= 6 && pw === pw2 && !submitting && token.length >= 20;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<{ token: string; user: AuthUser }>('/auth/reset-password', { token, password: pw }, { skipAuth: true });
      setToken(res.token);
      setStoredUser(res.user);
      setDone(true);
      setTimeout(() => navigate(routes.home), 1200);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full w-full bg-surface-primary flex flex-col">
      <StatusBar />
      <form onSubmit={submit} className="flex-1 flex flex-col px-6 pt-4 pb-8 overflow-y-auto no-scrollbar">
        <Link to={routes.login} className="w-10 h-10 rounded-full bg-surface-card border border-border-soft grid place-items-center mb-6 hover:bg-surface-secondary/40 transition">
          <ArrowLeft className="w-[18px] h-[18px] text-fg-primary" strokeWidth={2.2} />
        </Link>

        <h1 className="font-h font-bold text-[28px] -tracking-tight text-fg-primary mb-2">Set a new password</h1>
        <p className="text-[13px] text-fg-secondary mb-7">
          {email ? <>For <span className="font-semibold text-fg-primary">{email}</span>.</> : 'For your FitStake account.'} Min 6 characters.
        </p>

        {!done ? (
          <>
            <label className="text-[11px] font-semibold tracking-wider text-fg-muted mb-1.5">NEW PASSWORD</label>
            <div className="rounded-xl bg-surface-card border border-border-soft flex items-center gap-2 px-3.5 mb-3 focus-within:border-fg-primary transition">
              <Lock className="w-4 h-4 text-fg-muted" strokeWidth={2.2} />
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="flex-1 py-3.5 bg-transparent text-[14px] text-fg-primary outline-none"
                autoComplete="new-password"
                autoFocus
              />
            </div>
            <label className="text-[11px] font-semibold tracking-wider text-fg-muted mb-1.5">CONFIRM PASSWORD</label>
            <div className="rounded-xl bg-surface-card border border-border-soft flex items-center gap-2 px-3.5 mb-6 focus-within:border-fg-primary transition">
              <Lock className="w-4 h-4 text-fg-muted" strokeWidth={2.2} />
              <input
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                className="flex-1 py-3.5 bg-transparent text-[14px] text-fg-primary outline-none"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="mb-3 rounded-xl bg-warning/10 border border-warning/30 px-3.5 py-2.5 text-[12px] text-warning font-medium">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" disabled={!canSubmit} className="w-full">
              {submitting ? 'Resetting…' : 'Reset password'}
            </Button>
          </>
        ) : (
          <div className="rounded-[20px] bg-surface-card border border-border-soft p-5 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-accent-money/15 grid place-items-center">
              <CircleCheck className="w-7 h-7 text-accent-money" strokeWidth={2.4} />
            </div>
            <div className="font-h font-bold text-[16px] text-fg-primary text-center">Password updated</div>
            <p className="text-[12px] text-fg-secondary text-center">Signing you in…</p>
          </div>
        )}
      </form>
    </div>
  );
}

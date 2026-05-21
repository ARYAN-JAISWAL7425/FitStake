import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, CircleCheck, Send } from 'lucide-react';
import { StatusBar } from '../components/StatusBar';
import { Button } from '../components/Button';
import { routes } from '../lib/routes';
import { api, ApiError } from '../lib/api';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.includes('@') && !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email }, { skipAuth: true });
      setSent(true);
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
        <Link to={routes.login} className="w-10 h-10 rounded-full bg-surface-card border border-border-soft grid place-items-center mb-6 hover:bg-surface-secondary/40 transition">
          <ArrowLeft className="w-[18px] h-[18px] text-fg-primary" strokeWidth={2.2} />
        </Link>

        <h1 className="font-h font-bold text-[28px] -tracking-tight text-fg-primary mb-2">Reset password</h1>
        <p className="text-[13px] text-fg-secondary mb-7">
          Enter the email you signed up with. We'll send you a link to set a new password.
        </p>

        {!sent ? (
          <>
            <label className="text-[11px] font-semibold tracking-wider text-fg-muted mb-1.5">EMAIL</label>
            <div className="rounded-xl bg-surface-card border border-border-soft flex items-center gap-2 px-3.5 mb-6 focus-within:border-fg-primary transition">
              <Mail className="w-4 h-4 text-fg-muted" strokeWidth={2.2} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 py-3.5 bg-transparent text-[14px] text-fg-primary placeholder:text-fg-muted outline-none"
                autoComplete="email"
                autoFocus
              />
            </div>

            {error && (
              <div className="mb-3 rounded-xl bg-warning/10 border border-warning/30 px-3.5 py-2.5 text-[12px] text-warning font-medium">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" iconRight={Send} disabled={!canSubmit} className="w-full">
              {submitting ? 'Sending…' : 'Send reset link'}
            </Button>
          </>
        ) : (
          <>
            <div className="rounded-[20px] bg-surface-card border border-border-soft p-5 flex flex-col items-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-full bg-accent-money/15 grid place-items-center">
                <CircleCheck className="w-7 h-7 text-accent-money" strokeWidth={2.4} />
              </div>
              <div className="font-h font-bold text-[16px] text-fg-primary text-center">Check your inbox</div>
              <p className="text-[12px] text-fg-secondary text-center leading-snug">
                We've sent a password reset link to <span className="font-semibold text-fg-primary">{email}</span>. The link expires in 30 minutes.
              </p>
            </div>

            <Button to={routes.login} variant="primary" className="w-full">
              Back to sign in
            </Button>

            <button
              type="button"
              onClick={() => setSent(false)}
              className="text-[12px] text-fg-muted font-medium py-3 text-center hover:text-fg-secondary mt-2"
            >
              Use a different email
            </button>
          </>
        )}

        <div className="text-center text-[13px] text-fg-secondary mt-auto pt-6">
          Don't have an account?{' '}
          <Link to={routes.register} className="font-semibold text-fg-primary hover:underline">
            Sign up
          </Link>
        </div>
      </form>
    </div>
  );
}

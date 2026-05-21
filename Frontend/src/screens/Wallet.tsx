import { useEffect, useState } from 'react';
import { Info, Wallet as WalletIcon, Eye, ArrowDown, ArrowUp, CirclePlus, ArrowDownRight, X, CreditCard, Banknote, Zap } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { StatusBar } from '../components/StatusBar';
import { TabBar } from '../components/TabBar';
import { useUser } from '../hooks/useUser';
import { useWallet } from '../hooks/useWallet';
import { routes } from '../lib/routes';
import { api, ApiError } from '../lib/api';
import { getToken, setStoredUser } from '../lib/auth';
import { emit } from '../lib/events';
import {
  openRazorpayCheckout,
  verifyRazorpayPayment,
  startStripeCheckout,
  confirmStripeSession,
  getPaymentProviders,
} from '../lib/payments';
import { mockTransactions } from '../data/mock';
import { isAuthenticated } from '../lib/auth';

type FlowState = null | 'deposit' | 'withdraw';

export function Wallet() {
  const user = useUser();
  const { data: wallet, refetch } = useWallet();
  const [flow, setFlow] = useState<FlowState>(null);
  const [amount, setAmount] = useState('500');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<{ razorpay: boolean; stripe: boolean }>({
    razorpay: false,
    stripe: false,
  });
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    getPaymentProviders().then(setProviders);
  }, []);

  // Handle return from Stripe Checkout.
  useEffect(() => {
    const sessionId = searchParams.get('stripe_session_id');
    if (!sessionId || !getToken()) return;
    setBusy(true);
    confirmStripeSession(sessionId)
      .then((res) => {
        if (res.user) {
          setStoredUser(res.user as never);
          emit('user-changed');
        }
        setSearchParams({}, { replace: true });
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Could not confirm payment.');
        setSearchParams({}, { replace: true });
      })
      .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const balance = wallet ? wallet.balance : user.walletBalance;
  const locked = wallet ? wallet.locked : 0;
  const available = wallet ? wallet.available : user.available;
  // Authenticated: always use real transactions (may be empty for fresh users).
  // Pre-auth demo: fall back to mock so the screen isn't blank.
  const transactions = wallet?.transactions ?? (isAuthenticated() ? [] : mockTransactions);
  const amountN = parseInt(amount || '0', 10);
  const canSubmit = !busy && amountN >= 100 && amountN <= 1000000;

  const openDeposit = () => {
    if (!getToken()) {
      setError('Sign in to deposit money into your wallet.');
      return;
    }
    setError(null);
    setAmount('500');
    setFlow('deposit');
  };
  const openWithdraw = () => {
    if (!getToken()) {
      setError('Sign in to withdraw from your wallet.');
      return;
    }
    setError(null);
    setAmount(String(Math.min(available, 500)));
    setFlow('withdraw');
  };
  const closeFlow = () => {
    setFlow(null);
    setError(null);
  };

  const payRazorpay = async () => {
    setError(null);
    setBusy(true);
    try {
      await openRazorpayCheckout({
        amount: amountN,
        userName: user.name,
        userEmail: (user as { email?: string }).email,
        onSuccess: async ({ orderId, paymentId, signature }) => {
          try {
            const res = await verifyRazorpayPayment({ orderId, paymentId, signature, amount: amountN });
            if (res.user) setStoredUser(res.user as never);
            emit('user-changed');
            refetch();
            closeFlow();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Verification failed.');
          } finally {
            setBusy(false);
          }
        },
        onCancel: () => setBusy(false),
        onError: (err) => {
          setError(err.message);
          setBusy(false);
        },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start Razorpay checkout.');
      setBusy(false);
    }
  };

  const payDemo = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await api.post<{ user: { id: string } & Record<string, unknown> }>(
        '/wallet/demo-credit',
        { amount: amountN }
      );
      if (res.user) setStoredUser(res.user as never);
      emit('user-changed');
      refetch();
      closeFlow();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Demo credit failed.');
    } finally {
      setBusy(false);
    }
  };

  const payStripe = async () => {
    setError(null);
    setBusy(true);
    try {
      const { url } = await startStripeCheckout(amountN);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start Stripe checkout.');
      setBusy(false);
    }
  };

  const submitWithdraw = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await api.post<{ user: { id: string } & Record<string, unknown> }>(
        '/wallet/withdraw',
        { amount: amountN }
      );
      if (res.user) setStoredUser(res.user as never);
      emit('user-changed');
      refetch();
      closeFlow();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Withdrawal failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full w-full bg-surface-primary flex flex-col overflow-hidden">
      <StatusBar />
      <div className="flex-1 px-5 pt-2 pb-[100px] overflow-y-auto no-scrollbar space-y-[18px]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-h font-bold text-[22px] -tracking-tight text-fg-primary">Wallet</h1>
          <Link to={routes.profile} className="w-10 h-10 rounded-full bg-surface-card border border-border-soft grid place-items-center hover:bg-surface-secondary/40 transition">
            <Info className="w-4 h-4 text-fg-primary" strokeWidth={2.2} />
          </Link>
        </div>

        {/* Dark balance card */}
        <div className="rounded-[20px] bg-surface-inverse text-fg-inverse p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <WalletIcon className="w-3.5 h-3.5 text-accent-lime" strokeWidth={2.4} />
              <span className="text-[11px] font-semibold tracking-wider text-white/70">TOTAL BALANCE</span>
            </div>
            <button className="w-7 h-7 rounded-full bg-white/10 grid place-items-center">
              <Eye className="w-3.5 h-3.5 text-white/80" strokeWidth={2.4} />
            </button>
          </div>
          <div className="flex items-end gap-1">
            <span className="font-data font-medium text-[28px] text-white/70">₹</span>
            <span className="font-data font-semibold text-[52px] -tracking-tightest leading-none">{balance.toLocaleString('en-IN')}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/8 p-3.5">
              <div className="text-[11px] font-medium tracking-wide text-white/70">Locked (cycle)</div>
              <div className="font-data font-semibold text-[16px] text-accent-lime mt-1">₹{locked.toLocaleString('en-IN')}</div>
            </div>
            <div className="rounded-xl bg-white/8 p-3.5">
              <div className="text-[11px] font-medium tracking-wide text-white/70">Available</div>
              <div className="font-data font-semibold text-[16px] text-fg-inverse mt-1">₹{available.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>

        {/* Action grid */}
        <div className="grid grid-cols-3 gap-2.5">
          <button onClick={openDeposit} className="rounded-xl bg-accent-lime text-fg-primary py-3.5 px-2 flex flex-col items-center gap-1.5 hover:brightness-95 transition">
            <ArrowDown className="w-5 h-5" strokeWidth={2.4} />
            <span className="text-[12px] font-semibold">Deposit</span>
          </button>
          <button onClick={openWithdraw} className="rounded-xl bg-surface-card border border-border-soft text-fg-primary py-3.5 px-2 flex flex-col items-center gap-1.5 hover:bg-surface-secondary/40 transition">
            <ArrowUp className="w-5 h-5" strokeWidth={2.4} />
            <span className="text-[12px] font-semibold">Withdraw</span>
          </button>
          <Link
            to={routes.planReview}
            className="rounded-xl bg-surface-card border border-border-soft text-fg-primary py-3.5 px-2 flex flex-col items-center gap-1.5 hover:bg-surface-secondary/40 transition"
          >
            <CirclePlus className="w-5 h-5" strokeWidth={2.4} />
            <span className="text-[12px] font-semibold">Start cycle</span>
          </Link>
        </div>

        {/* Flow panel — Deposit or Withdraw */}
        {flow && (
          <div className="rounded-[20px] bg-surface-card border border-border-soft p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="font-h font-bold text-[14px] text-fg-primary">
                {flow === 'deposit' ? 'Add money to wallet' : 'Withdraw from wallet'}
              </div>
              <button onClick={closeFlow} className="w-7 h-7 rounded-full bg-surface-secondary grid place-items-center">
                <X className="w-3.5 h-3.5 text-fg-primary" strokeWidth={2.4} />
              </button>
            </div>

            <label className="text-[10px] font-semibold tracking-wider text-fg-muted">AMOUNT (₹)</label>
            <div className="rounded-xl bg-surface-primary border border-border-soft flex items-center gap-2 px-3.5 focus-within:border-fg-primary transition">
              <span className="text-[14px] font-data text-fg-muted">₹</span>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                className="flex-1 py-3 bg-transparent text-[14px] font-data font-semibold text-fg-primary outline-none"
              />
            </div>

            {flow === 'deposit' && (
              <div className="flex gap-1.5">
                {[500, 1000, 2000, 5000].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAmount(String(c))}
                    className={`flex-1 rounded-full py-1.5 text-[11px] font-semibold transition ${
                      amountN === c
                        ? 'bg-fg-primary text-fg-inverse'
                        : 'bg-surface-secondary text-fg-secondary hover:bg-surface-secondary/70'
                    }`}
                  >
                    ₹{c >= 1000 ? `${c / 1000}k` : c}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-warning/10 border border-warning/30 px-3 py-2 text-[11px] text-warning font-medium">
                {error}
              </div>
            )}

            {flow === 'deposit' ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={payRazorpay}
                  disabled={!canSubmit || !providers.razorpay}
                  className="rounded-full bg-accent-lime text-fg-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Banknote className="w-4 h-4" strokeWidth={2.4} />
                  <span className="text-[13px] font-semibold">
                    {providers.razorpay ? `Pay ₹${amountN.toLocaleString('en-IN')} with Razorpay` : 'Razorpay not configured'}
                  </span>
                </button>
                <button
                  onClick={payStripe}
                  disabled={!canSubmit || !providers.stripe}
                  className="rounded-full bg-surface-secondary text-fg-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CreditCard className="w-4 h-4" strokeWidth={2.4} />
                  <span className="text-[13px] font-semibold">
                    {providers.stripe ? 'Pay with card (Stripe)' : 'Stripe not configured'}
                  </span>
                </button>
                <button
                  onClick={payDemo}
                  disabled={!canSubmit || amountN > 50000}
                  className="rounded-full bg-warning/15 text-warning border border-dashed border-warning/40 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" strokeWidth={2.4} />
                  <span className="text-[13px] font-semibold">
                    {busy ? 'Crediting…' : `Demo credit ₹${amountN.toLocaleString('en-IN')} (skip payment)`}
                  </span>
                </button>
                <p className="text-[10px] text-fg-muted leading-snug pt-1">
                  Demo credit funds your wallet instantly — no real money or test cards needed. Capped at ₹50,000 per call.
                  Both gateways are also in <span className="font-semibold">test mode</span>: Razorpay test card 4111 1111 1111 1111, Stripe test card 4242 4242 4242 4242.
                </p>
              </div>
            ) : (
              <button
                onClick={submitWithdraw}
                disabled={!canSubmit || amountN > available}
                className="rounded-full bg-fg-primary text-fg-inverse py-3 text-[13px] font-semibold disabled:opacity-50"
              >
                {busy ? 'Processing…' : `Withdraw ₹${amountN.toLocaleString('en-IN')}`}
              </button>
            )}
            {flow === 'withdraw' && amountN > available && (
              <p className="text-[10px] text-warning font-medium">Available is ₹{available.toLocaleString('en-IN')}.</p>
            )}
          </div>
        )}

        {/* Activity */}
        <div className="flex items-center justify-between">
          <h2 className="font-h font-semibold text-[17px] -tracking-tight text-fg-primary">Recent activity</h2>
          <Link to={routes.profile} className="text-[13px] font-medium text-accent-primary hover:underline">See all</Link>
        </div>

        <div className="rounded-[20px] bg-surface-card border border-border-soft overflow-hidden">
          {transactions.length === 0 && (
            <div className="px-4 py-6 text-center text-[12px] text-fg-muted">
              No transactions yet — your deposits, stakes and payouts will show here.
            </div>
          )}
          {transactions.map((t, i) => {
            const isLast = i === transactions.length - 1;
            const isLoss = 'kind' in t && (t.kind === 'stake_donate' || t.kind === 'withdraw');
            const Icon = isLoss ? X : ArrowDownRight;
            const iconBg = isLoss ? 'bg-warning/15' : 'bg-surface-secondary';
            const iconColor = isLoss ? 'text-warning' : 'text-accent-primary';
            return (
              <div
                key={t.id}
                className={`flex items-center gap-3 px-4 py-3.5 ${!isLast ? 'border-b border-border-soft' : ''}`}
              >
                <div className={`w-9 h-9 rounded-full grid place-items-center ${iconBg}`}>
                  <Icon className={`w-4 h-4 ${iconColor}`} strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-h font-semibold text-[14px] text-fg-primary truncate">{t.title}</div>
                  <div className="text-[11px] text-fg-muted truncate">{t.subtitle}</div>
                </div>
                <div className={`font-data font-semibold text-[14px] ${t.positive ? 'text-accent-money' : 'text-warning'}`}>
                  {t.amount}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <TabBar />
    </div>
  );
}

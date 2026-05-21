import { useState } from 'react';
import {
  History, Sparkles, TrendingUp, Medal, ChevronRight, Ticket, ShoppingBag, CircleCheck, Info, Lock, X, Copy,
  ShoppingBag as ShoppingBagIcon, Activity, Headphones, Salad, Utensils, GlassWater, CircleDashed, Dumbbell, Watch,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBar } from '../components/StatusBar';
import { TabBar } from '../components/TabBar';
import { useUser } from '../hooks/useUser';
import { useRewards } from '../hooks/useRewards';
import { routes } from '../lib/routes';
import { api, ApiError } from '../lib/api';
import { getToken, setStoredUser } from '../lib/auth';
import { emit } from '../lib/events';

const brandIcon: Record<string, typeof ShoppingBagIcon> = {
  'shopping-bag': ShoppingBagIcon,
  activity: Activity,
  headphones: Headphones,
  salad: Salad,
  utensils: Utensils,
  'glass-water': GlassWater,
  'circle-dashed': CircleDashed,
  dumbbell: Dumbbell,
  watch: Watch,
};

const couponCategories = ['All', 'Fitness', 'Food', 'Wellness', 'Tech'] as const;
const storeCategories = ['All', 'Merch', 'Gear', 'Subscription', 'Experience'] as const;
type Tab = 'coupons' | 'store';

type RedeemTarget =
  | { kind: 'coupon'; id: string; title: string; cost: number; locked?: false }
  | { kind: 'store'; id: string; title: string; cost: number; locked?: boolean; unlockTier?: string };

export function Rewards() {
  const user = useUser();
  const rewards = useRewards();
  const [tab, setTab] = useState<Tab>('coupons');
  const [couponCat, setCouponCat] = useState<(typeof couponCategories)[number]>('All');
  const [storeCat, setStoreCat] = useState<(typeof storeCategories)[number]>('All');
  const [target, setTarget] = useState<RedeemTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const closeModal = () => {
    setTarget(null);
    setError(null);
    setCode(null);
    setCopied(false);
  };

  const openCouponRedeem = (c: typeof rewards.coupons[number]) => {
    if (!getToken()) return;
    setTarget({ kind: 'coupon', id: c.id, title: `${c.brand} · ${c.offer}`, cost: c.cost });
    setError(null);
    setCode(null);
  };

  const openStoreRedeem = (s: typeof rewards.storeItems[number]) => {
    if (!getToken()) return;
    setTarget({ kind: 'store', id: s.id, title: s.title, cost: s.cost, locked: s.locked, unlockTier: s.unlockTier });
    setError(null);
    setCode(null);
  };

  const confirmRedeem = async () => {
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{
        redemption: { id: string; code: string; title: string };
        user: { id: string; fp: number; walletBalance: number; available: number };
      }>('/rewards/redeem', { kind: target.kind, itemId: target.id });
      if (res.user) setStoredUser(res.user as never);
      emit('user-changed');
      setCode(res.redemption.code);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not redeem.');
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {/* clipboard may be unavailable in some browsers */}
  };

  const inBandPct = Math.max(0, Math.min(100, ((user.fp - 2000) / (8000 - 2000)) * 100));

  const filteredCoupons =
    couponCat === 'All' ? rewards.coupons : rewards.coupons.filter((c) => c.category === couponCat);
  const filteredStore =
    storeCat === 'All' ? rewards.storeItems : rewards.storeItems.filter((s) => s.category === storeCat);

  const activeCategories = tab === 'coupons' ? couponCategories : storeCategories;
  const activeCat = tab === 'coupons' ? couponCat : storeCat;
  const setActiveCat = tab === 'coupons' ? setCouponCat : setStoreCat;

  return (
    <div className="h-full w-full bg-surface-primary flex flex-col overflow-hidden">
      <StatusBar />
      <div className="flex-1 px-5 pt-2 pb-[100px] overflow-y-auto no-scrollbar space-y-2.5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-h font-bold text-[22px] -tracking-tight text-fg-primary">Rewards</h1>
          <Link to={routes.wallet} className="w-10 h-10 rounded-full bg-surface-card border border-border-soft grid place-items-center hover:bg-surface-secondary/40 transition">
            <History className="w-[18px] h-[18px] text-fg-primary" strokeWidth={2.2} />
          </Link>
        </div>

        {/* Dark FP card */}
        <div className="rounded-[20px] bg-surface-inverse text-fg-inverse p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent-lime" strokeWidth={2.4} />
              <span className="text-[11px] font-semibold tracking-wider text-white/70">FITNESS POINTS</span>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
              <TrendingUp className="w-3 h-3 text-accent-money" strokeWidth={2.4} />
              <span className="text-[11px] font-semibold text-accent-lime">+{user.fpEarnedToday} today</span>
            </div>
          </div>
          <div className="flex items-end gap-1.5">
            <span className="font-data font-bold text-[52px] -tracking-tightest leading-none">{user.fp.toLocaleString('en-IN')}</span>
            <span className="text-[18px] text-white/70 font-medium pb-1.5">FP</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-accent-lime rounded-full transition-all" style={{ width: `${inBandPct}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/80">{user.tier} tier</span>
              <span className="text-[11px] text-accent-lime">{user.fpToNextTier.toLocaleString('en-IN')} FP to {user.nextTier}</span>
            </div>
          </div>
        </div>

        {/* Tier perks chip card */}
        <Link to={routes.profile} className="rounded-[20px] bg-surface-secondary p-3 flex flex-col gap-2.5 hover:brightness-[0.98] transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Medal className="w-3.5 h-3.5 text-accent-primary" strokeWidth={2.4} />
              <span className="font-h font-bold text-[12px] text-fg-primary">{user.tier} tier perks active</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-fg-secondary" strokeWidth={2.2} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {rewards.perks.map((p) => (
              <span key={p} className="rounded-full bg-surface-card text-fg-primary px-2.5 py-1 text-[10px] font-semibold">
                {p}
              </span>
            ))}
          </div>
        </Link>

        {/* Coupons | Store tabs — now CLICKABLE */}
        <div className="rounded-full bg-surface-card border border-border-soft p-1 flex gap-1">
          <button
            type="button"
            onClick={() => setTab('coupons')}
            className={`flex-1 rounded-full py-2 px-3.5 flex items-center justify-center gap-1.5 text-[12px] transition ${
              tab === 'coupons' ? 'bg-fg-primary text-fg-inverse font-bold' : 'text-fg-secondary font-medium hover:bg-surface-secondary/30'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" strokeWidth={2.4} />
            <span>Coupons · {rewards.couponsCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('store')}
            className={`flex-1 rounded-full py-2 px-3.5 flex items-center justify-center gap-1.5 text-[12px] transition ${
              tab === 'store' ? 'bg-fg-primary text-fg-inverse font-bold' : 'text-fg-secondary font-medium hover:bg-surface-secondary/30'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" strokeWidth={2.4} />
            <span>Store · {rewards.storeCount}</span>
          </button>
        </div>

        {/* Category filter pills — now CLICKABLE */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {activeCategories.map((c) => {
            const active = activeCat === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setActiveCat(c as never)}
                className={`shrink-0 rounded-full px-3 py-[7px] text-[11px] font-semibold transition ${
                  active
                    ? 'bg-fg-primary text-fg-inverse'
                    : 'bg-surface-card border border-border-soft text-fg-secondary hover:bg-surface-secondary/30'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* Content list — switches based on tab */}
        {tab === 'coupons' ? (
          <div className="flex flex-col gap-1.5">
            {filteredCoupons.length === 0 && (
              <div className="rounded-[20px] bg-surface-card border border-border-soft p-6 text-center text-[12px] text-fg-muted">
                No coupons in this category yet.
              </div>
            )}
            {filteredCoupons.map((c) => {
              const Icon = brandIcon[c.icon] ?? ShoppingBagIcon;
              const canAfford = user.fp >= c.cost;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openCouponRedeem(c)}
                  disabled={!canAfford}
                  className="text-left rounded-[20px] bg-surface-card border border-border-soft p-3.5 flex items-center gap-3.5 hover:bg-surface-secondary/20 transition disabled:opacity-70"
                >
                  <div className="w-12 h-12 rounded-xl grid place-items-center shrink-0" style={{ backgroundColor: c.brandColor }}>
                    <Icon className="w-[22px] h-[22px] text-fg-inverse" strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="font-h font-bold text-fg-primary">{c.brand}</span>
                      <span className="text-fg-muted">·</span>
                      <span className="text-fg-muted">{c.expires}</span>
                    </div>
                    <div className="font-h font-semibold text-[13px] text-fg-primary mt-0.5">{c.offer}</div>
                    <div className={`flex items-center gap-1 text-[10px] font-semibold mt-1 ${canAfford ? 'text-accent-money' : 'text-fg-muted'}`}>
                      <CircleCheck className="w-2.5 h-2.5" strokeWidth={2.4} />
                      <span>{canAfford ? 'Available now' : `Need ${(c.cost - user.fp).toLocaleString('en-IN')} more FP`}</span>
                    </div>
                  </div>
                  <div className="rounded-full bg-accent-lime px-3 py-1.5 flex items-center gap-1 shrink-0">
                    <Sparkles className="w-2.5 h-2.5 text-fg-primary" strokeWidth={2.4} />
                    <span className="font-data font-bold text-[12px] text-fg-primary">{c.cost}</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filteredStore.length === 0 && (
              <div className="rounded-[20px] bg-surface-card border border-border-soft p-6 text-center text-[12px] text-fg-muted">
                No items in this category yet.
              </div>
            )}
            {filteredStore.map((s) => {
              const Icon = brandIcon[s.icon] ?? ShoppingBagIcon;
              const canAfford = user.fp >= s.cost && !s.locked;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => openStoreRedeem(s)}
                  disabled={!canAfford}
                  className="text-left rounded-[20px] bg-surface-card border border-border-soft p-3.5 flex items-center gap-3.5 hover:bg-surface-secondary/20 transition disabled:opacity-70"
                >
                  <div className="w-12 h-12 rounded-xl bg-surface-secondary grid place-items-center shrink-0">
                    <Icon className="w-[22px] h-[22px] text-fg-primary" strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold tracking-wider text-fg-muted">{s.category.toUpperCase()}</div>
                    <div className="font-h font-semibold text-[13px] text-fg-primary mt-0.5">{s.title}</div>
                    <div className="text-[10px] text-fg-muted">{s.subtitle}</div>
                    <div className={`flex items-center gap-1 text-[10px] font-semibold mt-1 ${s.locked ? 'text-fg-muted' : canAfford ? 'text-accent-money' : 'text-fg-muted'}`}>
                      {s.locked ? <Lock className="w-2.5 h-2.5" strokeWidth={2.4} /> : <CircleCheck className="w-2.5 h-2.5" strokeWidth={2.4} />}
                      <span>
                        {s.locked
                          ? `Reach ${s.unlockTier} tier first`
                          : canAfford
                          ? 'Available now'
                          : s.cyclesToUnlock != null && s.cyclesToUnlock > 0
                          ? `≈ ${s.cyclesToUnlock} more successful cycle${s.cyclesToUnlock === 1 ? '' : 's'}`
                          : `Need ${(s.cost - user.fp).toLocaleString('en-IN')} more FP`}
                      </span>
                    </div>
                  </div>
                  <div className={`rounded-full px-3 py-1.5 flex items-center gap-1 shrink-0 ${s.locked ? 'bg-surface-primary' : 'bg-accent-lime'}`}>
                    {s.locked ? (
                      <Lock className="w-2.5 h-2.5 text-fg-primary" strokeWidth={2.4} />
                    ) : (
                      <Sparkles className="w-2.5 h-2.5 text-fg-primary" strokeWidth={2.4} />
                    )}
                    <span className="font-data font-bold text-[12px] text-fg-primary">{s.cost}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Commission disclosure footer */}
        <div className="flex items-center justify-center gap-1.5 pt-1">
          <Info className="w-2.5 h-2.5 text-fg-muted" strokeWidth={2.4} />
          <span className="text-[9px] text-fg-muted font-medium">FitStake earns commission on partner redemptions.</span>
        </div>
      </div>

      {/* Redeem modal */}
      {target && (
        <div className="absolute inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-end" onClick={closeModal}>
          <div
            className="w-full bg-surface-primary rounded-t-3xl p-5 max-h-[80%] overflow-y-auto no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="font-h font-bold text-[16px] text-fg-primary">
                {code ? 'Redemption confirmed' : 'Redeem with FP'}
              </div>
              <button onClick={closeModal} className="w-9 h-9 rounded-full bg-surface-card border border-border-soft grid place-items-center">
                <X className="w-4 h-4 text-fg-primary" strokeWidth={2.4} />
              </button>
            </div>

            <div className="rounded-[20px] bg-surface-card border border-border-soft p-4 flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-full bg-accent-lime grid place-items-center shrink-0">
                <Sparkles className="w-5 h-5 text-fg-primary" strokeWidth={2.4} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-h font-semibold text-[14px] text-fg-primary">{target.title}</div>
                <div className="text-[11px] text-fg-muted">{target.cost.toLocaleString('en-IN')} FP</div>
              </div>
            </div>

            {!code && (
              <div className="rounded-xl bg-surface-card border border-border-soft p-3 flex items-center justify-between text-[12px] mb-3">
                <span className="text-fg-muted">FP after redeem</span>
                <span className="font-data font-bold text-fg-primary">
                  {Math.max(0, user.fp - target.cost).toLocaleString('en-IN')}
                </span>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-warning/10 border border-warning/30 px-3 py-2 text-[12px] text-warning font-medium mb-3">
                {error}
              </div>
            )}

            {code ? (
              <div className="flex flex-col gap-3">
                <div className="rounded-[20px] bg-surface-inverse text-fg-inverse p-5 flex flex-col items-center gap-1.5">
                  <div className="text-[10px] font-semibold tracking-wider text-white/70">YOUR CODE</div>
                  <div className="font-data font-bold text-[22px] tracking-widest text-accent-lime">{code}</div>
                  <div className="text-[10px] text-white/70">Use at partner checkout · single-use</div>
                </div>
                <button
                  onClick={copyCode}
                  className="rounded-full bg-accent-lime text-fg-primary py-3 flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" strokeWidth={2.4} />
                  <span className="text-[13px] font-semibold">{copied ? 'Copied' : 'Copy code'}</span>
                </button>
                <button
                  onClick={closeModal}
                  className="text-[12px] font-medium text-fg-muted py-2 text-center hover:text-fg-secondary"
                >
                  Done
                </button>
              </div>
            ) : (
              <button
                onClick={confirmRedeem}
                disabled={busy}
                className="w-full rounded-full bg-fg-primary text-fg-inverse py-3.5 text-[14px] font-semibold disabled:opacity-50"
              >
                {busy ? 'Redeeming…' : `Confirm · spend ${target.cost.toLocaleString('en-IN')} FP`}
              </button>
            )}
          </div>
        </div>
      )}

      <TabBar />
    </div>
  );
}

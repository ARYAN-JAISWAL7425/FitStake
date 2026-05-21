import { useRef, useState } from 'react';
import { Bell, Lock, Target, ChevronRight, CircleCheck, Sparkles, Snowflake, Shield, Footprints, Dumbbell, Droplet, FastForward, Trophy, X, Apple, Bike, Moon, PlusCircle, Wallet, Camera } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { StatusBar } from '../components/StatusBar';
import { TabBar } from '../components/TabBar';
import { CycleRing } from '../components/CycleRing';
import { useUser } from '../hooks/useUser';
import { useCycle } from '../hooks/useCycle';
import { useCompletion } from '../hooks/useCompletion';
import { routes } from '../lib/routes';
import { getStake } from '../lib/stake';
import { api, ApiError } from '../lib/api';
import { getToken, setStoredUser } from '../lib/auth';
import { emit } from '../lib/events';

const goalIconMap: Record<string, typeof Footprints> = {
  footprints: Footprints,
  dumbbell: Dumbbell,
  droplet: Droplet,
  moon: Moon,
  apple: Apple,
  bike: Bike,
};

export function Home() {
  const user = useUser();
  const cycle = useCycle();
  const stake = getStake();
  const navigate = useNavigate();
  const { complete, completeWithPhoto, submitting } = useCompletion();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [stepMsg, setStepMsg] = useState<string | null>(null);
  const [needsGoogleFit, setNeedsGoogleFit] = useState<string | null>(null);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  const [photoForGoal, setPhotoForGoal] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasCycle = cycle.active !== false;
  const cycleProgress = hasCycle ? cycle.day / cycle.daysTotal : 0;

  const [simulating, setSimulating] = useState<'win' | 'miss' | null>(null);
  const simulateResolve = async (outcome: 'win' | 'miss') => {
    if (!getToken()) {
      // Pre-auth demo path: go straight to the screen.
      navigate(outcome === 'win' ? routes.cycleComplete : routes.missed);
      return;
    }
    setSimulating(outcome);
    try {
      const res = await api.post<{ outcome: 'win' | 'miss'; user?: { id: string; fp: number; walletBalance: number; available: number } }>(
        '/cycles/current/resolve',
        { simulate: outcome }
      );
      if (res.user) setStoredUser(res.user as never);
      emit('user-changed');
      emit('cycle-changed');
      navigate(res.outcome === 'win' ? routes.cycleComplete : routes.missed);
    } catch (err) {
      // Common cases: no active cycle (already resolved) — just navigate to the screen.
      if (err instanceof ApiError && err.status === 400) {
        navigate(outcome === 'win' ? routes.cycleComplete : routes.missed);
      }
    } finally {
      setSimulating(null);
    }
  };

  const onGoalTap = async (goalId: string, done: boolean) => {
    if (done) return; // already complete — no-op
    setStepMsg(null);
    setNeedsGoogleFit(null);
    setPhotoMsg(null);
    setPendingId(goalId);
    const res = await complete(goalId);
    setPendingId(null);
    if (!res.ok) {
      if (res.reason === 'unauthenticated') {
        navigate(routes.goals);
      } else if (res.reason === 'insufficient_steps') {
        setStepMsg(res.message ?? `Only ${res.steps} / ${res.target} steps so far.`);
        setTimeout(() => setStepMsg(null), 4500);
      } else if (res.reason === 'google_fit_required') {
        setNeedsGoogleFit(res.message ?? 'Connect Google Fit before completing a steps goal.');
      } else if (res.reason === 'photo_required') {
        // Trigger the file picker for this goal.
        setPhotoForGoal(goalId);
        fileInputRef.current?.click();
      }
      return;
    }
    setFlashId(goalId);
    setTimeout(() => setFlashId(null), 1200);
  };

  const onPhotoPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so the same file can be re-selected later
    if (!file || !photoForGoal) return;
    const goalId = photoForGoal;
    setPhotoForGoal(null);
    setPendingId(goalId);
    const res = await completeWithPhoto(goalId, file);
    setPendingId(null);
    if (!res.ok) {
      if (res.reason === 'duplicate_photo') {
        setPhotoMsg(res.message ?? 'You already used this exact photo on another goal. Take a fresh one.');
      } else if (res.reason === 'unauthenticated') {
        navigate(routes.login);
      } else {
        setPhotoMsg(res.message ?? 'Could not upload photo.');
      }
      setTimeout(() => setPhotoMsg(null), 5000);
      return;
    }
    setFlashId(goalId);
    setTimeout(() => setFlashId(null), 1200);
  };

  return (
    <div className="h-full w-full bg-surface-primary flex flex-col overflow-hidden">
      <StatusBar />
      <div className="flex-1 px-5 pt-2 pb-[100px] overflow-y-auto no-scrollbar space-y-[18px]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] text-fg-muted">Good morning,</div>
            <div className="font-h font-bold text-[22px] tracking-tight text-fg-primary">{user.name}</div>
          </div>
          <div className="flex items-center gap-2.5">
            <Link to={routes.group} className="w-11 h-11 rounded-full bg-surface-card border border-border-soft grid place-items-center hover:brightness-95">
              <Bell className="w-[18px] h-[18px] text-fg-primary" strokeWidth={2.2} />
            </Link>
            <Link to={routes.profile} className="w-11 h-11 rounded-full bg-accent-primary text-fg-inverse grid place-items-center font-h font-semibold text-[16px]">
              {user.initial}
            </Link>
          </div>
        </div>

        {/* No active cycle → empty state with CTA */}
        {!hasCycle && (
          <div className="rounded-[20px] bg-surface-inverse text-fg-inverse p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-accent-lime grid place-items-center">
                <PlusCircle className="w-[22px] h-[22px] text-fg-primary" strokeWidth={2.4} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-h font-bold text-[16px]">No active cycle</div>
                <div className="text-[11px] text-white/70 mt-0.5">
                  {user.available > 0
                    ? `You have ₹${user.available.toLocaleString('en-IN')} ready to stake.`
                    : 'Top up your wallet, then lock in your first 30-day plan.'}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate(routes.goalSetup)}
                className="flex-1 rounded-full bg-accent-lime text-fg-primary py-2.5 text-[12px] font-semibold hover:brightness-95"
              >
                Start a 30-day plan
              </button>
              <button
                type="button"
                onClick={() => navigate(routes.wallet)}
                className="rounded-full bg-white/10 text-fg-inverse py-2.5 px-4 text-[12px] font-semibold flex items-center gap-1.5 hover:bg-white/15"
              >
                <Wallet className="w-3.5 h-3.5" strokeWidth={2.4} />
                Wallet
              </button>
            </div>
          </div>
        )}

        {/* Cycle card (dark) — tap to view your plan */}
        {hasCycle && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate(routes.planReview)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate(routes.planReview);
            }
          }}
          className="rounded-[20px] bg-surface-inverse p-[22px] flex items-center gap-[18px] text-fg-inverse hover:brightness-110 transition cursor-pointer"
        >
          <CycleRing size={120} strokeWidth={13} progress={cycleProgress}>
            <div className="text-[11px] text-white/70 font-medium tracking-wider">Day {cycle.day}</div>
            <div className="font-data font-bold text-[22px] -tracking-tight">of {cycle.daysTotal}</div>
          </CycleRing>
          <div className="flex-1 flex flex-col gap-2.5">
            <Link
              to={routes.wallet}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/10 px-2.5 py-1 hover:bg-white/15"
            >
              <Lock className="w-3 h-3 text-accent-lime" strokeWidth={2.5} />
              <span className="text-[10px] font-semibold tracking-wider text-accent-lime">₹{stake.toLocaleString('en-IN')} LOCKED</span>
            </Link>
            <div className="font-h font-bold text-[18px] -tracking-tight">{cycle.credited} of {cycle.threshold} credited</div>
            <div className="text-[11px] text-white/70">{cycle.daysLeft} days left • Ends {cycle.endDate}</div>
            <div className="inline-flex items-center gap-1.5 mt-1">
              <Target className="w-3 h-3 text-accent-lime" strokeWidth={2.5} />
              <span className="text-[11px] font-medium text-accent-lime">{cycle.creditedNeeded} more credited days to unlock</span>
            </div>
          </div>
        </div>
        )}

        {/* Freezes + FP row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[20px] bg-surface-secondary p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-fg-primary" strokeWidth={2.4} />
                <Snowflake className="w-3 h-3 text-fg-primary" strokeWidth={2.4} />
                <Snowflake className="w-3 h-3 text-fg-primary" strokeWidth={2.4} />
                <Snowflake className="w-3 h-3 text-fg-primary/40" strokeWidth={2.4} />
              </div>
              <span className="text-[12px] font-data font-semibold text-fg-primary">3 left</span>
            </div>
            <div className="flex gap-1.5">
              <div className="flex-1 h-1.5 rounded-full bg-fg-primary" />
              <div className="flex-1 h-1.5 rounded-full bg-fg-primary" />
              <div className="flex-1 h-1.5 rounded-full bg-fg-primary" />
              <div className="flex-1 h-1.5 rounded-full bg-fg-primary/20" />
              <div className="flex-1 h-1.5 rounded-full bg-fg-primary/20" />
            </div>
            <div className="text-[11px] text-fg-secondary">Next earned at Day 21 streak</div>
          </div>

          <Link to={routes.rewards} className="rounded-[20px] bg-surface-card border border-border-soft p-4 flex flex-col gap-2.5 hover:brightness-[0.98] transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent-primary" strokeWidth={2.4} />
                <span className="text-[10px] font-semibold tracking-wider text-fg-muted">FITNESS POINTS</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-fg-muted" strokeWidth={2.4} />
            </div>
            <div className="flex items-end gap-1">
              <span className="font-data font-bold text-[22px] text-fg-primary -tracking-tight">{user.fp.toLocaleString('en-IN')}</span>
              <span className="text-[11px] text-fg-muted font-medium pb-0.5">FP</span>
            </div>
            <div className="text-[11px] text-accent-money font-medium">+ {user.fpEarnedToday} FP earned today</div>
          </Link>
        </div>

        {/* Goals header */}
        {hasCycle && (
        <div className="flex items-center justify-between">
          <div className="font-h font-semibold text-[17px] text-fg-primary -tracking-tight">Day {cycle.day} goals</div>
          <div className="text-[12px] text-fg-muted">{cycle.goals.filter((g) => g.done).length} of {cycle.goals.length} done</div>
        </div>
        )}

        {/* Demo: simulate end-of-cycle */}
        {hasCycle && (
        <div className="rounded-[18px] bg-surface-card border border-dashed border-border-soft p-3 flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <FastForward className="w-3 h-3 text-fg-muted" strokeWidth={2.4} />
            <span className="text-[10px] font-semibold tracking-wider text-fg-muted">DEMO · SIMULATE DAY 30</span>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => simulateResolve('win')}
              disabled={!!simulating}
              className="flex-1 rounded-full bg-accent-money/15 text-accent-money py-2 px-3 flex items-center justify-center gap-1.5 hover:brightness-95 transition disabled:opacity-60"
            >
              <Trophy className="w-3.5 h-3.5" strokeWidth={2.4} />
              <span className="text-[11px] font-bold">{simulating === 'win' ? 'Resolving…' : 'Win path'}</span>
            </button>
            <button
              type="button"
              onClick={() => simulateResolve('miss')}
              disabled={!!simulating}
              className="flex-1 rounded-full bg-warning/15 text-warning py-2 px-3 flex items-center justify-center gap-1.5 hover:brightness-95 transition disabled:opacity-60"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2.4} />
              <span className="text-[11px] font-bold">{simulating === 'miss' ? 'Resolving…' : 'Miss path'}</span>
            </button>
          </div>
        </div>
        )}

        {/* Google Fit verification feedback */}
        {stepMsg && (
          <div className="rounded-xl bg-warning/10 border border-warning/30 px-3.5 py-2.5 text-[12px] text-warning font-medium">
            {stepMsg}
          </div>
        )}

        {/* Steps goal needs Google Fit connected */}
        {needsGoogleFit && (
          <div className="rounded-xl bg-warning/10 border border-warning/30 px-3.5 py-3 flex flex-col gap-2.5">
            <span className="text-[12px] text-warning font-medium leading-snug">{needsGoogleFit}</span>
            <button
              type="button"
              onClick={() => navigate(routes.profile)}
              className="self-start rounded-full bg-warning text-fg-inverse px-3.5 py-1.5 text-[11px] font-semibold hover:brightness-110 transition"
            >
              Connect Google Fit
            </button>
          </div>
        )}

        {/* Photo proof feedback (success or duplicate) */}
        {photoMsg && (
          <div className="rounded-xl bg-warning/10 border border-warning/30 px-3.5 py-2.5 text-[12px] text-warning font-medium flex items-center gap-2">
            <Camera className="w-3.5 h-3.5" strokeWidth={2.4} />
            <span>{photoMsg}</span>
          </div>
        )}

        {/* Hidden file picker — opened programmatically when a photo-required goal is tapped. */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPhotoPicked}
          className="hidden"
        />

        {/* Goal cards — tap to mark complete */}
        {hasCycle && (
        <div className="flex flex-col gap-2.5">
          {cycle.goals.map((g) => {
            const Icon = goalIconMap[g.icon] ?? Footprints;
            const isComplete = !!g.done;
            const isPending = pendingId === g.id || (submitting && pendingId === g.id);
            const flashed = flashId === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => onGoalTap(g.id, isComplete)}
                disabled={isPending || isComplete}
                className={`text-left rounded-xl p-3.5 flex items-center gap-3.5 transition bg-surface-card border ${
                  flashed ? 'border-accent-money ring-2 ring-accent-money/30' : 'border-border-soft'
                } ${isComplete ? 'opacity-90' : 'hover:bg-surface-secondary/30'} ${isPending ? 'opacity-60' : ''}`}
              >
                <div
                  className={`w-10 h-10 rounded-full grid place-items-center ${
                    isComplete ? 'bg-accent-money text-fg-inverse' : 'bg-surface-primary text-fg-primary'
                  }`}
                >
                  {isComplete ? (
                    <CircleCheck className="w-[18px] h-[18px]" strokeWidth={2.2} />
                  ) : (
                    <Icon className="w-[18px] h-[18px]" strokeWidth={2.2} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-h font-semibold text-[14px] text-fg-primary">{g.title}</div>
                  <div className="text-[12px] text-fg-secondary">{g.progress}</div>
                </div>
                {isComplete ? (
                  <CircleCheck className="w-[18px] h-[18px] text-accent-money" strokeWidth={2.2} />
                ) : isPending ? (
                  <span className="text-[10px] font-semibold text-fg-muted">…</span>
                ) : (
                  <ChevronRight className="w-[18px] h-[18px] text-fg-muted" strokeWidth={2.2} />
                )}
              </button>
            );
          })}
        </div>
        )}
      </div>
      <TabBar />
    </div>
  );
}

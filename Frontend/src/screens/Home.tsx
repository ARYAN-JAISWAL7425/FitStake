import { useEffect, useRef, useState } from 'react';
import { Bell, Lock, Target, ChevronRight, CircleCheck, Sparkles, Snowflake, Shield, Footprints, Dumbbell, Droplet, Apple, Bike, Moon, PlusCircle, Wallet, Camera } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { StatusBar } from '../components/StatusBar';
import { TabBar } from '../components/TabBar';
import { CycleRing } from '../components/CycleRing';
import { useUser } from '../hooks/useUser';
import { useCycle } from '../hooks/useCycle';
import { useCompletion } from '../hooks/useCompletion';
import { routes } from '../lib/routes';
import { api } from '../lib/api';
import { getToken, setStoredUser } from '../lib/auth';
import { emit } from '../lib/events';
import type { GoalTemplate } from '../lib/photoVerify';

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
  const navigate = useNavigate();
  const { complete, completeWithPhoto, submitting } = useCompletion();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [stepMsg, setStepMsg] = useState<string | null>(null);
  const [needsGoogleFit, setNeedsGoogleFit] = useState<string | null>(null);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  const [photoForGoal, setPhotoForGoal] = useState<{ id: string; templateId: string } | null>(null);
  const [verifyingPhoto, setVerifyingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasActive = cycle.active === true;
  const cycleProgress = hasActive ? cycle.day / cycle.daysTotal : 0;

  // Auto-resolve at the natural end of a cycle.
  //
  // Backend's /cycles/current only returns ACTIVE cycles, so we never see
  // resolved ones here on plain login. The only auto-redirect to the Missed /
  // CycleComplete page happens at the exact moment the cycle reaches day N
  // and we call /resolve — based on that response.
  const [autoResolving, setAutoResolving] = useState(false);
  useEffect(() => {
    if (autoResolving || !getToken()) return;
    if (!hasActive) return;
    if (cycle.day < cycle.daysTotal) return;

    setAutoResolving(true);
    api
      .post<{ outcome: 'win' | 'miss'; user?: { id: string; fp: number; walletBalance: number; available: number } }>(
        '/cycles/current/resolve',
        {}
      )
      .then((res) => {
        if (res.user) setStoredUser(res.user as never);
        emit('user-changed');
        emit('cycle-changed');
        navigate(res.outcome === 'win' ? routes.cycleComplete : routes.missed, { replace: true });
      })
      .catch(() => { /* fall through; user can retry from the cycle page */ })
      .finally(() => setAutoResolving(false));
  }, [hasActive, cycle.day, cycle.daysTotal, autoResolving, navigate]);

  // Goal types that require a photo proof — must match the backend's needsPhoto list.
  const PHOTO_GOALS = ['water', 'strength', 'sleep', 'cardio', 'diet'];

  const onGoalTap = async (goalId: string, done: boolean, templateId?: string) => {
    if (done) return; // already complete — no-op
    setStepMsg(null);
    setNeedsGoogleFit(null);
    setPhotoMsg(null);

    // Photo-required goals: open the file picker SYNCHRONOUSLY inside this user
    // gesture. Doing it after a backend round-trip gets blocked by the browser
    // (the user-activation context expires across the await).
    if (templateId && PHOTO_GOALS.includes(templateId)) {
      setPhotoForGoal({ id: goalId, templateId });
      fileInputRef.current?.click();
      return;
    }

    // Steps + anything else → go through the backend (Google Fit verification etc).
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
        // Fallback for any goal the frontend list didn't catch.
        setPhotoForGoal({ id: goalId, templateId: templateId ?? 'water' });
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
    const { id: goalId, templateId } = photoForGoal;
    setPhotoForGoal(null);
    setPhotoMsg(null);

    // 1) On-device content check (COCO-SSD) BEFORE uploading. Confirms the photo
    //    plausibly shows the activity. Fails open on model errors.
    //    Dynamically imported so the ~300KB tfjs bundle only loads on first photo,
    //    not on initial page load.
    setVerifyingPhoto(true);
    const { verifyPhotoForGoal } = await import('../lib/photoVerify');
    const check = await verifyPhotoForGoal(file, templateId as GoalTemplate);
    setVerifyingPhoto(false);
    if (!check.ok) {
      // Prefer the pose-specific hint (standing / no-person); fall back to the
      // generic "doesn't look like X" with what was actually detected.
      const msg = check.hint
        ? `${check.hint}`
        : `That photo doesn't look like ${check.wantLabel}. ` +
          (check.detected.length ? `We saw: ${check.detected.slice(0, 3).join(', ')}. ` : '') +
          'Take a clearer photo and try again.';
      setPhotoMsg(msg);
      setTimeout(() => setPhotoMsg(null), 6000);
      return;
    }

    // 2) Upload + credit.
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
        {!hasActive && (
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
        {hasActive && (
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
              <span className="text-[10px] font-semibold tracking-wider text-accent-lime">₹{cycle.stake.toLocaleString('en-IN')} LOCKED</span>
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
          {(() => {
            const total = cycle.freezesStarting;
            const used = cycle.freezesUsed;
            const left = Math.max(0, total - used);
            return (
              <div className="rounded-[20px] bg-surface-secondary p-4 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-fg-primary" strokeWidth={2.4} />
                    {Array.from({ length: total }).map((_, i) => (
                      <Snowflake
                        key={i}
                        className={`w-3 h-3 ${i < left ? 'text-fg-primary' : 'text-fg-primary/40'}`}
                        strokeWidth={2.4}
                      />
                    ))}
                  </div>
                  <span className="text-[12px] font-data font-semibold text-fg-primary">{left} left</span>
                </div>
                <div className="flex gap-1.5">
                  {Array.from({ length: total }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-1.5 rounded-full ${i < left ? 'bg-fg-primary' : 'bg-fg-primary/20'}`}
                    />
                  ))}
                </div>
                <div className="text-[11px] text-fg-secondary">
                  {used > 0 ? `${used} used so far` : 'Use them on busy or sick days'}
                </div>
              </div>
            );
          })()}

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
        {hasActive && (
        <div className="flex items-center justify-between">
          <div className="font-h font-semibold text-[17px] text-fg-primary -tracking-tight">Day {cycle.day} goals</div>
          <div className="text-[12px] text-fg-muted">{cycle.goals.filter((g) => g.done).length} of {cycle.goals.length} done</div>
        </div>
        )}

        {/* Auto-resolution status — visible only when the cycle is being closed. */}
        {hasActive && autoResolving && (
          <div className="rounded-xl bg-surface-card border border-border-soft px-3.5 py-2.5 text-[12px] text-fg-muted font-medium">
            Wrapping up your cycle…
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

        {/* On-device photo verification in progress */}
        {verifyingPhoto && (
          <div className="rounded-xl bg-surface-card border border-border-soft px-3.5 py-2.5 text-[12px] text-fg-secondary font-medium flex items-center gap-2">
            <Camera className="w-3.5 h-3.5 text-accent-primary" strokeWidth={2.4} />
            <span>Checking your photo on-device…</span>
          </div>
        )}

        {/* Photo proof feedback (rejection or duplicate) */}
        {photoMsg && (
          <div className="rounded-xl bg-warning/10 border border-warning/30 px-3.5 py-2.5 text-[12px] text-warning font-medium flex items-center gap-2">
            <Camera className="w-3.5 h-3.5" strokeWidth={2.4} />
            <span>{photoMsg}</span>
          </div>
        )}

        {/* Hidden file picker — opened programmatically when a photo-required goal is tapped.
            No `capture` attribute: on a laptop that forces a non-existent camera and the
            click silently fails. The OS picker still offers camera + gallery on mobile. */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onPhotoPicked}
          className="hidden"
        />

        {/* Goal cards — tap to mark complete */}
        {hasActive && (
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
                onClick={() => onGoalTap(g.id, isComplete, g.templateId)}
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
                  <div className="text-[12px] text-fg-secondary">
                    {isPending
                      ? (g.templateId === 'steps' ? 'Verifying with Google Fit…' : 'Uploading proof…')
                      : g.progress}
                  </div>
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

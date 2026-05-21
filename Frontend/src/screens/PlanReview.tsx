import { useMemo, useState } from 'react';
import { ArrowLeft, Pencil, ShieldCheck, Info, Sparkles, Lock, Footprints, Dumbbell, Moon, Droplet, Snowflake, Apple, Bike, Wallet, LucideIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { StatusBar } from '../components/StatusBar';
import { Button } from '../components/Button';
import { routes } from '../lib/routes';
import { getStake, freezesForStake } from '../lib/stake';
import { getGoalDraft, clearGoalDraft, DraftGoal } from '../lib/goalDraft';
import { api, ApiError } from '../lib/api';
import { getToken, setStoredUser } from '../lib/auth';
import { emit } from '../lib/events';

type Difficulty = 'Easy' | 'Medium' | 'Hard';
const multiplier: Record<Difficulty, number> = { Easy: 1.0, Medium: 1.5, Hard: 2.0 };
const baseFp = 30;

const thresholds: Record<DraftGoal['templateId'], { medium: number; hard: number }> = {
  steps: { medium: 5000, hard: 9000 },
  strength: { medium: 20, hard: 45 },
  water: { medium: 1.5, hard: 2.5 },
  sleep: { medium: 6, hard: 8 },
  diet: { medium: 2, hard: 3 },
  cardio: { medium: 15, hard: 30 },
};

const iconMap: Record<DraftGoal['templateId'], LucideIcon> = {
  steps: Footprints,
  strength: Dumbbell,
  water: Droplet,
  sleep: Moon,
  diet: Apple,
  cardio: Bike,
};

function difficultyFor(templateId: DraftGoal['templateId'], target: number): Difficulty {
  const { medium, hard } = thresholds[templateId];
  if (target >= hard) return 'Hard';
  if (target >= medium) return 'Medium';
  return 'Easy';
}

const fallbackGoals: DraftGoal[] = [
  { id: 'steps', templateId: 'steps', title: 'Daily steps', target: '8000', unit: 'steps' },
  { id: 'strength', templateId: 'strength', title: 'Strength training', target: '30', unit: 'min' },
  { id: 'sleep', templateId: 'sleep', title: 'Sleep', target: '7', unit: 'hours' },
  { id: 'water', templateId: 'water', title: 'Drink water', target: '2', unit: 'L' },
];

export function PlanReview() {
  const navigate = useNavigate();
  const stake = getStake();
  const freezes = freezesForStake(stake);
  const stakeFormatted = stake.toLocaleString('en-IN');

  const goals = useMemo<DraftGoal[]>(() => {
    const draft = getGoalDraft();
    return draft && draft.length > 0 ? draft : fallbackGoals;
  }, []);

  const enriched = goals.map((g) => {
    const targetN = parseFloat(g.target) || 0;
    const difficulty = difficultyFor(g.templateId, targetN);
    const fp = Math.round(baseFp * multiplier[difficulty]);
    return { ...g, targetN, difficulty, fp };
  });

  const dailyFp = enriched.reduce((sum, g) => sum + g.fp, 0);
  // Approx full-cycle: daily × 25-day threshold + completion bonus + daily bonus × 28 typical credited
  const cycleFp = dailyFp * 25 + 500 + 28 * 20;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lockIn = async () => {
    setError(null);
    // If no token, this is a pre-auth demo — just navigate to Home without persisting.
    if (!getToken()) {
      navigate(routes.home);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        stake,
        goals: enriched.map((g) => ({
          templateId: g.templateId,
          title: g.title,
          target: g.targetN,
          unit: g.unit,
        })),
      };
      const res = await api.post<{ user?: { id: string; fp: number; walletBalance: number; available: number } }>(
        '/cycles',
        payload
      );
      if (res.user) setStoredUser(res.user as never);
      emit('user-changed');
      emit('cycle-changed');
      clearGoalDraft();
      navigate(routes.home);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Already has an active cycle — just go to home.
        clearGoalDraft();
        navigate(routes.home);
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Could not start cycle. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full w-full bg-surface-primary flex flex-col overflow-hidden">
      <StatusBar />
      <div className="flex-1 px-5 pt-2 pb-5 overflow-y-auto no-scrollbar space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link to={routes.goalSetup} className="w-10 h-10 rounded-full bg-surface-card border border-border-soft grid place-items-center hover:bg-surface-secondary/40 transition">
            <ArrowLeft className="w-[18px] h-[18px] text-fg-primary" strokeWidth={2.2} />
          </Link>
          <h1 className="font-h font-semibold text-[16px] text-fg-primary">Plan review</h1>
          <Link to={routes.goalSetup} className="flex items-center gap-1.5 rounded-full bg-surface-card border border-border-soft px-3.5 py-2 hover:bg-surface-secondary/40 transition">
            <Pencil className="w-3 h-3 text-fg-primary" strokeWidth={2.4} />
            <span className="text-[11px] font-semibold text-fg-primary">Edit</span>
          </Link>
        </div>

        {/* Hero — eligible */}
        <div className="rounded-[20px] bg-surface-inverse text-fg-inverse p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-accent-lime grid place-items-center">
              <ShieldCheck className="w-[22px] h-[22px] text-fg-primary" strokeWidth={2.4} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-h font-bold text-[16px]">Plan eligible</div>
              <div className="text-[11px] text-white/70">{enriched.length} {enriched.length === 1 ? 'goal' : 'goals'} • Your bar, your stake</div>
            </div>
            <Link to={routes.stakeSelect} className="text-[10px] font-semibold text-accent-lime underline-offset-2 hover:underline">
              Change
            </Link>
          </div>

          {/* Stake row */}
          <div className="rounded-xl bg-white/8 p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-accent-lime/20 grid place-items-center shrink-0">
              <Lock className="w-4 h-4 text-accent-lime" strokeWidth={2.4} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold tracking-wider text-white/70">YOUR STAKE</div>
              <div className="font-data font-bold text-[20px] text-accent-lime -tracking-tight leading-tight">₹{stakeFormatted}</div>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
              <Snowflake className="w-3 h-3 text-accent-lime" strokeWidth={2.4} />
              <span className="text-[10px] font-semibold text-accent-lime">{freezes} freezes</span>
            </div>
          </div>

          <div className="h-px bg-white/10" />
          <div className="flex justify-between items-end">
            <div className="flex flex-col gap-1">
              <div className="text-[9px] font-semibold tracking-wider text-white/70">DAILY EARN POTENTIAL</div>
              <div className="flex items-end gap-1">
                <span className="font-data font-bold text-[36px] text-accent-lime -tracking-tight leading-none">+{dailyFp}</span>
                <span className="text-[12px] text-white/70 font-medium pb-1">FP/day</span>
              </div>
            </div>
            <div className="flex flex-col gap-1 items-end">
              <div className="text-[9px] font-semibold tracking-wider text-white/70">FULL CYCLE</div>
              <div className="flex items-end gap-1">
                <span className="font-data font-bold text-[22px] -tracking-tight leading-none">~{cycleFp.toLocaleString('en-IN')}</span>
                <span className="text-[11px] text-white/70 font-medium pb-0.5">FP</span>
              </div>
            </div>
          </div>
        </div>

        {/* Binary commitment banner */}
        <div className="rounded-xl bg-surface-secondary p-3 flex items-start gap-2.5">
          <Info className="w-3.5 h-3.5 text-fg-primary shrink-0 mt-0.5" strokeWidth={2.4} />
          <p className="text-[11px] font-medium text-fg-primary leading-snug">
            Win → ₹{stakeFormatted} stake back to wallet. Lose → ₹{stakeFormatted} to your charity, in your name. FitStake takes nothing either way.
          </p>
        </div>

        {/* Goal breakdown */}
        <div className="flex items-center justify-between pt-1">
          <h2 className="font-h font-semibold text-[14px] text-fg-primary">Goal breakdown</h2>
          <span className="text-[10px] font-semibold tracking-wider text-fg-muted">FP per day</span>
        </div>

        <div className="rounded-[20px] bg-surface-card border border-border-soft overflow-hidden">
          {enriched.map((g, i) => {
            const isLast = i === enriched.length - 1;
            const Icon = iconMap[g.templateId];
            return (
              <div
                key={g.id}
                className={`flex items-center gap-3 px-3.5 py-3 ${!isLast ? 'border-b border-border-soft' : ''}`}
              >
                <div className="w-9 h-9 rounded-full bg-surface-secondary grid place-items-center shrink-0">
                  <Icon className="w-[15px] h-[15px] text-fg-primary" strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-h font-semibold text-[13px] text-fg-primary">{g.title} · {g.targetN} {g.unit}</div>
                  <div className="text-[10px] text-fg-muted">{g.difficulty} ({multiplier[g.difficulty]}×)</div>
                </div>
                <div className="rounded-full bg-surface-secondary px-2.5 py-1.5 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-accent-primary" strokeWidth={2.4} />
                  <span className="font-data font-bold text-[12px] text-fg-primary">+{g.fp}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total row */}
        <div className="rounded-xl bg-fg-primary text-fg-inverse px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-accent-lime" strokeWidth={2.4} />
            <span className="text-[12px] font-semibold">All goals = full day</span>
          </div>
          <div className="flex items-end gap-1">
            <span className="font-data font-bold text-[18px] text-accent-lime">+{dailyFp}</span>
            <span className="text-[11px] text-white/70">FP/day</span>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-warning/10 border border-warning/30 px-3.5 py-2.5 text-[12px] text-warning font-medium flex flex-col gap-2.5">
            <span>{error}</span>
            {/insufficient|balance/i.test(error) && (
              <button
                type="button"
                onClick={() => navigate(routes.wallet)}
                className="self-start inline-flex items-center gap-1.5 rounded-full bg-warning text-fg-inverse px-3.5 py-1.5 text-[11px] font-semibold hover:brightness-110 transition"
              >
                <Wallet className="w-3.5 h-3.5" strokeWidth={2.4} />
                Top up wallet
              </button>
            )}
          </div>
        )}

        {/* CTA */}
        <Button variant="primary" icon={Lock} onClick={lockIn} disabled={submitting} className="w-full">
          {submitting ? 'Locking in…' : 'Lock in & start cycle'}
        </Button>
      </div>
    </div>
  );
}

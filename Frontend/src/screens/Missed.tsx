import { useState } from 'react';
import { ChevronLeft, MoreHorizontal, HeartHandshake, Sparkles, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBar } from '../components/StatusBar';
import { CycleRing } from '../components/CycleRing';
import { Button } from '../components/Button';
import { routes } from '../lib/routes';
import { getStake } from '../lib/stake';
import { useResolvedCycle } from '../hooks/useResolvedCycle';

const reflectionTags = ['Too busy', 'Stress', 'Travel', 'Felt sick', 'Lost motivation', 'Other'];

export function Missed() {
  const resolved = useResolvedCycle();
  const stake = resolved?.stake ?? getStake();
  const stakeFormatted = stake.toLocaleString('en-IN');
  const credited = resolved?.credited ?? 18;
  const daysTotal = resolved?.daysTotal ?? 30;
  const threshold = resolved?.threshold ?? 25;
  const shortBy = Math.max(0, threshold - credited);
  const failureFp = 15 * credited;

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const toggleTag = (t: string) =>
    setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <div className="h-full w-full bg-surface-primary flex flex-col overflow-hidden">
      <StatusBar />
      <div className="flex-1 px-5 pt-2 pb-5 overflow-y-auto no-scrollbar space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link to={routes.home} className="w-10 h-10 rounded-full bg-surface-card border border-border-soft grid place-items-center hover:bg-surface-secondary/40 transition">
            <ChevronLeft className="w-[18px] h-[18px] text-fg-primary" strokeWidth={2.2} />
          </Link>
          <span className="text-[12px] font-medium text-fg-secondary">
            Cycle {resolved?.number ? String(resolved.number).padStart(2, '0') : '04'}
          </span>
          <Link to={routes.wallet} className="w-10 h-10 rounded-full bg-surface-card border border-border-soft grid place-items-center hover:bg-surface-secondary/40 transition">
            <MoreHorizontal className="w-[18px] h-[18px] text-fg-primary" strokeWidth={2.2} />
          </Link>
        </div>

        {/* Hero — orange not red */}
        <div className="rounded-[20px] bg-warning text-fg-inverse p-5 flex flex-col items-center gap-2.5">
          <CycleRing size={120} strokeWidth={13} progress={credited / daysTotal} trackColor="#FFFFFF40" fillColor="#FFFFFF">
            <div className="font-data font-bold text-[38px] -tracking-tight leading-none mt-1">{credited}</div>
            <div className="text-[11px] text-white/85 font-medium mt-0.5">of {daysTotal} days</div>
          </CycleRing>
          <h1 className="font-h font-bold text-[22px] -tracking-tight text-center">You didn't unlock the stake</h1>
          <p className="text-[12px] text-white/85 text-center leading-snug">
            Needed {threshold} days credited — you came up {shortBy} short. Streak resets, but you still earned FP for showing up.
          </p>
        </div>

        {/* Where your stake went */}
        <div className="rounded-[20px] bg-surface-card border border-border-soft p-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="font-h font-bold text-[14px] text-fg-primary">Where your stake went</div>
            <div className="rounded-full bg-surface-secondary text-fg-primary px-2.5 py-1 text-[10px] font-semibold">
              Full → charity
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[12px] text-fg-secondary">Stake amount</span>
            <span className="font-data font-bold text-[14px] text-fg-primary">₹{stakeFormatted}</span>
          </div>

          <div className="h-px bg-border-soft" />

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-surface-secondary grid place-items-center">
              <HeartHandshake className="w-[18px] h-[18px] text-accent-primary" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-h font-semibold text-[13px] text-fg-primary">To GiveIndia in your name</div>
              <div className="text-[11px] text-fg-muted">100% of stake • 80G tax receipt issued</div>
            </div>
            <span className="font-data font-bold text-[15px] text-accent-money">₹{stakeFormatted}</span>
          </div>
        </div>

        {/* FP earned for showing up */}
        <div className="rounded-[20px] bg-surface-inverse text-fg-inverse p-3.5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-full bg-accent-lime grid place-items-center">
            <Sparkles className="w-5 h-5 text-fg-primary" strokeWidth={2.4} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-h font-bold text-[15px]">+ {failureFp} FP for showing up</div>
            <div className="text-[11px] text-white/80">{credited} credited days × 15 FP — keep them, spend in Rewards.</div>
          </div>
        </div>

        {/* Reflection tags */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="font-h font-bold text-[13px] text-fg-primary">What got in the way?</div>
            {selectedTags.length > 0 && (
              <span className="text-[10px] font-semibold text-fg-muted">{selectedTags.length} selected</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {reflectionTags.map((t) => {
              const active = selectedTags.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTag(t)}
                  className={`px-3.5 py-2 rounded-full text-[12px] font-medium transition ${
                    active
                      ? 'bg-fg-primary text-fg-inverse border border-fg-primary'
                      : 'bg-surface-card border border-border-soft text-fg-secondary hover:bg-surface-secondary/40'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="pt-1">
          <Button to={routes.goalSetup} variant="primary" icon={RefreshCw} className="w-full">
            Start a new cycle
          </Button>
        </div>
      </div>
    </div>
  );
}

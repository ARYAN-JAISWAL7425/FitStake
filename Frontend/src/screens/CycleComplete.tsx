import { X, Trophy, Wallet as WalletIcon, Sparkles, CircleCheck, Play, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBar } from '../components/StatusBar';
import { CycleRing } from '../components/CycleRing';
import { Button } from '../components/Button';
import { routes } from '../lib/routes';
import { getStake } from '../lib/stake';
import { useResolvedCycle } from '../hooks/useResolvedCycle';

export function CycleComplete() {
  const resolved = useResolvedCycle();

  // Prefer the resolved cycle from the server; fall back to local stake + demo defaults.
  const stake = resolved?.stake ?? getStake();
  const credited = resolved?.credited ?? 28;
  const daysTotal = resolved?.daysTotal ?? 30;
  const freezesUsed = resolved?.freezesUsed ?? 1;
  const stakeFormatted = stake.toLocaleString('en-IN');

  // FP bonus per FITSTAKE.md: 500 completion + 20 × credited days.
  const bonusFp = 500 + 20 * credited;

  return (
    <div className="h-full w-full bg-surface-inverse text-fg-inverse flex flex-col overflow-hidden">
      <StatusBar dark />
      <div className="flex-1 flex flex-col px-6 pb-6 pt-3 gap-3.5 overflow-y-auto no-scrollbar">
        {/* Close */}
        <div className="flex justify-end">
          <Link to={routes.home} className="w-10 h-10 rounded-full bg-white/10 grid place-items-center hover:bg-white/15">
            <X className="w-[18px] h-[18px]" strokeWidth={2.2} />
          </Link>
        </div>

        {/* Hero ring */}
        <div className="flex flex-col items-center gap-3">
          <CycleRing size={140} strokeWidth={14} progress={1} trackColor="#FFFFFF1A">
            <Trophy className="w-7 h-7 text-accent-lime" strokeWidth={2.4} />
            <div className="font-data font-bold text-[28px] -tracking-tight mt-1">{daysTotal}/{daysTotal}</div>
          </CycleRing>
          <h1 className="text-center font-h font-bold text-[28px] -tracking-tight">Cycle complete!</h1>
          <p className="text-center text-[12px] text-white/70">
            {credited} days credited
            {freezesUsed > 0 && ` • ${freezesUsed} freeze${freezesUsed === 1 ? '' : 's'} used`}
          </p>
        </div>

        {/* Reward cards */}
        <div className="flex flex-col gap-2">
          {/* Stake returned */}
          <div className="rounded-[20px] bg-white/10 p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-accent-lime grid place-items-center">
              <WalletIcon className="w-[18px] h-[18px] text-fg-primary" strokeWidth={2.4} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-h font-semibold text-[15px]">₹{stakeFormatted} stake returned</div>
              <div className="text-[11px] text-white/70">Back in your wallet, in full</div>
            </div>
            <CircleCheck className="w-[18px] h-[18px] text-accent-lime" strokeWidth={2.2} />
          </div>

          {/* FP bonus */}
          <div className="rounded-[20px] bg-white/10 p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-accent-lime grid place-items-center">
              <Sparkles className="w-[18px] h-[18px] text-fg-primary" strokeWidth={2.4} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-h font-semibold text-[15px]">+ {bonusFp.toLocaleString('en-IN')} FP earned</div>
              <div className="text-[11px] text-white/70">500 completion bonus + {credited}×20 daily</div>
            </div>
            <CircleCheck className="w-[18px] h-[18px] text-accent-lime" strokeWidth={2.2} />
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-2.5 mt-auto pt-4">
          <Button to={routes.goalSetup} variant="primary" icon={Play} className="w-full">
            Start next cycle
          </Button>
          <button className="flex items-center justify-center gap-2 py-3 text-[13px] font-medium text-white/70 hover:text-white">
            <Share2 className="w-3.5 h-3.5" strokeWidth={2.4} />
            Share your win
          </button>
        </div>
      </div>
    </div>
  );
}

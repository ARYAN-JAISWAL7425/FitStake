import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Lock, HeartHandshake, Snowflake, Sparkles, Wallet as WalletIcon } from 'lucide-react';
import { StatusBar } from '../components/StatusBar';
import { Button } from '../components/Button';
import { routes } from '../lib/routes';
import { getStake, setStake, freezesForStake, STAKE_MIN, STAKE_MAX } from '../lib/stake';

const chips = [500, 2000, 5000, 10000];

export function StakeSelect() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState<number>(getStake());

  const freezes = freezesForStake(amount);
  const tierLabel = amount >= 5000 ? 'High commitment' : amount >= 1000 ? 'Standard commitment' : 'Starter commitment';

  const commit = () => {
    setStake(amount);
    navigate(routes.planReview);
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
          <h1 className="font-h font-semibold text-[16px] text-fg-primary">Set your stake</h1>
          <div className="w-10 h-10" />
        </div>

        {/* Amount hero */}
        <div className="rounded-[20px] bg-surface-inverse text-fg-inverse p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <WalletIcon className="w-3.5 h-3.5 text-accent-lime" strokeWidth={2.4} />
              <span className="text-[11px] font-semibold tracking-wider text-white/70">LOCK FOR 30 DAYS</span>
            </div>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-accent-lime">
              {tierLabel}
            </span>
          </div>
          <div className="flex items-end gap-1">
            <span className="font-data font-medium text-[28px] text-white/70">₹</span>
            <span className="font-data font-bold text-[56px] -tracking-tightest leading-none">{amount.toLocaleString('en-IN')}</span>
          </div>

          {/* Slider */}
          <div className="flex flex-col gap-2">
            <input
              type="range"
              min={STAKE_MIN}
              max={STAKE_MAX}
              step={100}
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value, 10))}
              className="w-full accent-accent-lime cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-white/60 font-data">
              <span>₹{STAKE_MIN}</span>
              <span>₹{STAKE_MAX.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Chips */}
          <div className="flex gap-1.5">
            {chips.map((c) => {
              const active = amount === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAmount(c)}
                  className={`flex-1 rounded-full py-1.5 text-[11px] font-semibold transition ${
                    active ? 'bg-accent-lime text-fg-primary' : 'bg-white/10 text-white/80 hover:bg-white/15'
                  }`}
                >
                  ₹{c >= 1000 ? `${c / 1000}k` : c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Outcome preview */}
        <div className="rounded-[20px] bg-surface-card border border-border-soft p-1 flex flex-col gap-1">
          <div className="rounded-[16px] bg-accent-money/8 p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-money/15 grid place-items-center">
              <Sparkles className="w-[18px] h-[18px] text-accent-money" strokeWidth={2.4} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-h font-semibold text-[13px] text-fg-primary">Complete 25 / 30 days</div>
              <div className="text-[11px] text-fg-secondary">₹{amount.toLocaleString('en-IN')} returns to your wallet · cycle bonus FP</div>
            </div>
          </div>
          <div className="rounded-[16px] bg-warning/8 p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-warning/15 grid place-items-center">
              <HeartHandshake className="w-[18px] h-[18px] text-warning" strokeWidth={2.4} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-h font-semibold text-[13px] text-fg-primary">Miss the threshold</div>
              <div className="text-[11px] text-fg-secondary">₹{amount.toLocaleString('en-IN')} → GiveIndia in your name · 80G receipt</div>
            </div>
          </div>
        </div>

        {/* Freeze tier card */}
        <div className="rounded-[16px] bg-surface-secondary p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-primary/20 grid place-items-center">
            <Snowflake className="w-[18px] h-[18px] text-accent-primary" strokeWidth={2.4} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-h font-semibold text-[13px] text-fg-primary">{freezes} freezes this cycle</div>
            <div className="text-[11px] text-fg-secondary">
              {amount < 1000 && 'Starter stake (₹100–₹999) → 2 freezes'}
              {amount >= 1000 && amount < 5000 && 'Standard stake (₹1k–₹4,999) → 3 freezes'}
              {amount >= 5000 && 'High stake (₹5k+) → 4 freezes'}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="pt-1">
          <Button variant="primary" icon={Lock} onClick={commit} className="w-full">
            Review plan with ₹{amount.toLocaleString('en-IN')} stake
          </Button>
          <div className="flex items-center justify-center gap-1.5 pt-2.5">
            <ArrowRight className="w-3 h-3 text-fg-muted" strokeWidth={2.4} />
            <span className="text-[10px] text-fg-muted">FitStake takes nothing either way. Win or lose, the platform earns ₹0.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

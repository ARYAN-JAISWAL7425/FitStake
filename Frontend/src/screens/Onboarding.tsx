import { Zap, Dumbbell, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBar } from '../components/StatusBar';
import { Button } from '../components/Button';
import { routes } from '../lib/routes';

export function Onboarding() {
  return (
    <div className="h-full w-full bg-surface-inverse text-fg-inverse flex flex-col">
      <StatusBar dark />
      <div className="flex-1 flex flex-col justify-between px-6 pb-8 pt-8 overflow-hidden">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent-lime grid place-items-center">
            <Dumbbell className="w-4 h-4 text-fg-primary" strokeWidth={2.5} />
          </div>
          <span className="font-h font-bold text-[18px] tracking-tight">FitStake</span>
        </div>

        <div className="flex flex-col gap-6">
          <div className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/10 ring-1 ring-white/15 px-3.5 py-1.5">
            <Zap className="w-3 h-3 text-accent-lime" strokeWidth={2.5} />
            <span className="text-[11px] font-semibold tracking-wider">Skin in the game</span>
          </div>
          <h1 className="font-h font-bold text-[44px] leading-[1.05] tracking-tightest">
            Stake on yourself.<br />Show up for 30 days.
          </h1>
          <p className="text-[15px] leading-[1.5] text-white/70">
            Lock your money behind your fitness goals. Complete them — get it back. Miss them — it goes to charity in your name. <span className="text-fg-inverse font-medium">We never take a cent from your stake.</span>
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { value: '94%', label: 'Goal hit rate' },
              { value: '₹50L', label: 'Staked monthly' },
              { value: '4.9★', label: 'App rating' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/8 px-3 py-3 ring-1 ring-white/10">
                <div className="font-data font-bold text-[18px] text-accent-lime">{s.value}</div>
                <div className="text-[10px] text-white/60 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <Button to={routes.register} variant="primary" iconRight={ArrowRight} className="w-full">
            Start staking
          </Button>
          <Link to={routes.login} className="text-[13px] text-white/70 hover:text-white">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

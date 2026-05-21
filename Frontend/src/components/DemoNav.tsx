import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Grid2x2, X } from 'lucide-react';
import { routes, RouteKey } from '../lib/routes';

// Demo-only floating menu so you can jump to any screen during a presentation.
// Remove this component from App.tsx for a "production" build.
const screens: { key: RouteKey; label: string; group: 'Main' | 'Auth' | 'Setup' | 'States' }[] = [
  { key: 'onboarding', label: 'Onboarding', group: 'Main' },
  { key: 'home', label: 'Home', group: 'Main' },
  { key: 'goals', label: 'Goals', group: 'Main' },
  { key: 'wallet', label: 'Wallet', group: 'Main' },
  { key: 'rewards', label: 'Rewards', group: 'Main' },
  { key: 'profile', label: 'Profile', group: 'Main' },
  { key: 'group', label: 'Group', group: 'Main' },
  { key: 'login', label: 'Login', group: 'Auth' },
  { key: 'register', label: 'Register', group: 'Auth' },
  { key: 'forgotPassword', label: 'Forgot password', group: 'Auth' },
  { key: 'goalSetup', label: 'Goal setup', group: 'Setup' },
  { key: 'stakeSelect', label: 'Stake select', group: 'Setup' },
  { key: 'planReview', label: 'PlanReview', group: 'Setup' },
  { key: 'cycleComplete', label: 'CycleComplete (win)', group: 'States' },
  { key: 'missed', label: 'Missed (loss)', group: 'States' },
];

const groups = ['Main', 'Auth', 'Setup', 'States'] as const;

export function DemoNav() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  return (
    <>
      {/* Floating trigger button — top-right of the phone frame */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute top-3 right-3 z-50 w-9 h-9 rounded-full bg-fg-primary/80 backdrop-blur text-fg-inverse grid place-items-center shadow-lg ring-1 ring-white/10 hover:bg-fg-primary transition"
        aria-label="Open demo navigator"
        title="Demo nav — jump to any screen"
      >
        <Grid2x2 className="w-4 h-4" strokeWidth={2.4} />
      </button>

      {/* Overlay */}
      {open && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end" onClick={() => setOpen(false)}>
          <div
            className="w-full bg-surface-card rounded-t-3xl p-5 max-h-[80%] overflow-y-auto no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-h font-bold text-[16px] text-fg-primary">Demo navigator</div>
                <div className="text-[11px] text-fg-muted">Jump to any screen for the capstone walkthrough.</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-full bg-surface-secondary grid place-items-center"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-fg-primary" strokeWidth={2.4} />
              </button>
            </div>

            {groups.map((g) => (
              <div key={g} className="mb-4">
                <div className="text-[10px] font-semibold tracking-wider text-fg-muted mb-2">{g.toUpperCase()}</div>
                <div className="flex flex-col gap-1">
                  {screens
                    .filter((s) => s.group === g)
                    .map((s) => {
                      const path = routes[s.key];
                      const active = loc.pathname === path;
                      return (
                        <Link
                          key={s.key}
                          to={path}
                          onClick={() => setOpen(false)}
                          className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${
                            active
                              ? 'bg-accent-lime text-fg-primary'
                              : 'bg-surface-secondary/50 text-fg-primary hover:bg-surface-secondary'
                          }`}
                        >
                          <span className="font-h font-semibold text-[13px]">{s.label}</span>
                          <span className="font-data text-[10px] text-fg-muted">{path}</span>
                        </Link>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

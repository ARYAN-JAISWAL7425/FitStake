import { NavLink } from 'react-router-dom';
import { Home, ListChecks, Gift, User } from 'lucide-react';
import { routes } from '../lib/routes';

// 86px high. Mirrors the eHddj component in the .pen file.
const items = [
  { to: routes.home, label: 'Home', icon: Home },
  { to: routes.goals, label: 'Goals', icon: ListChecks },
  { to: routes.rewards, label: 'Rewards', icon: Gift },
  { to: routes.profile, label: 'Profile', icon: User },
] as const;

export function TabBar() {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[86px] bg-surface-card border-t border-border-soft px-4 pt-2 pb-6 flex items-center justify-around">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-2 px-4 rounded-full transition-colors ${
              isActive
                ? 'bg-accent-lime text-fg-primary'
                : 'text-fg-muted hover:text-fg-secondary'
            }`
          }
        >
          <Icon className="w-5 h-5" strokeWidth={2.2} />
          <span className="text-[10px] font-semibold tracking-wide">{label}</span>
        </NavLink>
      ))}
    </div>
  );
}

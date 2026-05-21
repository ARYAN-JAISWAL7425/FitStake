import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, HeartHandshake, Check, Info } from 'lucide-react';
import { StatusBar } from '../components/StatusBar';
import { routes } from '../lib/routes';
import { CHARITIES, getSelectedCharity, setSelectedCharity, Charity } from '../lib/charity';

const focusColor: Record<Charity['focus'], string> = {
  Hunger: 'bg-orange-100 text-orange-700',
  Education: 'bg-blue-100 text-blue-700',
  Health: 'bg-rose-100 text-rose-700',
  'Disaster relief': 'bg-amber-100 text-amber-700',
  Environment: 'bg-emerald-100 text-emerald-700',
};

export function CharityPreferences() {
  const [selectedId, setSelectedId] = useState(getSelectedCharity().id);

  const choose = (id: string) => {
    setSelectedCharity(id);
    setSelectedId(id);
  };

  return (
    <div className="h-full w-full bg-surface-primary flex flex-col overflow-hidden">
      <StatusBar />
      <div className="flex-1 px-5 pt-2 pb-5 overflow-y-auto no-scrollbar space-y-3.5">
        <div className="flex items-center justify-between">
          <Link to={routes.profile} className="w-10 h-10 rounded-full bg-surface-card border border-border-soft grid place-items-center hover:bg-surface-secondary/40 transition">
            <ArrowLeft className="w-[18px] h-[18px] text-fg-primary" strokeWidth={2.2} />
          </Link>
          <h1 className="font-h font-semibold text-[16px] text-fg-primary">Charity preference</h1>
          <div className="w-10 h-10" />
        </div>

        <div className="rounded-[20px] bg-surface-inverse text-fg-inverse p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-accent-lime grid place-items-center">
            <HeartHandshake className="w-5 h-5 text-fg-primary" strokeWidth={2.4} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-h font-bold text-[14px]">Where your missed-cycle stake goes</div>
            <div className="text-[11px] text-white/70 leading-snug">
              Pick the charity your stake supports if you don’t hit 25/30. 80G tax receipts auto-generated where supported.
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-surface-secondary p-3 flex items-start gap-2.5">
          <Info className="w-3.5 h-3.5 text-fg-primary shrink-0 mt-0.5" strokeWidth={2.4} />
          <p className="text-[11px] text-fg-secondary leading-snug">
            Stake-donations are batched and transferred monthly. Your selection here is what we record alongside the transaction; you can change it any time before a cycle resolves.
          </p>
        </div>

        <div className="rounded-[20px] bg-surface-card border border-border-soft overflow-hidden">
          {CHARITIES.map((c, i) => {
            const isSelected = c.id === selectedId;
            const isLast = i === CHARITIES.length - 1;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => choose(c.id)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3.5 transition ${
                  !isLast ? 'border-b border-border-soft' : ''
                } ${isSelected ? 'bg-accent-lime/10' : 'hover:bg-surface-secondary/40'}`}
              >
                <div className={`w-9 h-9 rounded-full grid place-items-center ${isSelected ? 'bg-accent-money text-fg-inverse' : 'bg-surface-secondary text-fg-primary'}`}>
                  {isSelected ? <Check className="w-4 h-4" strokeWidth={2.6} /> : <HeartHandshake className="w-4 h-4" strokeWidth={2.2} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-h font-semibold text-[14px] text-fg-primary">{c.name}</div>
                  <div className="text-[11px] text-fg-muted truncate">{c.tagline}</div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold tracking-wider ${focusColor[c.focus]}`}>
                  {c.focus.toUpperCase()}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-[10px] text-fg-muted text-center pt-2">
          Selection saved automatically.
        </p>
      </div>
    </div>
  );
}

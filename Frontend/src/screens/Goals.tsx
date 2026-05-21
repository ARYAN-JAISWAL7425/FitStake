import { useMemo, useState } from 'react';
import { Flame, Calendar, Footprints, Dumbbell, Droplet, Plus, Snowflake, X, Moon, Apple, Bike, LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBar } from '../components/StatusBar';
import { TabBar } from '../components/TabBar';
import { routes } from '../lib/routes';
import { useCycle } from '../hooks/useCycle';
import { useCycleDays, DayStatus } from '../hooks/useCycleDays';
import { api, ApiError } from '../lib/api';
import { emit } from '../lib/events';

// Color rules:
//   done    → solid green (success / credited)
//   freeze  → solid blue (distinct from done; user-burned a freeze)
//   missed  → solid orange (visible failure marker)
//   today   → lime with ring (current focus)
//   upcoming → muted card (future)
const stateStyles: Record<DayStatus, string> = {
  done: 'bg-accent-money text-fg-inverse',
  freeze: 'bg-[#D1D5DB] text-[#374151] border border-[#9CA3AF]',
  missed: 'bg-[#F97316] text-white border border-[#C2410C]',
  today: 'bg-accent-lime text-fg-primary ring-2 ring-fg-primary',
  upcoming: 'bg-surface-card text-fg-muted border border-border-soft',
};

const stateLabel: Record<DayStatus, string> = {
  done: 'Completed',
  freeze: 'Freeze used',
  missed: 'Missed',
  today: 'Today · in progress',
  upcoming: 'Upcoming',
};

const goalIconMap: Record<string, LucideIcon> = {
  footprints: Footprints,
  dumbbell: Dumbbell,
  droplet: Droplet,
  moon: Moon,
  apple: Apple,
  bike: Bike,
};

type GoalFilter = 'Active' | 'Completed today' | 'All';
const filters: GoalFilter[] = ['Active', 'Completed today', 'All'];

export function Goals() {
  const cycle = useCycle();
  const { data: daysData, refetch: refetchDays } = useCycleDays();
  const [selected, setSelected] = useState<number | null>(null);
  const [filter, setFilter] = useState<GoalFilter>('Active');
  const [freezing, setFreezing] = useState(false);
  const [freezeError, setFreezeError] = useState<string | null>(null);

  const hasCycle = cycle.active !== false;
  const days = daysData?.days ?? [];
  const freezesLeft = daysData?.freezesRemaining ?? cycle.freezesStarting - cycle.freezesUsed;
  const currentStreak = useMemo(() => {
    // Count consecutive 'done' days ending at the most recent past day.
    if (!days.length) return 0;
    let streak = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      const s = days[i].status;
      if (s === 'today' || s === 'upcoming') continue;
      if (s === 'done' || s === 'freeze') streak++;
      else break;
    }
    return streak;
  }, [days]);

  const selectedDay = selected !== null && days[selected] ? days[selected] : null;
  const canFreezeSelected = !!selectedDay && (selectedDay.status === 'upcoming' || selectedDay.status === 'missed' || selectedDay.status === 'today') && freezesLeft > 0;

  const useFreezeOnDay = async () => {
    if (!selectedDay || freezing) return;
    setFreezing(true);
    setFreezeError(null);
    try {
      await api.post('/cycles/current/freeze', { day: selectedDay.day });
      refetchDays();
      emit('cycle-changed');
    } catch (err) {
      setFreezeError(err instanceof ApiError ? err.message : 'Could not use freeze.');
    } finally {
      setFreezing(false);
    }
  };

  const visibleGoals = cycle.goals.filter((g) => {
    if (filter === 'All') return true;
    if (filter === 'Completed today') return g.done;
    // Active = still pending today (not yet completed).
    return !g.done;
  });

  return (
    <div className="h-full w-full bg-surface-primary flex flex-col overflow-hidden">
      <StatusBar />
      <div className="flex-1 px-5 pt-2 pb-[100px] overflow-y-auto no-scrollbar space-y-[18px]">
        <div className="flex items-center justify-between">
          <h1 className="font-h font-bold text-[22px] -tracking-tight text-fg-primary">Goals</h1>
          <Link to={hasCycle ? routes.planReview : routes.goalSetup} className="w-10 h-10 rounded-full bg-accent-lime grid place-items-center hover:brightness-95 transition">
            <Plus className="w-[18px] h-[18px] text-fg-primary" strokeWidth={2.5} />
          </Link>
        </div>

        {!hasCycle && (
          <div className="rounded-[20px] bg-surface-card border border-border-soft p-6 flex flex-col gap-3 items-start">
            <div className="font-h font-bold text-[16px] text-fg-primary">No active cycle</div>
            <p className="text-[12px] text-fg-muted leading-snug">
              Start a 30-day plan to see your goals, calendar and freeze count here.
            </p>
            <Link to={routes.goalSetup} className="rounded-full bg-accent-lime text-fg-primary px-4 py-2 text-[12px] font-semibold hover:brightness-95">
              Start a plan
            </Link>
          </div>
        )}

        {hasCycle && (
          <>
            {/* Streak card */}
            <div className="rounded-[20px] bg-surface-inverse text-fg-inverse p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-warning/20 grid place-items-center">
                <Flame className="w-7 h-7 text-warning" strokeWidth={2.4} />
              </div>
              <div className="flex-1">
                <div className="font-data font-bold text-[32px] -tracking-tight leading-none">{currentStreak} day{currentStreak === 1 ? '' : 's'}</div>
                <div className="text-[12px] text-white/70 mt-1">Current streak — keep it going</div>
              </div>
            </div>

            {/* Calendar grid */}
            <div className="rounded-[20px] bg-surface-card border border-border-soft p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-fg-primary" strokeWidth={2.4} />
                  <span className="font-h font-semibold text-[14px] text-fg-primary">Cycle {String(cycle.number).padStart(2, '0')} · {cycle.daysTotal} days</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-accent-primary/10 px-2.5 py-1">
                  <Snowflake className="w-3 h-3 text-accent-primary" strokeWidth={2.4} />
                  <span className="text-[10px] font-semibold text-accent-primary">{freezesLeft} freeze{freezesLeft === 1 ? '' : 's'} left</span>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {days.length === 0 && Array.from({ length: cycle.daysTotal }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-surface-secondary animate-pulse" />
                ))}
                {days.map((d, i) => {
                  const isSelected = selected === i;
                  return (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => setSelected(i)}
                      className={`aspect-square rounded-lg flex items-center justify-center text-[11px] font-data font-semibold transition ${stateStyles[d.status]} ${
                        isSelected ? 'ring-2 ring-fg-primary scale-105' : 'hover:brightness-95'
                      }`}
                    >
                      {d.day}
                    </button>
                  );
                })}
              </div>

              {selectedDay && (
                <div className="rounded-xl bg-surface-secondary p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg grid place-items-center text-[12px] font-data font-bold ${stateStyles[selectedDay.status]}`}>
                      {selectedDay.day}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-h font-semibold text-[12px] text-fg-primary">Day {selectedDay.day}</div>
                      <div className="text-[10px] text-fg-muted">{stateLabel[selectedDay.status]}</div>
                    </div>
                    {canFreezeSelected && (
                      <button
                        type="button"
                        onClick={useFreezeOnDay}
                        disabled={freezing}
                        className="rounded-full bg-accent-primary text-fg-inverse px-3 py-1.5 text-[11px] font-semibold flex items-center gap-1.5 hover:brightness-110 transition disabled:opacity-60"
                      >
                        <Snowflake className="w-3 h-3" strokeWidth={2.5} />
                        {freezing ? 'Using…' : `Use freeze (${freezesLeft} left)`}
                      </button>
                    )}
                    {selectedDay.status === 'freeze' && (
                      <span className="rounded-full bg-accent-primary/15 text-accent-primary px-3 py-1.5 text-[11px] font-semibold flex items-center gap-1.5">
                        <Snowflake className="w-3 h-3" strokeWidth={2.5} />
                        Freeze used
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="w-6 h-6 rounded-full grid place-items-center text-fg-muted hover:bg-surface-card transition"
                    >
                      <X className="w-3 h-3" strokeWidth={2.4} />
                    </button>
                  </div>
                  {freezeError && (
                    <div className="text-[11px] text-warning font-medium">{freezeError}</div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-3 text-[10px] text-fg-muted pt-1">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-accent-money inline-block" /> Done</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#D1D5DB] border border-[#9CA3AF] inline-block" /> Freeze</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#F97316] inline-block" /> Missed</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-accent-lime inline-block" /> Today</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-surface-secondary border border-border-soft inline-block" /> Upcoming</span>
              </div>
            </div>

            {/* Filter pills */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {filters.map((p) => {
                const active = filter === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFilter(p)}
                    className={`shrink-0 rounded-full px-3 py-[7px] text-[11px] font-semibold transition ${
                      active
                        ? 'bg-fg-primary text-fg-inverse'
                        : 'bg-surface-card border border-border-soft text-fg-secondary hover:bg-surface-secondary/40'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            {/* Goal cards from real cycle */}
            <div className="flex flex-col gap-2.5">
              {visibleGoals.length === 0 && (
                <div className="rounded-xl bg-surface-card border border-border-soft p-6 text-center text-[12px] text-fg-muted">
                  {filter === 'Completed today' ? 'Nothing completed yet today.' : 'No goals in this filter.'}
                </div>
              )}
              {visibleGoals.map((g) => {
                const Icon = goalIconMap[g.icon] ?? Footprints;
                return (
                  <div key={g.id} className="rounded-xl bg-surface-card border border-border-soft p-3.5 flex items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-full grid place-items-center ${g.done ? 'bg-accent-money/15 text-accent-money' : 'bg-surface-secondary text-fg-primary'}`}>
                      <Icon className="w-[18px] h-[18px]" strokeWidth={2.2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-h font-semibold text-[14px] text-fg-primary">{g.title}</div>
                      <div className="text-[11px] text-fg-muted">{g.progress}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      <TabBar />
    </div>
  );
}

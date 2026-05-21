import { useState } from 'react';
import { ArrowLeft, Share2, Users, TrendingUp, TrendingDown, Minus, TriangleAlert, UserPlus, Copy, Check, Plus, LogOut } from 'lucide-react';
import { StatusBar } from '../components/StatusBar';
import { Link } from 'react-router-dom';
import { routes } from '../lib/routes';
import { useSquad } from '../hooks/useSquad';
import { ApiError } from '../lib/api';
import { isAuthenticated } from '../lib/auth';

const trendIcon = { up: TrendingUp, flat: Minus, down: TrendingDown } as const;
const trendColor = { up: 'text-accent-money', flat: 'text-fg-muted', down: 'text-warning' } as const;

export function Group() {
  const { primary, squad, stats, create, join, leave } = useSquad();
  const authed = isAuthenticated();
  const atRisk = squad.find((m) => m.atRisk);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newName, setNewName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const onCreate = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await create(newName.trim());
      setNewName('');
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create squad.');
    } finally {
      setBusy(false);
    }
  };

  const onJoin = async () => {
    if (!joinCode.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await join(joinCode.trim().toUpperCase());
      setJoinCode('');
      setShowJoin(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not join — check the code.');
    } finally {
      setBusy(false);
    }
  };

  const onCopy = async () => {
    if (!primary?.code) return;
    try {
      await navigator.clipboard.writeText(primary.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {/* ignore */}
  };

  const onLeave = async () => {
    if (!primary) return;
    if (!window.confirm(`Leave "${primary.name}"?`)) return;
    setBusy(true);
    try {
      await leave(primary.id);
    } finally {
      setBusy(false);
    }
  };

  // Authenticated user with no squads → onboarding panel
  const showOnboarding = authed && !primary;

  return (
    <div className="h-full w-full bg-surface-primary flex flex-col overflow-hidden">
      <StatusBar />
      <div className="flex-1 px-5 pt-2 pb-5 overflow-y-auto no-scrollbar space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link to={routes.home} className="w-10 h-10 rounded-full bg-surface-card border border-border-soft grid place-items-center">
            <ArrowLeft className="w-[18px] h-[18px] text-fg-primary" strokeWidth={2.2} />
          </Link>
          <h1 className="font-h font-semibold text-[16px] text-fg-primary">Squad</h1>
          {primary ? (
            <button onClick={onCopy} className="w-10 h-10 rounded-full bg-surface-card border border-border-soft grid place-items-center hover:bg-surface-secondary/40">
              <Share2 className="w-4 h-4 text-fg-primary" strokeWidth={2.2} />
            </button>
          ) : <div className="w-10 h-10" />}
        </div>

        {showOnboarding && (
          <div className="rounded-[20px] bg-surface-card border border-border-soft p-5 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-accent-lime/15 grid place-items-center">
                <Users className="w-6 h-6 text-accent-primary" strokeWidth={2.2} />
              </div>
              <div className="flex-1">
                <div className="font-h font-bold text-[16px] text-fg-primary">No squad yet</div>
                <div className="text-[11px] text-fg-muted">Create one and share the invite code, or join with a friend's code.</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowCreate(true); setShowJoin(false); setError(null); }}
                className="flex-1 rounded-full bg-accent-lime text-fg-primary py-2.5 text-[12px] font-semibold flex items-center justify-center gap-1.5 hover:brightness-95"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2.4} /> Create squad
              </button>
              <button
                onClick={() => { setShowJoin(true); setShowCreate(false); setError(null); }}
                className="flex-1 rounded-full bg-surface-secondary text-fg-primary py-2.5 text-[12px] font-semibold flex items-center justify-center gap-1.5 hover:brightness-95"
              >
                <UserPlus className="w-3.5 h-3.5" strokeWidth={2.4} /> Join with code
              </button>
            </div>
          </div>
        )}

        {showCreate && (
          <div className="rounded-xl bg-surface-card border border-border-soft p-4 flex flex-col gap-2.5">
            <label className="text-[10px] font-semibold tracking-wider text-fg-muted">SQUAD NAME</label>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={40}
              placeholder="e.g. Morning Warriors"
              className="rounded-xl bg-surface-primary border border-border-soft px-3.5 py-2.5 text-[14px] font-semibold text-fg-primary outline-none focus:border-fg-primary"
            />
            <div className="flex gap-2">
              <button onClick={onCreate} disabled={busy || newName.trim().length < 2} className="flex-1 rounded-full bg-fg-primary text-fg-inverse py-2.5 text-[12px] font-semibold disabled:opacity-50">
                {busy ? 'Creating…' : 'Create'}
              </button>
              <button onClick={() => setShowCreate(false)} className="rounded-full bg-surface-secondary text-fg-secondary py-2.5 px-4 text-[12px] font-semibold">Cancel</button>
            </div>
          </div>
        )}

        {showJoin && (
          <div className="rounded-xl bg-surface-card border border-border-soft p-4 flex flex-col gap-2.5">
            <label className="text-[10px] font-semibold tracking-wider text-fg-muted">INVITE CODE</label>
            <input
              autoFocus
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              maxLength={12}
              placeholder="e.g. K7HM9B"
              className="rounded-xl bg-surface-primary border border-border-soft px-3.5 py-2.5 text-[16px] font-data font-bold text-fg-primary outline-none focus:border-fg-primary tracking-widest"
            />
            <div className="flex gap-2">
              <button onClick={onJoin} disabled={busy || joinCode.length < 4} className="flex-1 rounded-full bg-fg-primary text-fg-inverse py-2.5 text-[12px] font-semibold disabled:opacity-50">
                {busy ? 'Joining…' : 'Join'}
              </button>
              <button onClick={() => setShowJoin(false)} className="rounded-full bg-surface-secondary text-fg-secondary py-2.5 px-4 text-[12px] font-semibold">Cancel</button>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-warning/10 border border-warning/30 px-3.5 py-2.5 text-[12px] text-warning font-medium">
            {error}
          </div>
        )}

        {/* Squad hero (dark) — only if we have a squad */}
        {primary && (
        <div className="rounded-[20px] bg-surface-inverse text-fg-inverse p-[18px] flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3 text-accent-lime" strokeWidth={2.4} />
              <span className="text-[11px] font-semibold tracking-wider text-accent-lime">{stats.name.toUpperCase()}</span>
            </div>
            <button onClick={onCopy} className="rounded-full bg-white/10 px-2.5 py-1 hover:bg-white/15 flex items-center gap-1.5">
              {copied ? <Check className="w-3 h-3 text-accent-lime" strokeWidth={2.6} /> : <Copy className="w-3 h-3 text-accent-lime" strokeWidth={2.4} />}
              <span className="font-data text-[11px] font-bold tracking-widest text-accent-lime">{primary.code}</span>
            </button>
          </div>
          <h2 className="font-h font-bold text-[22px] leading-tight -tracking-tight">Your squad<br />shows up</h2>
          <div className="flex -space-x-2">
            {squad.map((m) => (
              <div
                key={m.id}
                className="w-9 h-9 rounded-full grid place-items-center font-h font-bold text-[13px] text-fg-inverse ring-2 ring-surface-inverse"
                style={{ backgroundColor: m.color }}
              >
                {m.initial}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/10 p-3 flex flex-col gap-0.5">
              <span className="font-data font-bold text-[14px] text-accent-lime">{stats.squadAvg}%</span>
              <span className="text-[10px] text-white/70">Squad avg</span>
            </div>
            <div className="rounded-xl bg-white/10 p-3 flex flex-col gap-0.5">
              <span className="font-data font-bold text-[14px] text-accent-lime">{stats.topStreak} days</span>
              <span className="text-[10px] text-white/70">Top streak</span>
            </div>
            <div className="rounded-xl bg-white/10 p-3 flex flex-col gap-0.5">
              <span className="font-data font-bold text-[14px] text-accent-lime">{stats.members}</span>
              <span className="text-[10px] text-white/70">Members</span>
            </div>
          </div>
        </div>
        )}

        {/* Leaderboard */}
        {primary && (
        <>
          <h2 className="font-h font-semibold text-[15px] text-fg-primary">Squad leaderboard</h2>
          <div className="rounded-[20px] bg-surface-card border border-border-soft overflow-hidden">
            {squad.map((m, i) => {
              const isLast = i === squad.length - 1;
              const isYou = m.isYou ?? m.name === 'You';
              const Trend = trendIcon[m.trend];
              const tColor = trendColor[m.trend];
              const scoreColor = m.atRisk ? 'text-warning' : i === 0 ? 'text-accent-money' : 'text-fg-primary';
              return (
                <div
                  key={m.id}
                  className={`flex items-center gap-3 px-3.5 py-3 ${isYou ? 'bg-surface-secondary' : ''} ${!isLast ? 'border-b border-border-soft' : ''}`}
                >
                  <span className="font-data font-semibold text-[12px] text-fg-muted w-6">#{i + 1}</span>
                  <div className="w-8 h-8 rounded-full grid place-items-center font-h font-bold text-[12px] text-fg-inverse" style={{ backgroundColor: m.color }}>
                    {m.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-h font-semibold text-[14px] text-fg-primary">{m.name}</div>
                    <div className="h-1 rounded-full bg-border-soft overflow-hidden mt-1 max-w-[140px]">
                      <div className="h-full rounded-full" style={{ width: `${m.pct}%`, backgroundColor: m.color }} />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className={`font-data font-bold text-[13px] ${scoreColor}`}>{m.pct}%</span>
                    <div className="flex items-center gap-1">
                      <Trend className={`w-2 h-2 ${tColor}`} strokeWidth={2.5} />
                      <span className={`text-[9px] font-semibold ${tColor}`}>
                        {m.trend === 'flat' ? '=' : (m.trend === 'up' ? '↑' : '↓') + ' ' + m.trendValue}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {atRisk && (
            <div className="rounded-xl bg-surface-card border border-warning p-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-warning/15 grid place-items-center">
                <TriangleAlert className="w-4 h-4 text-warning" strokeWidth={2.4} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-h font-semibold text-[13px] text-fg-primary">Send {atRisk.name} some encouragement?</div>
                <div className="text-[11px] text-fg-secondary leading-snug">
                  At {atRisk.pct}% — a nudge from a teammate can flip a cycle.
                </div>
              </div>
              <button className="rounded-full bg-fg-primary text-fg-inverse px-3 py-2 text-[11px] font-semibold">Send nudge</button>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => { setShowJoin(false); setShowCreate(false); setShowJoin(true); setError(null); }}
              className="flex-1 rounded-full bg-surface-card border border-border-soft py-3 px-4 flex items-center justify-center gap-2 hover:bg-surface-secondary/40 transition"
            >
              <UserPlus className="w-3.5 h-3.5 text-fg-primary" strokeWidth={2.4} />
              <span className="text-[13px] font-semibold text-fg-primary">Join another</span>
            </button>
            <button
              onClick={onLeave}
              disabled={busy}
              className="rounded-full bg-warning/10 text-warning border border-warning/30 py-3 px-4 flex items-center justify-center gap-2 hover:bg-warning/15 transition disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={2.4} />
              <span className="text-[13px] font-semibold">Leave</span>
            </button>
          </div>
        </>
        )}
      </div>
    </div>
  );
}

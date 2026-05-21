import { useEffect, useState } from 'react';
import { Settings, Medal, ChevronRight, ShieldCheck, Users, HeartHandshake, Receipt, LifeBuoy, LogOut, Activity, Link2Off, CircleCheck, TriangleAlert } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { StatusBar } from '../components/StatusBar';
import { TabBar } from '../components/TabBar';
import { useUser } from '../hooks/useUser';
import { useHealthIntegration } from '../hooks/useHealthIntegration';
import { mockTierBenefits } from '../data/mock';
import { routes } from '../lib/routes';
import { clearAuth } from '../lib/auth';
import { getSelectedCharity } from '../lib/charity';
import { useSquad } from '../hooks/useSquad';

type MenuItem = {
  label: string;
  icon: typeof ShieldCheck;
  sub: string;
  to?: string;
  action?: 'signOut';
};

export function Profile() {
  const user = useUser();
  const perks = mockTierBenefits[user.tier];
  const navigate = useNavigate();
  const { status: healthStatus, connect, disconnect, syncSteps } = useHealthIntegration();
  const { primary: squad } = useSquad();
  const charity = getSelectedCharity();

  const menu: MenuItem[] = [
    { label: 'Privacy & data', icon: ShieldCheck, sub: 'DPDP rights · export · delete', to: routes.privacy },
    { label: 'Charity preferences', icon: HeartHandshake, sub: `${charity.name} (selected)`, to: routes.charity },
    {
      label: 'My squad',
      icon: Users,
      sub: squad ? `${squad.members.length} member${squad.members.length === 1 ? '' : 's'} · ${squad.name}` : 'No squad yet — tap to create or join',
      to: routes.group,
    },
    { label: 'Transactions', icon: Receipt, sub: `${user.lifetime?.cyclesDone ?? 0} cycle${user.lifetime?.cyclesDone === 1 ? '' : 's'} · ₹${((user.lifetime?.earnedBack ?? 0) + (user.lifetime?.donatedToCharity ?? 0)).toLocaleString('en-IN')} moved`, to: routes.wallet },
    { label: 'Support', icon: LifeBuoy, sub: 'Help center · contact us', to: routes.support },
    { label: 'Sign out', icon: LogOut, sub: '', action: 'signOut' },
  ];
  const [searchParams, setSearchParams] = useSearchParams();
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [stepsToday, setStepsToday] = useState<number | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Handle the redirect back from Google's consent screen.
  useEffect(() => {
    const status = searchParams.get('google_fit');
    if (status === 'connected') {
      setBanner({ kind: 'ok', text: 'Google Fit connected.' });
      setSearchParams({}, { replace: true });
    } else if (status === 'error') {
      const reason = searchParams.get('reason') ?? 'unknown';
      setBanner({ kind: 'err', text: `Google Fit error: ${reason}` });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const signOut = () => {
    clearAuth();
    navigate(routes.login);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncSteps();
      setStepsToday(res.steps);
      setLastSyncAt(new Date());
    } catch (err) {
      setBanner({ kind: 'err', text: err instanceof Error ? err.message : 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  };

  const gf = healthStatus?.providers?.['google-fit'];
  const gfConnected = !!gf?.connected;

  return (
    <div className="h-full w-full bg-surface-primary flex flex-col overflow-hidden">
      <StatusBar />
      <div className="flex-1 px-5 pt-2 pb-[100px] overflow-y-auto no-scrollbar space-y-[18px]">
        <div className="flex items-center justify-between">
          <h1 className="font-h font-bold text-[22px] -tracking-tight text-fg-primary">Profile</h1>
          <Link to={routes.wallet} className="w-10 h-10 rounded-full bg-surface-card border border-border-soft grid place-items-center hover:bg-surface-secondary/40 transition">
            <Settings className="w-[18px] h-[18px] text-fg-primary" strokeWidth={2.2} />
          </Link>
        </div>

        {/* Profile hero */}
        <div className="rounded-[20px] bg-surface-inverse text-fg-inverse p-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-accent-primary grid place-items-center font-h font-bold text-[24px] text-fg-inverse">
            {user.initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-h font-bold text-[18px]">{user.name}</div>
            <div className="text-[12px] text-white/70 mt-0.5">
              {user.tier} tier
              {(user.lifetime?.cyclesDone ?? 0) > 0
                ? ` · ${user.lifetime?.cyclesWon ?? 0} won · ${user.lifetime?.cyclesMissed ?? 0} missed`
                : ' · no cycles yet'}
            </div>
          </div>
        </div>

        {/* Lifetime stats — pulled live from /me's `lifetime` block. */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { value: `₹${(user.lifetime?.earnedBack ?? 0).toLocaleString('en-IN')}`, label: 'Earned back' },
            { value: String(user.lifetime?.cyclesDone ?? 0), label: 'Cycles done' },
            { value: `₹${(user.lifetime?.donatedToCharity ?? 0).toLocaleString('en-IN')}`, label: 'To charity' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-surface-card border border-border-soft p-3 flex flex-col gap-0.5">
              <span className="font-data font-bold text-[16px] text-fg-primary">{s.value}</span>
              <span className="text-[10px] text-fg-muted">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Tier card */}
        <div className="rounded-[20px] bg-surface-secondary p-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Medal className="w-4 h-4 text-accent-primary" strokeWidth={2.4} />
              <span className="font-h font-bold text-[14px] text-fg-primary">{user.tier} tier perks</span>
            </div>
            <span className="text-[11px] text-fg-secondary">{user.fpToNextTier.toLocaleString('en-IN')} FP to {user.nextTier}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {perks.map((p) => (
              <span key={p} className="rounded-full bg-surface-card text-fg-primary px-2.5 py-1 text-[10px] font-semibold">
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* Connection banner from ?google_fit= */}
        {banner && (
          <div className={`rounded-xl px-3.5 py-2.5 text-[12px] font-medium flex items-center gap-2 ${
            banner.kind === 'ok'
              ? 'bg-accent-money/10 border border-accent-money/30 text-accent-money'
              : 'bg-warning/10 border border-warning/30 text-warning'
          }`}>
            {banner.kind === 'ok' ? <CircleCheck className="w-4 h-4" strokeWidth={2.4} /> : <TriangleAlert className="w-4 h-4" strokeWidth={2.4} />}
            <span>{banner.text}</span>
          </div>
        )}

        {/* Google Fit card */}
        {healthStatus?.configured && (
          <div className="rounded-[20px] bg-surface-card border border-border-soft p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent-primary/15 grid place-items-center">
                <Activity className="w-[18px] h-[18px] text-accent-primary" strokeWidth={2.4} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-h font-semibold text-[13px] text-fg-primary">Google Fit</div>
                <div className="text-[11px] text-fg-muted">
                  {gfConnected
                    ? 'Connected · steps goals will be verified automatically'
                    : 'Connect to verify your steps with real activity data'}
                </div>
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold tracking-wide ${
                gfConnected ? 'bg-accent-money/15 text-accent-money' : 'bg-surface-secondary text-fg-secondary'
              }`}>
                {gfConnected ? 'CONNECTED' : 'OFF'}
              </span>
            </div>

            {stepsToday !== null && (
              <div className="rounded-xl bg-surface-secondary px-3 py-2 flex flex-col gap-0.5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-fg-secondary">Steps today</span>
                  <span className="font-data font-bold text-fg-primary">{stepsToday.toLocaleString('en-IN')}</span>
                </div>
                {lastSyncAt && (
                  <div className="text-[10px] text-fg-muted">
                    Synced at {lastSyncAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' })} · Google updates with a 1–5 min lag
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {gfConnected ? (
                <>
                  <button
                    type="button"
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex-1 rounded-full bg-accent-lime text-fg-primary py-2.5 text-[12px] font-semibold disabled:opacity-60"
                  >
                    {syncing ? 'Syncing…' : 'Sync steps now'}
                  </button>
                  <button
                    type="button"
                    onClick={disconnect}
                    className="rounded-full bg-surface-secondary text-fg-secondary py-2.5 px-4 text-[12px] font-semibold flex items-center gap-1.5"
                  >
                    <Link2Off className="w-3.5 h-3.5" strokeWidth={2.4} />
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={connect}
                  className="flex-1 rounded-full bg-accent-lime text-fg-primary py-2.5 text-[12px] font-semibold"
                >
                  Connect Google Fit
                </button>
              )}
            </div>
          </div>
        )}

        {/* Menu */}
        <div className="rounded-[20px] bg-surface-card border border-border-soft overflow-hidden">
          {menu.map((m, i) => {
            const isLast = i === menu.length - 1;
            const Icon = m.icon;
            const rowClass = `w-full flex items-center gap-3 px-4 py-3.5 text-left ${
              !isLast ? 'border-b border-border-soft' : ''
            } hover:bg-surface-secondary/30 transition`;
            const inner = (
              <>
                <div className="w-9 h-9 rounded-full bg-surface-secondary grid place-items-center">
                  <Icon className="w-[16px] h-[16px] text-fg-primary" strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-h font-semibold text-[13px] text-fg-primary">{m.label}</div>
                  {m.sub && <div className="text-[10px] text-fg-muted">{m.sub}</div>}
                </div>
                <ChevronRight className="w-4 h-4 text-fg-muted" strokeWidth={2.2} />
              </>
            );
            if (m.action === 'signOut') {
              return (
                <button key={m.label} type="button" onClick={signOut} className={rowClass}>
                  {inner}
                </button>
              );
            }
            return (
              <Link key={m.label} to={m.to ?? routes.profile} className={rowClass}>
                {inner}
              </Link>
            );
          })}
        </div>
      </div>
      <TabBar />
    </div>
  );
}

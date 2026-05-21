import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Download, Trash2, Info, FileCheck } from 'lucide-react';
import { StatusBar } from '../components/StatusBar';
import { routes } from '../lib/routes';
import { useUser } from '../hooks/useUser';
import { clearAuth } from '../lib/auth';

const RIGHTS = [
  { label: 'Right to access', desc: 'Request a copy of everything we store about you.' },
  { label: 'Right to correct', desc: 'Fix anything that’s wrong in your profile or data.' },
  { label: 'Right to erase', desc: 'Delete your account and all personal data, subject to 90-day audit retention.' },
  { label: 'Right to data portability', desc: 'Export your data in a machine-readable JSON format.' },
  { label: 'Right to withdraw consent', desc: 'Disconnect integrations (e.g. Google Fit) any time.' },
];

export function PrivacyData() {
  const user = useUser();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const exportData = () => {
    setExporting(true);
    // Browser-side download of the locally-cached user record. A real export would
    // call a backend endpoint that bundles cycles + completions + transactions.
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), user }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitstake-data-${user.email || 'me'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMsg('Export downloaded.');
    setExporting(false);
    setTimeout(() => setMsg(null), 3000);
  };

  const deleteAccount = () => {
    if (!window.confirm('Delete your FitStake account? This signs you out immediately. Personal data is purged within 30 days; only anonymized audit logs are kept.')) return;
    setDeleting(true);
    // TODO: backend DELETE /me endpoint. For now we just sign the user out locally.
    setTimeout(() => {
      clearAuth();
      navigate(routes.login, { replace: true });
    }, 500);
  };

  return (
    <div className="h-full w-full bg-surface-primary flex flex-col overflow-hidden">
      <StatusBar />
      <div className="flex-1 px-5 pt-2 pb-5 overflow-y-auto no-scrollbar space-y-3.5">
        <div className="flex items-center justify-between">
          <Link to={routes.profile} className="w-10 h-10 rounded-full bg-surface-card border border-border-soft grid place-items-center hover:bg-surface-secondary/40 transition">
            <ArrowLeft className="w-[18px] h-[18px] text-fg-primary" strokeWidth={2.2} />
          </Link>
          <h1 className="font-h font-semibold text-[16px] text-fg-primary">Privacy & data</h1>
          <div className="w-10 h-10" />
        </div>

        <div className="rounded-[20px] bg-surface-inverse text-fg-inverse p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-accent-lime grid place-items-center">
            <ShieldCheck className="w-5 h-5 text-fg-primary" strokeWidth={2.4} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-h font-bold text-[14px]">Your data, your rules</div>
            <div className="text-[11px] text-white/70">DPDP Act 2023 compliant · India</div>
          </div>
        </div>

        <div className="rounded-xl bg-surface-secondary p-3 flex items-start gap-2.5">
          <Info className="w-3.5 h-3.5 text-fg-primary shrink-0 mt-0.5" strokeWidth={2.4} />
          <p className="text-[11px] text-fg-secondary leading-snug">
            We collect only what’s needed to run cycles: email, name, FP balance, wallet balance, cycle history. Photo proofs are stored hashed; raw image bytes are deleted after 90 days unless required for an audit.
          </p>
        </div>

        <h2 className="font-h font-semibold text-[13px] text-fg-primary pt-1">Your rights under DPDP</h2>
        <div className="rounded-[20px] bg-surface-card border border-border-soft overflow-hidden">
          {RIGHTS.map((r, i) => (
            <div key={r.label} className={`flex items-start gap-3 px-4 py-3.5 ${i < RIGHTS.length - 1 ? 'border-b border-border-soft' : ''}`}>
              <FileCheck className="w-4 h-4 text-accent-money mt-0.5 shrink-0" strokeWidth={2.4} />
              <div className="flex-1 min-w-0">
                <div className="font-h font-semibold text-[13px] text-fg-primary">{r.label}</div>
                <div className="text-[11px] text-fg-muted leading-snug">{r.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {msg && (
          <div className="rounded-xl bg-accent-money/10 border border-accent-money/30 px-3.5 py-2.5 text-[12px] text-accent-money font-medium">
            {msg}
          </div>
        )}

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={exportData}
            disabled={exporting}
            className="rounded-full bg-fg-primary text-fg-inverse py-3 px-4 flex items-center justify-center gap-2 hover:brightness-110 transition disabled:opacity-60"
          >
            <Download className="w-4 h-4" strokeWidth={2.4} />
            <span className="text-[13px] font-semibold">{exporting ? 'Preparing…' : 'Export my data (JSON)'}</span>
          </button>
          <button
            type="button"
            onClick={deleteAccount}
            disabled={deleting}
            className="rounded-full bg-warning/10 text-warning border border-warning/30 py-3 px-4 flex items-center justify-center gap-2 hover:bg-warning/15 transition disabled:opacity-60"
          >
            <Trash2 className="w-4 h-4" strokeWidth={2.4} />
            <span className="text-[13px] font-semibold">{deleting ? 'Signing out…' : 'Delete my account'}</span>
          </button>
        </div>

        <p className="text-[10px] text-fg-muted leading-snug pt-1">
          Questions or requests? Email <span className="font-semibold text-fg-primary">privacy@fitstake.app</span> — we respond within 7 days as required under DPDP.
        </p>
      </div>
    </div>
  );
}

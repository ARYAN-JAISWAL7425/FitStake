import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Plus, X, Footprints, Dumbbell, Droplet, Moon, Apple, Bike, LucideIcon, Sparkles } from 'lucide-react';
import { StatusBar } from '../components/StatusBar';
import { Button } from '../components/Button';
import { routes } from '../lib/routes';
import { getGoalDraft, setGoalDraft, DraftGoal } from '../lib/goalDraft';

type Difficulty = 'Easy' | 'Medium' | 'Hard';
const difficultyMultiplier: Record<Difficulty, number> = { Easy: 1.0, Medium: 1.5, Hard: 2.0 };
const difficultyColor: Record<Difficulty, string> = {
  Easy: 'bg-surface-secondary text-fg-secondary',
  Medium: 'bg-accent-primary/15 text-accent-primary',
  Hard: 'bg-fg-primary text-fg-inverse',
};
const baseFp = 30;

type Template = {
  id: string;
  icon: LucideIcon;
  title: string;
  defaultTarget: string;
  unit: string;
  // Universal target ranges → difficulty. Same for everyone, no baseline.
  thresholds: { medium: number; hard: number };
};

const templates: Template[] = [
  { id: 'steps', icon: Footprints, title: 'Daily steps', defaultTarget: '8000', unit: 'steps', thresholds: { medium: 5000, hard: 9000 } },
  { id: 'strength', icon: Dumbbell, title: 'Strength training', defaultTarget: '30', unit: 'min', thresholds: { medium: 20, hard: 45 } },
  { id: 'water', icon: Droplet, title: 'Drink water', defaultTarget: '2', unit: 'L', thresholds: { medium: 1.5, hard: 2.5 } },
  { id: 'sleep', icon: Moon, title: 'Sleep', defaultTarget: '7', unit: 'hours', thresholds: { medium: 6, hard: 8 } },
  { id: 'diet', icon: Apple, title: 'Healthy meals', defaultTarget: '3', unit: 'meals', thresholds: { medium: 2, hard: 3 } },
  { id: 'cardio', icon: Bike, title: 'Cardio session', defaultTarget: '20', unit: 'min', thresholds: { medium: 15, hard: 30 } },
];

const templateById = (id: string) => templates.find((t) => t.id === id)!;

function difficultyFor(templateId: string, target: string): Difficulty {
  const n = parseFloat(target);
  if (Number.isNaN(n)) return 'Easy';
  const { medium, hard } = templateById(templateId).thresholds;
  if (n >= hard) return 'Hard';
  if (n >= medium) return 'Medium';
  return 'Easy';
}

type Goal = {
  id: string;
  templateId: string;
  icon: LucideIcon;
  title: string;
  target: string;
  unit: string;
};

const iconForTemplate = (id: string): LucideIcon =>
  templates.find((t) => t.id === id)?.icon ?? Footprints;

function hydrateDraft(draft: DraftGoal[]): Goal[] {
  return draft.map((d) => ({ ...d, icon: iconForTemplate(d.templateId) }));
}

const defaultGoals: Goal[] = [
  { id: 'g1', templateId: 'steps', icon: Footprints, title: 'Daily steps', target: '8000', unit: 'steps' },
];

export function GoalSetup() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<Goal[]>(() => {
    const draft = getGoalDraft();
    return draft && draft.length > 0 ? hydrateDraft(draft) : defaultGoals;
  });
  const [pickerOpen, setPickerOpen] = useState(false);

  // Persist on every change. Strip the icon — it's a React component, not serializable.
  useEffect(() => {
    const serializable: DraftGoal[] = goals.map(({ icon: _icon, ...rest }) => rest as DraftGoal);
    setGoalDraft(serializable);
  }, [goals]);

  const canContinue = goals.length >= 1;
  const dailyFp = goals.reduce((sum, g) => sum + Math.round(baseFp * difficultyMultiplier[difficultyFor(g.templateId, g.target)]), 0);
  const cycleFp = dailyFp * 25 + 500 + 28 * 20;

  const addGoal = (t: Template) => {
    setGoals((prev) => [
      ...prev,
      { id: `g${Date.now()}`, templateId: t.id, icon: t.icon, title: t.title, target: t.defaultTarget, unit: t.unit },
    ]);
    setPickerOpen(false);
  };

  const removeGoal = (id: string) => setGoals((prev) => prev.filter((g) => g.id !== id));

  const updateGoal = (id: string, patch: Partial<Goal>) =>
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));

  const usedTemplateIds = new Set(goals.map((g) => g.templateId));
  const availableTemplates = templates.filter((t) => !usedTemplateIds.has(t.id));

  return (
    <div className="h-full w-full bg-surface-primary flex flex-col overflow-hidden">
      <StatusBar />
      <div className="flex-1 px-5 pt-2 pb-5 overflow-y-auto no-scrollbar space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link to={routes.login} className="w-10 h-10 rounded-full bg-surface-card border border-border-soft grid place-items-center hover:bg-surface-secondary/40 transition">
            <ArrowLeft className="w-[18px] h-[18px] text-fg-primary" strokeWidth={2.2} />
          </Link>
          <h1 className="font-h font-semibold text-[16px] text-fg-primary">Build your plan</h1>
          <div className="w-10 h-10" />
        </div>

        {/* Hero card */}
        <div className="rounded-[20px] bg-surface-inverse text-fg-inverse p-5 flex flex-col gap-3">
          <div className="text-[11px] font-semibold tracking-wider text-white/70">YOUR 30-DAY CYCLE</div>
          <p className="font-h font-bold text-[18px] -tracking-tight leading-snug">
            Pick the goals you'll commit to. The harder the target, the more FP each completion earns.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl bg-white/10 p-3">
              <div className="text-[10px] text-white/70 tracking-wide">DAILY FP</div>
              <div className="font-data font-bold text-[18px] text-accent-lime mt-0.5">+{dailyFp}</div>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <div className="text-[10px] text-white/70 tracking-wide">FULL CYCLE</div>
              <div className="font-data font-bold text-[18px] mt-0.5">~{cycleFp.toLocaleString('en-IN')} FP</div>
            </div>
          </div>
        </div>

        {/* Goal list */}
        <div className="flex flex-col gap-2">
          {goals.length === 0 && (
            <div className="rounded-xl bg-surface-card border border-dashed border-border-soft p-6 text-center text-[12px] text-fg-muted">
              No goals yet. Tap "Add a goal" below.
            </div>
          )}
          {goals.map((g) => {
            const Icon = g.icon;
            const difficulty = difficultyFor(g.templateId, g.target);
            const fp = Math.round(baseFp * difficultyMultiplier[difficulty]);
            const t = templateById(g.templateId);
            return (
              <div key={g.id} className="rounded-[18px] bg-surface-card border border-border-soft p-3.5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-secondary grid place-items-center shrink-0">
                    <Icon className="w-[18px] h-[18px] text-fg-primary" strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-h font-semibold text-[14px] text-fg-primary">{g.title}</div>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide ${difficultyColor[difficulty]}`}>
                        {difficulty.toUpperCase()} · {difficultyMultiplier[difficulty]}×
                      </span>
                    </div>
                    <div className="text-[10px] text-fg-muted">+{fp} FP per completion</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeGoal(g.id)}
                    className="w-8 h-8 rounded-full bg-surface-secondary grid place-items-center hover:bg-warning/15 transition"
                    aria-label="Remove goal"
                  >
                    <X className="w-3.5 h-3.5 text-fg-muted" strokeWidth={2.4} />
                  </button>
                </div>

                {/* Target */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-fg-muted shrink-0">Target</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={g.target}
                    onChange={(e) => updateGoal(g.id, { target: e.target.value.replace(/[^0-9.]/g, '') })}
                    className="flex-1 rounded-lg bg-surface-primary border border-border-soft px-2.5 py-1.5 text-[13px] font-data font-semibold text-fg-primary outline-none focus:border-fg-primary"
                  />
                  <span className="text-[11px] text-fg-muted shrink-0">{g.unit}</span>
                </div>

                {/* Range hint */}
                <div className="text-[10px] text-fg-muted leading-snug">
                  Below {t.thresholds.medium}{t.unit} = Easy · {t.thresholds.medium}-{t.thresholds.hard}{t.unit} = Medium · {t.thresholds.hard}{t.unit}+ = Hard
                </div>
              </div>
            );
          })}
        </div>

        {/* Add goal */}
        {availableTemplates.length > 0 && !pickerOpen && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="w-full rounded-xl bg-surface-card border border-dashed border-border-soft py-3.5 px-4 flex items-center justify-center gap-2 hover:bg-surface-secondary/40 transition"
          >
            <Plus className="w-4 h-4 text-fg-primary" strokeWidth={2.4} />
            <span className="text-[13px] font-semibold text-fg-primary">Add a goal</span>
          </button>
        )}

        {pickerOpen && (
          <div className="rounded-[18px] bg-surface-card border border-border-soft p-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="font-h font-semibold text-[12px] text-fg-primary">Pick a goal type</span>
              <button type="button" onClick={() => setPickerOpen(false)} className="text-fg-muted">
                <X className="w-3.5 h-3.5" strokeWidth={2.4} />
              </button>
            </div>
            {availableTemplates.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => addGoal(t)}
                  className="flex items-center gap-3 rounded-xl bg-surface-secondary/50 px-3 py-2.5 hover:bg-surface-secondary transition text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-surface-card grid place-items-center shrink-0">
                    <Icon className="w-4 h-4 text-fg-primary" strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-h font-semibold text-[12px] text-fg-primary">{t.title}</div>
                    <div className="text-[10px] text-fg-muted">Default: {t.defaultTarget} {t.unit}</div>
                  </div>
                  <Plus className="w-4 h-4 text-fg-muted" strokeWidth={2.4} />
                </button>
              );
            })}
          </div>
        )}

        {/* Spacer + CTA */}
        <div className="pt-2 flex flex-col gap-1.5">
          <Button
            variant="primary"
            iconRight={ArrowRight}
            disabled={!canContinue}
            onClick={() => navigate(routes.stakeSelect)}
            className="w-full"
          >
            Next: set your stake
          </Button>
          <div className="flex items-center justify-center gap-1.5 pt-1">
            <Sparkles className="w-3 h-3 text-fg-muted" strokeWidth={2.4} />
            <span className="text-[10px] text-fg-muted">All goals must be completed daily to credit the day.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

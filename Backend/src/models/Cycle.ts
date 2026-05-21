import { Schema, model, InferSchemaType, HydratedDocument, Types } from 'mongoose';

export const TEMPLATE_IDS = ['steps', 'strength', 'water', 'sleep', 'diet', 'cardio'] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

// Universal target → difficulty thresholds. MUST match Frontend/src/screens/GoalSetup.tsx.
const thresholds: Record<TemplateId, { medium: number; hard: number; unit: string }> = {
  steps: { medium: 5000, hard: 9000, unit: 'steps' },
  strength: { medium: 20, hard: 45, unit: 'min' },
  water: { medium: 1.5, hard: 2.5, unit: 'L' },
  sleep: { medium: 6, hard: 8, unit: 'hours' },
  diet: { medium: 2, hard: 3, unit: 'meals' },
  cardio: { medium: 15, hard: 30, unit: 'min' },
};

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
const difficultyMultiplier: Record<Difficulty, number> = { Easy: 1.0, Medium: 1.5, Hard: 2.0 };
const baseFp = 30;

export function difficultyFor(templateId: TemplateId, target: number): Difficulty {
  const { medium, hard } = thresholds[templateId];
  if (target >= hard) return 'Hard';
  if (target >= medium) return 'Medium';
  return 'Easy';
}

export function fpFor(templateId: TemplateId, target: number): number {
  return Math.round(baseFp * difficultyMultiplier[difficultyFor(templateId, target)]);
}

export function freezesForStake(stake: number): number {
  if (stake >= 5000) return 4;
  if (stake >= 1000) return 3;
  return 2;
}

const goalSchema = new Schema(
  {
    templateId: { type: String, enum: TEMPLATE_IDS, required: true },
    title: { type: String, required: true },
    target: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
    fpPerCompletion: { type: Number, required: true },
  },
  { _id: true }
);

const cycleSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    number: { type: Number, required: true }, // sequence # for this user (1, 2, 3...)
    stake: { type: Number, required: true, min: 100, max: 10000 },
    daysTotal: { type: Number, default: 30 },
    threshold: { type: Number, default: 25 },
    startedAt: { type: Date, required: true, default: () => new Date() },
    endsAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['active', 'completed', 'missed', 'cancelled'],
      default: 'active',
      index: true,
    },
    credited: { type: Number, default: 0 },
    realMisses: { type: Number, default: 0 },
    freezesUsed: { type: Number, default: 0 },
    freezesStarting: { type: Number, required: true },
    /** Days (1-indexed) the freeze auto-burn marked as saved. Each entry consumes one freeze. */
    frozenDays: { type: [Number], default: [] },
    goals: { type: [goalSchema], required: true },
  },
  { timestamps: true }
);

export type CycleDoc = HydratedDocument<InferSchemaType<typeof cycleSchema>>;

const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Day number (1-indexed) within the cycle, clamped to [1, daysTotal]. */
export function currentDayOf(c: CycleDoc, now: Date = new Date()): number {
  const elapsed = Math.floor((now.getTime() - c.startedAt.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.min(c.daysTotal, elapsed + 1));
}

export type ProofInfo = { proofKind: 'auto-steps' | 'photo' | 'tap'; verifiedSteps?: number | null };

export function toCycleDTO(
  c: CycleDoc,
  completedGoalIds: string[] = [],
  proofByGoalId: Record<string, ProofInfo> = {}
) {
  const now = new Date();
  const day = currentDayOf(c, now);
  const daysLeft = Math.max(0, c.daysTotal - day);
  return {
    id: (c._id as Types.ObjectId).toString(),
    number: c.number,
    day,
    daysTotal: c.daysTotal,
    threshold: c.threshold,
    stake: c.stake,
    credited: c.credited,
    realMisses: c.realMisses,
    freezesUsed: c.freezesUsed,
    freezesStarting: c.freezesStarting,
    daysLeft,
    creditedNeeded: Math.max(c.threshold - c.credited, 0),
    endDate: `${monthShort[c.endsAt.getMonth()]} ${c.endsAt.getDate()}`,
    status: c.status,
    completedToday: completedGoalIds,
    goals: c.goals.map((g) => {
      const id = (g._id as Types.ObjectId).toString();
      const proof = proofByGoalId[id];
      return {
        id,
        templateId: g.templateId,
        title: g.title,
        target: g.target,
        unit: g.unit,
        difficulty: g.difficulty,
        fpPerCompletion: g.fpPerCompletion,
        proofKind: proof?.proofKind ?? null,
        verifiedSteps: proof?.verifiedSteps ?? null,
      };
    }),
  };
}

export const Cycle = model('Cycle', cycleSchema);

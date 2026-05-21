import { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';

export const FP_SOURCES = [
  'goal_completion',
  'day_complete_bonus',
  'streak_bonus',
  'cycle_complete',
  'failure_effort',
  'personal_best',
  'redemption',
] as const;
export type FpSource = (typeof FP_SOURCES)[number];

const fpEventSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cycleId: { type: Schema.Types.ObjectId, ref: 'Cycle', default: null },
    goalId: { type: String, default: null },
    day: { type: Number, default: null },
    source: { type: String, enum: FP_SOURCES, required: true },
    amount: { type: Number, required: true },
  },
  { timestamps: true }
);

export type FpEventDoc = HydratedDocument<InferSchemaType<typeof fpEventSchema>>;
export const FpEvent = model('FpEvent', fpEventSchema);

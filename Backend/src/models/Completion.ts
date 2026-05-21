import { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';

const completionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cycleId: { type: Schema.Types.ObjectId, ref: 'Cycle', required: true, index: true },
    // We store the goal subdocument _id (string for simplicity).
    goalId: { type: String, required: true },
    // 1-indexed day number within the cycle (1..30).
    day: { type: Number, required: true, min: 1 },
    fpAwarded: { type: Number, required: true, min: 0 },
    /** 'auto-steps' = Google Fit, 'photo' = user-uploaded proof, 'tap' = honor system. */
    proofKind: { type: String, enum: ['auto-steps', 'photo', 'tap'], default: 'tap' },
    /** Relative path to uploaded photo (when proofKind = 'photo'). */
    photoPath: { type: String, default: null },
    /** SHA-256 of uploaded photo bytes — used for dedupe. */
    photoSha256: { type: String, default: null, index: true },
    /** Auto-verified step count (when proofKind = 'auto-steps'). */
    verifiedSteps: { type: Number, default: null },
  },
  { timestamps: true }
);

// One completion per (cycle, goal, day). Server uses this to enforce idempotency.
completionSchema.index({ cycleId: 1, goalId: 1, day: 1 }, { unique: true });

export type CompletionDoc = HydratedDocument<InferSchemaType<typeof completionSchema>>;
export const Completion = model('Completion', completionSchema);

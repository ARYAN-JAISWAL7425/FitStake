import { Schema, model, InferSchemaType, HydratedDocument, Types } from 'mongoose';

const redemptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: ['coupon', 'store'], required: true },
    itemId: { type: String, required: true },
    title: { type: String, required: true },
    fpCost: { type: Number, required: true, min: 0 },
    /** Short redemption code shown to the user (e.g. FS-3A8X-K2). Demo-only. */
    code: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

redemptionSchema.index({ userId: 1, createdAt: -1 });

export type RedemptionDoc = HydratedDocument<InferSchemaType<typeof redemptionSchema>>;
export const Redemption = model('Redemption', redemptionSchema);

export function toRedemptionDTO(r: RedemptionDoc) {
  return {
    id: (r._id as Types.ObjectId).toString(),
    kind: r.kind,
    itemId: r.itemId,
    title: r.title,
    fpCost: r.fpCost,
    code: r.code,
    createdAt: r.createdAt,
  };
}

/** Generates a short, friendly code like "FS-3A8X-K2P9". */
export function generateRedemptionCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion
  const pick = (n: number) =>
    Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  return `FS-${pick(4)}-${pick(4)}`;
}

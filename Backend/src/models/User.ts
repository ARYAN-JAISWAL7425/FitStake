import { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    tier: { type: String, enum: ['Bronze', 'Silver', 'Gold', 'Platinum'], default: 'Bronze' },
    fp: { type: Number, default: 0 },
    walletBalance: { type: Number, default: 0 },
    available: { type: Number, default: 0 },
    // Set when a forgot-password is requested. Cleared on use or expiry.
    passwordResetToken: { type: String, default: null },
    passwordResetExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;

export const User = model('User', userSchema);

/** Shape returned to clients — strips passwordHash + reset fields. */
export function toUserDTO(u: UserDoc) {
  return {
    id: u._id.toString(),
    email: u.email,
    name: u.name,
    initial: u.name.charAt(0).toUpperCase(),
    tier: u.tier,
    fp: u.fp,
    walletBalance: u.walletBalance,
    available: u.available,
    createdAt: u.createdAt,
  };
}

import { Schema, model, InferSchemaType, HydratedDocument, Types } from 'mongoose';

export const TXN_KINDS = [
  'deposit',       // user adds money to wallet (via Razorpay or Stripe)
  'withdraw',      // user removes money (demo: instant debit)
  'stake_lock',    // cycle started → moves from available to locked
  'stake_return',  // cycle won → unlocks back to available
  'stake_donate',  // cycle lost → leaves wallet entirely (to charity)
] as const;
export type TxnKind = (typeof TXN_KINDS)[number];

export const TXN_PROVIDERS = ['razorpay', 'stripe', 'internal'] as const;
export type TxnProvider = (typeof TXN_PROVIDERS)[number];

const transactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: TXN_KINDS, required: true },
    amount: { type: Number, required: true, min: 0 },
    provider: { type: String, enum: TXN_PROVIDERS, default: 'internal' },
    /** Razorpay payment_id / Stripe payment_intent or checkout session id. Null for internal txns. */
    paymentRef: { type: String, default: null },
    cycleId: { type: Schema.Types.ObjectId, ref: 'Cycle', default: null },
    note: { type: String, default: '' },
    /** Recipient charity for stake_donate (display + audit). Null otherwise. */
    charity: { type: String, default: null },
    /** Operations status for donations — pending → queued for the monthly GiveIndia transfer. */
    payoutStatus: { type: String, enum: ['pending', 'paid', null], default: null },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, createdAt: -1 });
// Idempotency: same provider + paymentRef must not credit twice.
transactionSchema.index(
  { provider: 1, paymentRef: 1 },
  { unique: true, partialFilterExpression: { paymentRef: { $type: 'string' } } }
);

export type TransactionDoc = HydratedDocument<InferSchemaType<typeof transactionSchema>>;
export const Transaction = model('Transaction', transactionSchema);

const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function toTxnDTO(t: TransactionDoc) {
  const positive = t.kind === 'deposit' || t.kind === 'stake_return';
  const sign = positive ? '+' : '−';
  const title =
    t.kind === 'deposit' ? 'Deposit to wallet' :
    t.kind === 'withdraw' ? 'Withdrawal' :
    t.kind === 'stake_lock' ? 'Cycle stake locked' :
    t.kind === 'stake_return' ? 'Cycle complete · stake returned' :
    t.charity ? `Cycle missed · donated to ${t.charity}` :
    'Cycle missed · stake donated';
  const d = t.createdAt;
  const providerSuffix = t.provider !== 'internal' ? ` · ${t.provider}` : '';
  const noteSuffix = t.note ? ' · ' + t.note : '';
  const payoutSuffix = t.payoutStatus === 'pending' ? ' · pending monthly transfer' : '';
  return {
    id: (t._id as Types.ObjectId).toString(),
    kind: t.kind,
    title,
    subtitle: `${monthShort[d.getMonth()]} ${d.getDate()}${providerSuffix}${noteSuffix}${payoutSuffix}`,
    amount: `${sign} ₹${t.amount.toLocaleString('en-IN')}`,
    positive,
    charity: t.charity ?? null,
    payoutStatus: t.payoutStatus ?? null,
  };
}

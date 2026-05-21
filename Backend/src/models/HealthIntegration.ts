import { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';

/**
 * Stores per-user OAuth tokens for a third-party health provider.
 *
 * SECURITY NOTE — for a real product, encrypt refreshToken at rest (e.g. via
 * MongoDB CSFLE or a dedicated KMS). For this capstone the keys are short-lived
 * test credentials, but production must NOT store refresh tokens in plain text.
 */
const healthIntegrationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, enum: ['google-fit'], required: true },
    accessToken: { type: String, required: true },
    /** Some flows don't return a refresh token (e.g. re-consents). It's optional. */
    refreshToken: { type: String, default: null },
    expiresAt: { type: Date, required: true },
    scope: { type: String, default: '' },
  },
  { timestamps: true }
);

// One integration per (user, provider).
healthIntegrationSchema.index({ userId: 1, provider: 1 }, { unique: true });

export type HealthIntegrationDoc = HydratedDocument<InferSchemaType<typeof healthIntegrationSchema>>;
export const HealthIntegration = model('HealthIntegration', healthIntegrationSchema);

import { Schema, model, InferSchemaType, HydratedDocument, Types } from 'mongoose';
import crypto from 'crypto';

const squadSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 40 },
    /** 6-char alphanumeric invite code, unique across squads. */
    code: { type: String, required: true, unique: true, uppercase: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** All members (owner is always included). */
    memberIds: { type: [Schema.Types.ObjectId], ref: 'User', default: [], index: true },
  },
  { timestamps: true }
);

export type SquadDoc = HydratedDocument<InferSchemaType<typeof squadSchema>>;
export const Squad = model('Squad', squadSchema);

/** Generates a short readable invite code (no easily-confused chars). */
export function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit I, O, 0, 1
  let out = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export type MemberDTO = {
  id: string;
  name: string;
  initial: string;
  color: string;
  pct: number;
  trend: 'up' | 'flat' | 'down';
  trendValue: number;
  atRisk: boolean;
  isYou: boolean;
};

export function squadStatsFromMembers(members: MemberDTO[]) {
  if (members.length === 0) return { squadAvg: 0, topStreak: 0, members: 0 };
  const squadAvg = Math.round(members.reduce((s, m) => s + m.pct, 0) / members.length);
  const topStreak = Math.round((Math.max(...members.map((m) => m.pct)) / 100) * 14);
  return { squadAvg, topStreak, members: members.length };
}

export function toSquadDTO(s: SquadDoc, members: MemberDTO[]) {
  const stats = squadStatsFromMembers(members);
  return {
    id: (s._id as Types.ObjectId).toString(),
    name: s.name,
    code: s.code,
    ownerId: s.ownerId.toString(),
    cycleLabel: '',
    squadAvg: stats.squadAvg,
    topStreak: stats.topStreak,
    members,
  };
}

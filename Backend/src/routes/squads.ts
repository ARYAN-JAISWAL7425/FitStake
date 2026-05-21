import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { HttpError } from '../middleware/error';
import { Squad, generateInviteCode, toSquadDTO, MemberDTO } from '../models/Squad';
import { User } from '../models/User';
import { Cycle } from '../models/Cycle';

const router = Router();

const palette = ['#2D5E3A', '#7A9A80', '#3FA85C', '#C8FF6B', '#FFB562', '#4ECDC4', '#FF6B6B', '#8B5CF6'];

function colorForUserId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

async function membersForSquad(squad: { memberIds: unknown[] }, viewerId: string): Promise<MemberDTO[]> {
  const ids = squad.memberIds.map(String);
  const users = await User.find({ _id: { $in: ids } });
  const cycles = await Cycle.find({ userId: { $in: ids }, status: 'active' });
  const cycleByUser = new Map<string, { credited: number; threshold: number }>();
  for (const c of cycles) cycleByUser.set(c.userId.toString(), { credited: c.credited, threshold: c.threshold });

  return users.map((u) => {
    const uid = u._id.toString();
    const c = cycleByUser.get(uid);
    const pct = c && c.threshold > 0 ? Math.min(100, Math.round((c.credited / c.threshold) * 100)) : 0;
    const isYou = uid === viewerId;
    return {
      id: uid,
      name: isYou ? 'You' : u.name,
      initial: (u.name?.[0] ?? '·').toUpperCase(),
      color: colorForUserId(uid),
      pct,
      trend: 'flat' as const,
      trendValue: 0,
      atRisk: pct < 60,
      isYou,
    };
  }).sort((a, b) => b.pct - a.pct);
}

/** All squads the user belongs to. */
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const squads = await Squad.find({ memberIds: userId }).sort({ updatedAt: -1 });
    const dtos = await Promise.all(squads.map(async (s) => toSquadDTO(s, await membersForSquad(s, userId))));
    // Backwards-compatible: top-level `squad` is the first one (used by old screen).
    return res.json({ squads: dtos, squad: dtos[0] ?? null });
  } catch (err) {
    return next(err);
  }
});

const createSchema = z.object({ name: z.string().trim().min(2).max(40) });

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const { name } = createSchema.parse(req.body);

    // Generate a code, retry on the (extremely rare) collision.
    let code = generateInviteCode();
    for (let i = 0; i < 5; i++) {
      const exists = await Squad.findOne({ code });
      if (!exists) break;
      code = generateInviteCode();
    }
    const squad = await Squad.create({ name, code, ownerId: userId, memberIds: [userId] });
    return res.status(201).json({ squad: toSquadDTO(squad, await membersForSquad(squad, userId)) });
  } catch (err) {
    return next(err);
  }
});

const joinSchema = z.object({ code: z.string().trim().min(4).max(12) });

router.post('/join', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const { code } = joinSchema.parse(req.body);
    const squad = await Squad.findOne({ code: code.toUpperCase() });
    if (!squad) throw new HttpError(404, 'Invite code not found');
    if (squad.memberIds.some((id) => id.toString() === userId)) {
      return res.json({ already: true, squad: toSquadDTO(squad, await membersForSquad(squad, userId)) });
    }
    squad.memberIds.push(userId as never);
    await squad.save();
    return res.json({ already: false, squad: toSquadDTO(squad, await membersForSquad(squad, userId)) });
  } catch (err) {
    return next(err);
  }
});

router.post('/:id/leave', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const squad = await Squad.findById(req.params.id);
    if (!squad) throw new HttpError(404, 'Squad not found');
    squad.memberIds = squad.memberIds.filter((id) => id.toString() !== userId) as typeof squad.memberIds;
    if (squad.memberIds.length === 0) {
      await squad.deleteOne();
      return res.json({ deleted: true });
    }
    // If the owner left, transfer ownership to the next member.
    if (squad.ownerId.toString() === userId) squad.ownerId = squad.memberIds[0];
    await squad.save();
    return res.json({ deleted: false });
  } catch (err) {
    return next(err);
  }
});

export default router;

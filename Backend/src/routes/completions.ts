import { Router, Request } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import { HttpError } from '../middleware/error';
import { Cycle, currentDayOf, toCycleDTO, CycleDoc } from '../models/Cycle';
import { Completion } from '../models/Completion';
import { FpEvent } from '../models/FpEvent';
import { User, toUserDTO } from '../models/User';
import { findIntegration, getStepsForToday, getValidAccessToken } from '../lib/googleFit';
import { tierForFp } from '../lib/tier';

const router = Router();
const DAY_COMPLETE_BONUS = 20;
// Anti-gaming: cap auto-verified step credit per day to stop a single huge dump
// (e.g. once-a-month treadmill marathon) from counting more than its target.
const MAX_VERIFIED_STEPS_PER_DAY = 50_000;

const UPLOADS_DIR = path.resolve(__dirname, '..', '..', 'uploads');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 }, // 6 MB max per upload
  fileFilter: (_req, file, cb) => {
    if (!/^image\//.test(file.mimetype)) return cb(new Error('Only image uploads are allowed'));
    cb(null, true);
  },
});

const tapSchema = z.object({ goalId: z.string().min(1) });

/** Performs the shared FP-credit + tier-promotion + cycle-day-credit work. */
async function recordCompletion(opts: {
  userId: string;
  cycle: CycleDoc;
  goalId: string;
  day: number;
  fpAwarded: number;
  proofKind: 'auto-steps' | 'photo' | 'tap';
  photoPath?: string | null;
  photoSha256?: string | null;
  verifiedSteps?: number | null;
}) {
  const { userId, cycle, goalId, day, fpAwarded } = opts;

  // Idempotency guard.
  const existing = await Completion.findOne({ cycleId: cycle._id, goalId, day });
  if (existing) {
    const completedToday = await Completion.find({ cycleId: cycle._id, day }).distinct('goalId');
    const user = await User.findById(userId);
    return {
      already: true,
      awarded: { goalFp: 0, dayBonusFp: 0, total: 0, dayJustCredited: false },
      cycle: toCycleDTO(cycle, completedToday),
      user: user ? toUserDTO(user) : null,
      verifiedSteps: opts.verifiedSteps ?? null,
    };
  }

  await Completion.create({
    userId,
    cycleId: cycle._id,
    goalId,
    day,
    fpAwarded,
    proofKind: opts.proofKind,
    photoPath: opts.photoPath ?? null,
    photoSha256: opts.photoSha256 ?? null,
    verifiedSteps: opts.verifiedSteps ?? null,
  });
  await FpEvent.create({ userId, cycleId: cycle._id, goalId, day, source: 'goal_completion', amount: fpAwarded });

  let dayJustCredited = false;
  const completionsForDay = await Completion.find({ cycleId: cycle._id, day }).distinct('goalId');
  const allGoalIds = cycle.goals.map((g) => g._id!.toString());
  if (allGoalIds.every((id) => completionsForDay.includes(id))) {
    cycle.credited += 1;
    dayJustCredited = true;
    await cycle.save();
  }

  let dayBonusFp = 0;
  if (dayJustCredited) {
    dayBonusFp = DAY_COMPLETE_BONUS;
    await FpEvent.create({ userId, cycleId: cycle._id, day, source: 'day_complete_bonus', amount: dayBonusFp });
  }

  const totalFpDelta = fpAwarded + dayBonusFp;
  const user = await User.findById(userId);
  if (user) {
    user.fp = (user.fp ?? 0) + totalFpDelta;
    const earnedTier = tierForFp(user.fp);
    if (earnedTier !== user.tier) user.tier = earnedTier;
    await user.save();
  }

  return {
    already: false,
    awarded: { goalFp: fpAwarded, dayBonusFp, total: totalFpDelta, dayJustCredited },
    cycle: toCycleDTO(cycle, completionsForDay),
    user: user ? toUserDTO(user) : null,
    verifiedSteps: opts.verifiedSteps ?? null,
  };
}

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const { goalId } = tapSchema.parse(req.body);

    const cycle = await Cycle.findOne({ userId, status: 'active' });
    if (!cycle) throw new HttpError(400, 'No active cycle');

    const goal = cycle.goals.find((g) => g._id?.toString() === goalId);
    if (!goal) throw new HttpError(404, 'Goal not found in active cycle');

    const day = currentDayOf(cycle);

    // Photo-required goal types — must use the /photo endpoint instead.
    // Sleep is also photo-gated (e.g. a screenshot of your wearable's sleep
    // graph). The only auto-verified goal is 'steps' via Google Fit.
    const needsPhoto: typeof goal.templateId[] = ['water', 'strength', 'cardio', 'diet', 'sleep'];
    if (needsPhoto.includes(goal.templateId)) {
      return res.status(409).json({
        ok: false,
        reason: 'photo_required',
        message: `${goal.title} requires a photo proof. Upload a quick snap to mark it done.`,
      });
    }

    // ── Google Fit verification for `steps` goals ──
    let verifiedSteps: number | null = null;
    if (goal.templateId === 'steps') {
      const integration = await findIntegration(userId);
      if (!integration) {
        return res.status(409).json({
          ok: false,
          reason: 'google_fit_required',
          message: 'Connect Google Fit before completing a steps goal — we verify the actual step count, not just a tap.',
        });
      }
      try {
        const accessToken = await getValidAccessToken(integration);
        const rawSteps = await getStepsForToday(accessToken);
        verifiedSteps = Math.min(rawSteps, MAX_VERIFIED_STEPS_PER_DAY);
        if (verifiedSteps < goal.target) {
          return res.status(409).json({
            ok: false,
            reason: 'insufficient_steps',
            steps: verifiedSteps,
            target: goal.target,
            message: `You've walked ${verifiedSteps.toLocaleString('en-IN')} of ${goal.target.toLocaleString('en-IN')} steps so far. Keep going!`,
          });
        }
      } catch (verifyErr) {
        const message = verifyErr instanceof Error ? verifyErr.message : 'Google Fit verification failed';
        throw new HttpError(502, `Could not verify steps with Google Fit: ${message}`);
      }
    }

    const result = await recordCompletion({
      userId,
      cycle,
      goalId,
      day,
      fpAwarded: goal.fpPerCompletion,
      proofKind: goal.templateId === 'steps' ? 'auto-steps' : 'tap',
      verifiedSteps,
    });
    return res.status(result.already ? 200 : 201).json(result);
  } catch (err) {
    return next(err);
  }
});

router.post('/photo', requireAuth, upload.single('photo'), async (req: Request, res, next) => {
  try {
    const userId = req.auth!.sub;
    const goalId = (req.body?.goalId ?? '').toString();
    if (!goalId) throw new HttpError(400, 'goalId is required');
    if (!req.file) throw new HttpError(400, 'photo file is required (multipart field name: "photo")');

    const cycle = await Cycle.findOne({ userId, status: 'active' });
    if (!cycle) throw new HttpError(400, 'No active cycle');

    const goal = cycle.goals.find((g) => g._id?.toString() === goalId);
    if (!goal) throw new HttpError(404, 'Goal not found in active cycle');

    const day = currentDayOf(cycle);

    // Hash for dedupe — same exact photo can't credit a second goal.
    const sha = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const dup = await Completion.findOne({ userId, photoSha256: sha });
    if (dup) {
      return res.status(409).json({
        ok: false,
        reason: 'duplicate_photo',
        message: 'This image was already used for another completion. Take a fresh photo.',
      });
    }

    // Save to disk under uploads/<userId>/<cycleId>/<day>-<goalId>-<sha8>.<ext>
    const ext = (req.file.originalname.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? '.jpg').toLowerCase();
    const dir = path.join(UPLOADS_DIR, userId, cycle._id.toString());
    await fs.mkdir(dir, { recursive: true });
    const filename = `d${day}-${goalId}-${sha.slice(0, 8)}${ext}`;
    const fullPath = path.join(dir, filename);
    await fs.writeFile(fullPath, req.file.buffer);
    const relPath = path.relative(UPLOADS_DIR, fullPath).replace(/\\/g, '/');

    const result = await recordCompletion({
      userId,
      cycle,
      goalId,
      day,
      fpAwarded: goal.fpPerCompletion,
      proofKind: 'photo',
      photoPath: relPath,
      photoSha256: sha,
    });
    return res.status(result.already ? 200 : 201).json(result);
  } catch (err) {
    return next(err);
  }
});

export default router;

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { User } from '../models/User';
import { HttpError } from '../middleware/error';
import { sendEmail } from '../lib/mailer';
import { env, smtpConfigured } from '../lib/env';

const router = Router();

const contactSchema = z.object({
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(5).max(2000),
});

router.post('/contact', requireAuth, async (req, res, next) => {
  try {
    const { subject, message } = contactSchema.parse(req.body);
    const user = await User.findById(req.auth!.sub);
    if (!user) throw new HttpError(404, 'User not found');

    const to = env.supportInbox || env.smtpUser || 'support@fitstake.app';

    const result = await sendEmail({
      to,
      subject: `[FitStake support] ${subject}`,
      text:
        `From: ${user.name} <${user.email}>\n` +
        `User ID: ${user._id}\n` +
        `Tier: ${user.tier}\n\n` +
        `Subject: ${subject}\n\n` +
        `${message}\n\n` +
        `— sent from the in-app Support form`,
    });

    return res.json({
      ok: true,
      delivered: result.delivered,
      via: result.via,
      // Honest about delivery: tell the client whether the email actually went
      // out via SMTP or just landed in the dev console.
      message: result.delivered
        ? 'Message sent. We respond within 6 hours during 9–9 IST.'
        : 'Message received (dev mode — printed to backend terminal; configure SMTP to deliver to inbox).',
      smtpConfigured: smtpConfigured(),
    });
  } catch (err) {
    return next(err);
  }
});

export default router;

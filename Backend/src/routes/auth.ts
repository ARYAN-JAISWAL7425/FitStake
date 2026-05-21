import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { User, toUserDTO } from '../models/User';
import { signToken } from '../lib/jwt';
import { HttpError } from '../middleware/error';
import { sendEmail } from '../lib/mailer';
import { env } from '../lib/env';

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotSchema = z.object({
  email: z.string().email(),
});

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw new HttpError(409, 'Email already registered');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash });
    const token = signToken({ sub: user._id.toString(), email: user.email });
    return res.status(201).json({ token, user: toUserDTO(user) });
  } catch (err) {
    return next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new HttpError(401, 'Invalid email or password');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new HttpError(401, 'Invalid email or password');
    const token = signToken({ sub: user._id.toString(), email: user.email });
    return res.json({ token, user: toUserDTO(user) });
  } catch (err) {
    return next(err);
  }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = forgotSchema.parse(req.body);
    const user = await User.findOne({ email: email.toLowerCase() });
    // Always return success to avoid revealing whether email is registered.
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetToken = resetToken;
      user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min
      await user.save();

      const link = `${env.corsOrigin}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
      await sendEmail({
        to: user.email,
        subject: 'Reset your FitStake password',
        text:
          `Hi ${user.name},\n\n` +
          `You requested a password reset. Click the link below to set a new password (expires in 30 minutes):\n\n` +
          `${link}\n\n` +
          `If you didn't request this, ignore this email — nothing changed.\n\n` +
          `— FitStake`,
      });
    }
    return res.json({ ok: true, message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    return next(err);
  }
});

const resetSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(6),
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = resetSchema.parse(req.body);
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpiresAt: { $gt: new Date() },
    });
    if (!user) throw new HttpError(400, 'Reset link is invalid or expired.');
    user.passwordHash = await bcrypt.hash(password, 10);
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;
    await user.save();
    const jwt = signToken({ sub: user._id.toString(), email: user.email });
    return res.json({ token: jwt, user: toUserDTO(user) });
  } catch (err) {
    return next(err);
  }
});

export default router;

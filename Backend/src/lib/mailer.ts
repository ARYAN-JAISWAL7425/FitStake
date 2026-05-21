// Tiny mailer wrapper.
// - If SMTP_HOST/USER/PASS env vars are set → uses Nodemailer real SMTP transport
// - Otherwise → logs the email to stdout so devs can copy a reset link without
//   wiring real email creds. Capstone-friendly.

import nodemailer, { Transporter } from 'nodemailer';
import { env, smtpConfigured } from './env';

let _transport: Transporter | null = null;

function transport(): Transporter | null {
  if (!smtpConfigured()) return null;
  if (_transport) return _transport;
  _transport = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: { user: env.smtpUser, pass: env.smtpPass },
  });
  return _transport;
}

export type SendOpts = { to: string; subject: string; text: string; html?: string };

export async function sendEmail(opts: SendOpts): Promise<{ delivered: boolean; via: 'smtp' | 'console' }> {
  const t = transport();
  if (!t) {
    // Dev mode — log to console.
    console.log('\n────── [mailer:console] ──────');
    console.log('  to:', opts.to);
    console.log('  subject:', opts.subject);
    console.log('  body:');
    console.log(opts.text.split('\n').map((l) => '    ' + l).join('\n'));
    console.log('──────────────────────────────\n');
    return { delivered: false, via: 'console' };
  }
  await t.sendMail({
    from: env.smtpFrom,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
  return { delivered: true, via: 'smtp' };
}

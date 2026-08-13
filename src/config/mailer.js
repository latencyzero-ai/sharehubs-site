/** Tservers/cPanel SMTP mailer. Credentials remain environment-only. */
const nodemailer = require('nodemailer');
const config = require('./env');

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: { user: config.smtp.user, pass: config.smtp.pass },
});

transporter.verify((err) => {
  if (err) console.error('SMTP verification failed:', err.message);
  else console.log('SMTP ready');
});

async function sendMail({ to, subject, html, replyTo }) {
  return transporter.sendMail({
    from: config.smtp.from,
    to,
    subject,
    html,
    ...(replyTo ? { replyTo } : {}),
  });
}

async function sendVerificationEmail(to, link) {
  return sendMail({
    to,
    subject: 'Verify your Share Hubs Engineering account',
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#0a0a0a;color:#f2f2f2;padding:32px;border-radius:16px"><h2 style="color:#800000">Share Hubs Engineering</h2><p style="color:#cbcbcb;line-height:1.6">Confirm your email to activate your account.</p><a href="${link}" style="display:inline-block;margin:18px 0;padding:13px 28px;background:#800000;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Verify my account</a><p style="font-size:13px;color:#888;word-break:break-all">${link}</p></div>`,
  });
}

async function sendSystemFailure({ reference, error }) {
  const safe = String(error || 'Unknown mail delivery error').replace(/[&<>]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));
  return sendMail({
    to: config.mail.recipients.admin,
    subject: `Website communication failure — ${reference}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><h2>Website communication failure</h2><p><strong>Reference:</strong> ${reference}</p><p><strong>Error:</strong> ${safe}</p><p>The request remains stored and requires follow-up.</p></div>`,
  });
}

module.exports = { transporter, sendMail, sendVerificationEmail, sendSystemFailure };

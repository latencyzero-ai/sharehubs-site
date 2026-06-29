/** cPanel SMTP mailer. No test email on boot; failures are logged, not fatal. */
const nodemailer = require('nodemailer');
const config = require('./env');

const transporter = nodemailer.createTransport({
  host: config.smtp.host, port: config.smtp.port, secure: config.smtp.secure,
  auth: { user: config.smtp.user, pass: config.smtp.pass },
});

transporter.verify((err) => {
  if (err) console.error('\u274C SMTP verification failed:', err.message);
  else console.log('\u2705 SMTP ready (cPanel)');
});

async function sendVerificationEmail(to, link) {
  return transporter.sendMail({
    from: config.smtp.from, to,
    subject: 'Verify your Share Hubs Engineering account',
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#0a0a0a;color:#f2f2f2;padding:32px;border-radius:16px">
      <h2 style="color:#e11d2a">Share Hubs Engineering</h2>
      <p style="color:#cbcbcb;line-height:1.6">Confirm your email to activate your account.</p>
      <a href="${link}" style="display:inline-block;margin:18px 0;padding:13px 28px;background:#e11d2a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Verify my account</a>
      <p style="font-size:13px;color:#888">Or paste this link: <span style="color:#e11d2a;word-break:break-all">${link}</span></p></div>`,
  });
}
module.exports = { transporter, sendVerificationEmail };

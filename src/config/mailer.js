/** cPanel mail bridge client. Sends over HTTPS to a PHP endpoint on cPanel
 *  hosting, since Railway blocks outbound SMTP on the trial plan. */
const config = require('./env');

const transporter = {
  async sendMail({ from, to, replyTo, subject, text, html }) {
    const res = await fetch(config.smtp.bridgeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: config.smtp.bridgeSecret,
        from: from || config.smtp.from,
        to, replyTo, subject,
        body: html || text,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const err = new Error(`mail bridge send failed: ${res.status} ${errText}`);
      console.error('\u274C Mail bridge send failed:', err.message);
      throw err;
    }
    return res.json();
  },
};

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

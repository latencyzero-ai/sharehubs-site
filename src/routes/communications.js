const express = require('express');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const db = require('../config/db');
const config = require('../config/env');
const { sendMail, sendSystemFailure } = require('../config/mailer');

const router = express.Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 12, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many submissions. Please try again later.' } });
router.use(limiter);

const clean = (value, max = 2000) => String(value ?? '').trim().slice(0, max);
const emailOk = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const esc = (value) => clean(value, 4000).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const token = () => crypto.randomBytes(8).toString('hex');
const reference = (prefix, id) => `SHE-${prefix}-${new Date().getFullYear()}-${String(id).padStart(4, '0')}`;

function fail(res, status, message) { return res.status(status).json({ ok: false, error: message }); }
function success(res, referenceId, message) { return res.json({ ok: true, reference: referenceId, message }); }

async function persistAndNotify({ table, prefix, data, recipient, subject, customerSubject, customerHtml, internalHtml }) {
  const columns = Object.keys(data);
  const placeholders = columns.map(() => '?').join(', ');
  const [result] = await db.execute(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`, columns.map((key) => data[key]));
  const ref = reference(prefix, result.insertId);
  await db.execute(`UPDATE ${table} SET reference_id = ? WHERE id = ?`, [ref, result.insertId]);

  try {
    await sendMail({ to: recipient, subject, html: internalHtml, replyTo: data.email });
    await sendMail({ to: data.email, subject: customerSubject, html: customerHtml, replyTo: recipient });
    await db.execute(`UPDATE ${table} SET notification_status = 'sent' WHERE id = ?`, [result.insertId]);
  } catch (mailError) {
    await db.execute(`UPDATE ${table} SET notification_status = 'failed', mail_error = ? WHERE id = ?`, [clean(mailError.message, 1000), result.insertId]);
    await sendSystemFailure({ reference: ref, error: mailError.message }).catch(() => {});
  }
  return ref;
}

router.post('/quote', async (req, res) => {
  const body = req.body || {};
  if (clean(body._website, 100)) return success(res, '', 'Your request has been received.');
  const data = {
    name: clean(body.name, 120), email: clean(body.email, 255).toLowerCase(), phone: clean(body.phone, 50), company: clean(body.company, 160),
    industry: clean(body.industry, 80), service: clean(body.service, 100), quantity: clean(body.quantity, 120), timeline: clean(body.timeline, 80), details: clean(body.details, 5000),
    status: 'NEW', notification_status: 'pending', mail_error: null,
  };
  if (!data.name || !emailOk(data.email) || !data.industry || !data.service || !data.details) return fail(res, 422, 'Please complete all required quote fields.');
  try {
    const ref = await persistAndNotify({ table: 'quote_requests', prefix: 'Q', data, recipient: config.mail.recipients.quotes, subject: `New Quote Request — ${reference('Q', 0).replace('0000', 'PENDING')}`, customerSubject: `Quote Request Received — Share Hubs Engineering`,
      customerHtml: customerEmail('Quote request received', data.name, 'quote', null), internalHtml: internalEmail('New Quote Request', data) });
    await db.execute('UPDATE quote_requests SET subject = ? WHERE reference_id = ?', [`New Quote Request — ${ref}`, ref]);
    return success(res, ref, `Your quote request has been received. Reference: ${ref}`);
  } catch (error) { console.error('Quote workflow failed:', error.message); return fail(res, 500, 'We could not submit your request right now. Please try again or contact us directly.'); }
});

router.post('/consultation', async (req, res) => {
  const body = req.body || {};
  if (clean(body._website, 100)) return success(res, '', 'Your request has been received.');
  const data = {
    name: clean(body.name, 120), email: clean(body.email, 255).toLowerCase(), phone: clean(body.phone, 50), company: clean(body.company, 160), topic: clean(body.topic, 120), preference: clean(body.preference, 80), message: clean(body.message, 5000),
    status: 'NEW', notification_status: 'pending', mail_error: null,
  };
  if (!data.name || !emailOk(data.email) || !data.phone || !data.topic) return fail(res, 422, 'Please complete all required consultation fields.');
  try {
    const ref = await persistAndNotify({ table: 'consultation_requests', prefix: 'C', data, recipient: config.mail.recipients.consultation, subject: 'New Consultation Request', customerSubject: 'Consultation Request Received — Share Hubs Engineering', customerHtml: customerEmail('Consultation request received', data.name, 'consultation', null), internalHtml: internalEmail('New Consultation Request', data) });
    return success(res, ref, `Your consultation request has been received. Reference: ${ref}`);
  } catch (error) { console.error('Consultation workflow failed:', error.message); return fail(res, 500, 'We could not submit your request right now. Please try again or contact us directly.'); }
});

router.post('/contact', async (req, res) => {
  const body = req.body || {};
  if (clean(body._website, 100)) return success(res, '', 'Your message has been received.');
  const data = { name: clean(body.name, 120), email: clean(body.email, 255).toLowerCase(), phone: clean(body.phone, 50), subject: clean(body.subject, 180), message: clean(body.message, 5000), status: 'NEW', notification_status: 'pending', mail_error: null };
  if (!data.name || !emailOk(data.email) || !data.subject || !data.message) return fail(res, 422, 'Please complete all required contact fields.');
  try {
    const ref = await persistAndNotify({ table: 'contact_requests', prefix: 'E', data, recipient: config.mail.recipients.info, subject: `New Enquiry — ${data.subject}`, customerSubject: 'We Received Your Message — Share Hubs Engineering', customerHtml: customerEmail('Message received', data.name, 'contact', null), internalHtml: internalEmail('New Contact Enquiry', data) });
    return success(res, ref, `Your message has been received. Reference: ${ref}`);
  } catch (error) { console.error('Contact workflow failed:', error.message); return fail(res, 500, 'We could not send your message right now. Please try again or contact us directly.'); }
});

router.post('/newsletter', async (req, res) => {
  const email = clean(req.body?.email, 255).toLowerCase();
  if (clean(req.body?._website, 100)) return success(res, '', 'You are subscribed.');
  if (!emailOk(email)) return fail(res, 422, 'Enter a valid email address.');
  try {
    await db.execute('INSERT INTO newsletter_subscribers (email, source) VALUES (?, ?) ON DUPLICATE KEY UPDATE subscribed_at = CURRENT_TIMESTAMP', [email, 'website']);
    await sendMail({ to: email, subject: 'You’re subscribed — Share Hubs Engineering', html: customerEmail('You’re subscribed', '', 'newsletter', null), replyTo: config.mail.recipients.info });
    return success(res, '', 'You’re subscribed to Share Hubs Engineering updates.');
  } catch (error) { console.error('Newsletter workflow failed:', error.message); return fail(res, 500, 'We could not complete your subscription right now.'); }
});

function customerEmail(title, name, type, ref) {
  const intro = name ? `Hello ${esc(name)},` : 'Hello,';
  const body = type === 'quote' ? 'We have received your quote request and our team will review the information you provided. If we need additional details, we will contact you.' : type === 'consultation' ? 'We have received your consultation request. Our team will review your preferred contact method and requirements before getting in touch.' : type === 'newsletter' ? 'Thanks for subscribing. You’ll receive occasional updates about our projects, capabilities, and engineering insights.' : 'We have received your message and will review it as soon as possible.';
  return layout(`<h1>${esc(title)}</h1><p>${intro}</p><p>${body}</p>${ref ? `<div style="padding:16px;background:#f4f4f4;border-radius:10px;margin:20px 0"><strong>Reference:</strong> ${esc(ref)}</div>` : ''}<p>Regards,<br><strong>Share Hubs Engineering</strong><br>Precision Manufacturing &amp; Engineering Solutions</p>`);
}
function internalEmail(title, data) {
  const rows = Object.entries(data).filter(([k, v]) => v && !['mail_error', 'notification_status'].includes(k)).map(([k, v]) => `<tr><td style="padding:8px;font-weight:700;text-transform:capitalize">${esc(k.replaceAll('_', ' '))}</td><td style="padding:8px">${esc(v)}</td></tr>`).join('');
  return layout(`<h1>${esc(title)}</h1><table style="width:100%;border-collapse:collapse">${rows}</table>`);
}
function layout(content) { return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#202020;background:#fff;padding:32px;border:1px solid #e5e5e5;border-radius:16px"><div style="border-bottom:4px solid #800000;padding-bottom:16px;margin-bottom:24px"><strong style="font-size:20px">Share Hubs Engineering</strong></div>${content}<div style="border-top:1px solid #eee;margin-top:28px;padding-top:16px;color:#777;font-size:12px">Share Hubs Engineering · Lagos, Nigeria</div></div>`; }

module.exports = router;

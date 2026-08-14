const express = require('express');
const crypto = require('crypto');
const db = require('../config/db');
const config = require('../config/env');
const { transporter } = require('../config/mailer');
const { getMailboxForType } = require('../config/mail-routing');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_RE = /^[+()\d\s.-]{7,30}$/;
const ALLOWED_INDUSTRIES = new Set(['agriculture','automobile','medical','oil-gas','home-office','other']);
const ALLOWED_SERVICES = new Set(['3d-printing','laser-cutting','cnc-punching','plasma-cutting','consultancy','multiple','unsure']);
const ALLOWED_TIMELINES = new Set(['','urgent','standard','flexible']);
const ALLOWED_TOPICS = new Set(['design-review','material-selection','process-planning','cost-optimization','prototype','training','other']);
const ALLOWED_PREFERENCES = new Set(['phone','video','in-person','email']);

function safe(value, max = 4000) { return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max); }
function reference(prefix) { return `${prefix}-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`; }
function validEmail(email) { return EMAIL_RE.test(email) && email.length <= 254; }
function validPhone(phone, required = false) { return !phone && !required ? true : PHONE_RE.test(phone); }
function spamTrap(req) { return Boolean(safe(req.body.website, 120)); }
function invalidChoice(value, allowed) { return !allowed.has(value); }

async function notifyMailbox(type, enquiry) {
  const mailbox = getMailboxForType(type);
  if (!mailbox) return null;
  const subject = `[${mailbox.task}] ${enquiry.reference_id}`;
  const text = [
    `New ${mailbox.task.toLowerCase()}.`, `Reference: ${enquiry.reference_id}`, `Name: ${enquiry.name}`, `Email: ${enquiry.email}`,
    enquiry.phone ? `Phone: ${enquiry.phone}` : null, enquiry.company ? `Company: ${enquiry.company}` : null,
    enquiry.subject ? `Subject: ${enquiry.subject}` : null, enquiry.service ? `Service: ${enquiry.service}` : null,
    enquiry.topic ? `Topic: ${enquiry.topic}` : null, enquiry.message ? `Message: ${enquiry.message}` : null,
    enquiry.details ? `Project details: ${enquiry.details}` : null,
  ].filter(Boolean).join('\n');
  await transporter.sendMail({ from: config.smtp.from, to: mailbox.email, replyTo: enquiry.email, subject, text });
  return mailbox.email;
}

async function recordMessage(referenceId, name, email, subject, body) {
  await db.query(`INSERT INTO communication_messages (reference_id, direction, sender_type, sender_name, sender_email, recipient_email, subject, body_text, status, is_read) VALUES (?, 'INBOUND', 'CUSTOMER', ?, ?, ?, ?, ?, 'RECEIVED', 0)`, [referenceId, name, email, config.smtp.from, subject, body]);
}

function success(res, type, referenceId) { return res.render('submission-success', { title: 'Request Received — Share Hubs Engineering', type, referenceId, path: '/submission-success' }); }

router.post('/contact', async (req, res) => {
  if (spamTrap(req)) return res.status(400).send('Unable to process this request.');
  const name = safe(req.body.name, 120); const email = safe(req.body.email, 254).toLowerCase(); const phone = safe(req.body.phone, 30); const subject = safe(req.body.subject, 500); const message = safe(req.body.message, 12000);
  if (!name || !email || !subject || !message || !validEmail(email) || !validPhone(phone)) return res.status(422).send('Please provide valid contact details and complete all required fields.');
  const referenceId = reference('CNT');
  try {
    await db.query('INSERT INTO contacts (reference_id, name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?, ?)', [referenceId, name, email, phone, subject, message]);
    await recordMessage(referenceId, name, email, subject, message);
    await notifyMailbox('CONTACT', { reference_id: referenceId, name, email, phone, subject, message });
    return success(res, 'general enquiry', referenceId);
  } catch (error) { console.error('Contact submission error:', error.message); return res.status(500).send('We could not process your request right now. Please try again.'); }
});

router.post('/request-quote', async (req, res) => {
  if (spamTrap(req)) return res.status(400).send('Unable to process this request.');
  const name = safe(req.body.name, 120); const email = safe(req.body.email, 254).toLowerCase(); const phone = safe(req.body.phone, 30); const company = safe(req.body.company, 255); const industry = safe(req.body.industry, 80); const service = safe(req.body.service, 120); const quantity = safe(req.body.quantity, 255); const timeline = safe(req.body.timeline, 80); const details = safe(req.body.details, 12000);
  if (!name || !email || !industry || !service || !details || !validEmail(email) || !validPhone(phone) || invalidChoice(industry, ALLOWED_INDUSTRIES) || invalidChoice(service, ALLOWED_SERVICES) || invalidChoice(timeline, ALLOWED_TIMELINES)) return res.status(422).send('Please provide valid details and complete all required fields.');
  const referenceId = reference('QTE');
  try {
    await db.query('INSERT INTO quote_requests (reference_id, name, email, phone, company, industry, service, quantity, timeline, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [referenceId, name, email, phone, company, industry, service, quantity, timeline, details]);
    await recordMessage(referenceId, name, email, `Quote request — ${service}`, details);
    await notifyMailbox('QUOTE', { reference_id: referenceId, name, email, phone, company, service, details });
    return success(res, 'quote request', referenceId);
  } catch (error) { console.error('Quote submission error:', error.message); return res.status(500).send('We could not process your quote request right now. Please try again.'); }
});

router.post('/request-consultation', async (req, res) => {
  if (spamTrap(req)) return res.status(400).send('Unable to process this request.');
  const name = safe(req.body.name, 120); const email = safe(req.body.email, 254).toLowerCase(); const phone = safe(req.body.phone, 30); const company = safe(req.body.company, 255); const topic = safe(req.body.topic, 120); const preference = safe(req.body.preference, 80); const message = safe(req.body.message, 12000);
  if (!name || !email || !phone || !topic || !validEmail(email) || !validPhone(phone, true) || invalidChoice(topic, ALLOWED_TOPICS) || invalidChoice(preference, ALLOWED_PREFERENCES)) return res.status(422).send('Please provide valid details and complete all required fields.');
  const referenceId = reference('CON');
  try {
    await db.query('INSERT INTO consultation_requests (reference_id, name, email, phone, company, topic, preference, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [referenceId, name, email, phone, company, topic, preference, message]);
    await recordMessage(referenceId, name, email, `Consultation — ${topic}`, message || `Preferred contact method: ${preference}`);
    await notifyMailbox('CONSULTATION', { reference_id: referenceId, name, email, phone, company, topic, message });
    return success(res, 'consultation request', referenceId);
  } catch (error) { console.error('Consultation submission error:', error.message); return res.status(500).send('We could not process your consultation request right now. Please try again.'); }
});

module.exports = { router };

const express = require('express');
const crypto = require('crypto');
const db = require('../config/db');
const config = require('../config/env');
const { transporter } = require('../config/mailer');
const { getMailboxForType } = require('../config/mail-routing');

const router = express.Router();

function safe(value, max = 4000) { return String(value ?? '').trim().slice(0, max); }
function reference(prefix) { return `${prefix}-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`; }
function escapeHtml(value) { return safe(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }

async function notifyMailbox(type, enquiry) {
  const mailbox = getMailboxForType(type);
  if (!mailbox) return null;
  const subject = `[${mailbox.task}] ${enquiry.reference_id}`;
  const text = [
    `New ${mailbox.task.toLowerCase()}.`,
    `Reference: ${enquiry.reference_id}`,
    `Name: ${enquiry.name}`,
    `Email: ${enquiry.email}`,
    enquiry.phone ? `Phone: ${enquiry.phone}` : null,
    enquiry.company ? `Company: ${enquiry.company}` : null,
    enquiry.subject ? `Subject: ${enquiry.subject}` : null,
    enquiry.service ? `Service: ${enquiry.service}` : null,
    enquiry.topic ? `Topic: ${enquiry.topic}` : null,
    enquiry.message ? `Message: ${enquiry.message}` : null,
    enquiry.details ? `Project details: ${enquiry.details}` : null,
  ].filter(Boolean).join('\n');
  await transporter.sendMail({ from: config.smtp.from, to: mailbox.email, replyTo: enquiry.email, subject, text });
  return mailbox.email;
}

async function recordMessage(referenceId, name, email, subject, body) {
  await db.query(`INSERT INTO communication_messages (reference_id, direction, sender_type, sender_name, sender_email, recipient_email, subject, body_text, status, is_read) VALUES (?, 'INBOUND', 'CUSTOMER', ?, ?, ?, ?, ?, 'RECEIVED', 0)`, [referenceId, name, email, config.smtp.from, subject, body]);
}

function success(res, type, referenceId) {
  return res.render('submission-success', { title: 'Request Received — Share Hubs Engineering', type, referenceId });
}

router.post('/contact', async (req, res) => {
  const name = safe(req.body.name, 120); const email = safe(req.body.email, 255).toLowerCase(); const phone = safe(req.body.phone, 60); const subject = safe(req.body.subject, 500); const message = safe(req.body.message, 12000);
  if (!name || !email || !subject || !message) return res.status(422).send('Please complete all required fields.');
  const referenceId = reference('CNT');
  try {
    await db.query('INSERT INTO contacts (reference_id, name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?, ?)', [referenceId, name, email, phone, subject, message]);
    await recordMessage(referenceId, name, email, subject, message);
    await notifyMailbox('CONTACT', { reference_id: referenceId, name, email, phone, subject, message });
    return success(res, 'general enquiry', referenceId);
  } catch (error) { console.error('Contact submission error:', error.message); return res.status(500).send('We could not process your request right now. Please try again.'); }
});

router.post('/request-quote', async (req, res) => {
  const name = safe(req.body.name, 120); const email = safe(req.body.email, 255).toLowerCase(); const phone = safe(req.body.phone, 60); const company = safe(req.body.company, 255); const industry = safe(req.body.industry, 80); const service = safe(req.body.service, 120); const quantity = safe(req.body.quantity, 255); const timeline = safe(req.body.timeline, 80); const details = safe(req.body.details, 12000);
  if (!name || !email || !industry || !service || !details) return res.status(422).send('Please complete all required fields.');
  const referenceId = reference('QTE');
  try {
    await db.query('INSERT INTO quote_requests (reference_id, name, email, phone, company, industry, service, quantity, timeline, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [referenceId, name, email, phone, company, industry, service, quantity, timeline, details]);
    await recordMessage(referenceId, name, email, `Quote request — ${service}`, details);
    await notifyMailbox('QUOTE', { reference_id: referenceId, name, email, phone, company, service, details });
    return success(res, 'quote request', referenceId);
  } catch (error) { console.error('Quote submission error:', error.message); return res.status(500).send('We could not process your quote request right now. Please try again.'); }
});

router.post('/request-consultation', async (req, res) => {
  const name = safe(req.body.name, 120); const email = safe(req.body.email, 255).toLowerCase(); const phone = safe(req.body.phone, 60); const company = safe(req.body.company, 255); const topic = safe(req.body.topic, 120); const preference = safe(req.body.preference, 80); const message = safe(req.body.message, 12000);
  if (!name || !email || !phone || !topic) return res.status(422).send('Please complete all required fields.');
  const referenceId = reference('CON');
  try {
    await db.query('INSERT INTO consultation_requests (reference_id, name, email, phone, company, topic, preference, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [referenceId, name, email, phone, company, topic, preference, message]);
    await recordMessage(referenceId, name, email, `Consultation — ${topic}`, message || `Preferred contact method: ${preference}`);
    await notifyMailbox('CONSULTATION', { reference_id: referenceId, name, email, phone, company, topic, message });
    return success(res, 'consultation request', referenceId);
  } catch (error) { console.error('Consultation submission error:', error.message); return res.status(500).send('We could not process your consultation request right now. Please try again.'); }
});

module.exports = { router };

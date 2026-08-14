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

async function queueMailboxNotification(type, enquiry) {
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

  const [result] = await db.query(
    `INSERT INTO communication_messages (reference_id, direction, sender_type, sender_name, sender_email, recipient_email, subject, body_text, status, is_read)
     VALUES (?, 'OUTBOUND', 'SYSTEM', 'Share Hubs Website', ?, ?, ?, ?, 'QUEUED', 1)`,
    [enquiry.reference_id, config.smtp.from, mailbox.email, subject, text],
  );
  const messageRowId = result.insertId;

  try {
    const sent = await transporter.sendMail({ from: config.smtp.from, to: mailbox.email, replyTo: enquiry.email, subject, text });
    await db.query("UPDATE communication_messages SET status = 'SENT', message_id = ?, sent_at = NOW() WHERE id = ?", [sent.messageId || null, messageRowId]);
    await db.query("INSERT INTO admin_enquiry_status (reference_id, communication_status) VALUES (?, 'NEW') ON DUPLICATE KEY UPDATE communication_status = IF(communication_status = 'NEW', 'NEW', communication_status)", [enquiry.reference_id]);
    return { mailbox: mailbox.email, status: 'SENT', messageRowId };
  } catch (error) {
    await db.query("UPDATE communication_messages SET status = 'FAILED' WHERE id = ?", [messageRowId]);
    await db.query("INSERT INTO admin_enquiry_status (reference_id, communication_status) VALUES (?, 'WAITING_CUSTOMER') ON DUPLICATE KEY UPDATE communication_status = 'WAITING_CUSTOMER'", [enquiry.reference_id]);
    console.error(`Mailbox notification failed for ${enquiry.reference_id} → ${mailbox.email}:`, error.message);
    return { mailbox: mailbox.email, status: 'FAILED', messageRowId, error };
  }
}

async function recordMessage(referenceId, name, email, subject, body) {
  await db.query(`INSERT INTO communication_messages (reference_id, direction, sender_type, sender_name, sender_email, recipient_email, subject, body_text, status, is_read) VALUES (?, 'INBOUND', 'CUSTOMER', ?, ?, ?, ?, ?, 'RECEIVED', 0)`, [referenceId, name, email, config.smtp.from, subject, body]);
}

function success(res, type, referenceId, notificationStatus = 'SENT') {
  return res.render('submission-success', { title: 'Request Received — Share Hubs Engineering', type, referenceId, notificationStatus, path: '/submission-success' });
}

async function processSubmission(type, enquiry, saveQuery, saveParams, subject, body, res) {
  const referenceId = enquiry.reference_id;
  try {
    await db.query(saveQuery, saveParams);
    await recordMessage(referenceId, enquiry.name, enquiry.email, subject, body);
    const notification = await queueMailboxNotification(type, enquiry);
    return success(res, enquiry.successType, referenceId, notification?.status || 'FAILED');
  } catch (error) {
    console.error(`${type} submission error:`, error.message);
    return res.status(500).send('We could not process your request right now. Please try again.');
  }
}

router.post('/contact', async (req, res) => {
  if (spamTrap(req)) return res.status(400).send('Unable to process this request.');
  const name = safe(req.body.name, 120); const email = safe(req.body.email, 254).toLowerCase(); const phone = safe(req.body.phone, 30); const subject = safe(req.body.subject, 500); const message = safe(req.body.message, 12000);
  if (!name || !email || !subject || !message || !validEmail(email) || !validPhone(phone)) return res.status(422).send('Please provide valid contact details and complete all required fields.');
  const referenceId = reference('CNT');
  return processSubmission('CONTACT', { reference_id: referenceId, name, email, phone, subject, message, successType: 'general enquiry' }, 'INSERT INTO contacts (reference_id, name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?, ?)', [referenceId, name, email, phone, subject, message], subject, message, res);
});

router.post('/request-quote', async (req, res) => {
  if (spamTrap(req)) return res.status(400).send('Unable to process this request.');
  const name = safe(req.body.name, 120); const email = safe(req.body.email, 254).toLowerCase(); const phone = safe(req.body.phone, 30); const company = safe(req.body.company, 255); const industry = safe(req.body.industry, 80); const service = safe(req.body.service, 120); const quantity = safe(req.body.quantity, 255); const timeline = safe(req.body.timeline, 80); const details = safe(req.body.details, 12000);
  if (!name || !email || !industry || !service || !details || !validEmail(email) || !validPhone(phone) || invalidChoice(industry, ALLOWED_INDUSTRIES) || invalidChoice(service, ALLOWED_SERVICES) || invalidChoice(timeline, ALLOWED_TIMELINES)) return res.status(422).send('Please provide valid details and complete all required fields.');
  const referenceId = reference('QTE');
  return processSubmission('QUOTE', { reference_id: referenceId, name, email, phone, company, industry, service, quantity, timeline, details, successType: 'quote request' }, 'INSERT INTO quote_requests (reference_id, name, email, phone, company, industry, service, quantity, timeline, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [referenceId, name, email, phone, company, industry, service, quantity, timeline, details], `Quote request — ${service}`, details, res);
});

router.post('/request-consultation', async (req, res) => {
  if (spamTrap(req)) return res.status(400).send('Unable to process this request.');
  const name = safe(req.body.name, 120); const email = safe(req.body.email, 254).toLowerCase(); const phone = safe(req.body.phone, 30); const company = safe(req.body.company, 255); const topic = safe(req.body.topic, 120); const preference = safe(req.body.preference, 80); const message = safe(req.body.message, 12000);
  if (!name || !email || !phone || !topic || !validEmail(email) || !validPhone(phone, true) || invalidChoice(topic, ALLOWED_TOPICS) || invalidChoice(preference, ALLOWED_PREFERENCES)) return res.status(422).send('Please provide valid details and complete all required fields.');
  const referenceId = reference('CON');
  return processSubmission('CONSULTATION', { reference_id: referenceId, name, email, phone, company, topic, preference, message, successType: 'consultation request' }, 'INSERT INTO consultation_requests (reference_id, name, email, phone, company, topic, preference, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [referenceId, name, email, phone, company, topic, preference, message], `Consultation — ${topic}`, message || `Preferred contact method: ${preference}`, res);
});

router.post('/newsletter/subscribe', async (req, res) => {
  if (spamTrap(req)) return res.redirect('/?newsletter=success');
  const email = safe(req.body.email, 254).toLowerCase();
  if (!validEmail(email)) return res.redirect('/?newsletter=invalid');
  try {
    await db.query("INSERT INTO newsletter_subscribers (email, status) VALUES (?, 'ACTIVE') ON DUPLICATE KEY UPDATE status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP", [email]);
    try {
      await transporter.sendMail({ from: config.smtp.from, to: getMailboxForType('CONTACT').email, replyTo: email, subject: '[Newsletter] New subscriber', text: `New newsletter subscriber: ${email}` });
    } catch (mailError) {
      console.error(`Newsletter notification failed for ${email}:`, mailError.message);
    }
    return res.redirect('/?newsletter=success');
  } catch (error) {
    console.error('Newsletter subscription error:', error.message);
    return res.redirect('/?newsletter=error');
  }
});

module.exports = { router };

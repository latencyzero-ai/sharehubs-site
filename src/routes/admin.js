const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const db = require('../config/db');
const config = require('../config/env');
const { transporter } = require('../config/mailer');

const router = express.Router();
const COMPANY_DOMAIN = '@sharehubsengineering.com';
const SESSION_TTL_DAYS = 7;
const VERIFICATION_TTL_HOURS = 24;
const ALLOWED_STATUSES = ['NEW', 'REVIEWING', 'CONTACTED', 'QUALIFIED', 'QUOTED', 'WON', 'LOST'];
const ENQUIRY_TYPES = ['CONTACT', 'QUOTE', 'CONSULTATION'];

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Please try again later.' } });

function hashToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
function isCompanyEmail(email) { return String(email || '').trim().toLowerCase().endsWith(COMPANY_DOMAIN); }
function safe(value, max = 4000) { return String(value ?? '').trim().slice(0, max); }
function escapeHtml(value) { return safe(value).replace(/[&<>'\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;' }[char])); }
function setSessionCookie(res, token) { res.cookie('sh_admin_session', token, { httpOnly: true, secure: config.env === 'production', sameSite: 'lax', maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000, path: '/admin' }); }
function clearSessionCookie(res) { res.clearCookie('sh_admin_session', { httpOnly: true, secure: config.env === 'production', sameSite: 'lax', path: '/admin' }); }

async function sendVerification(to, name, token) {
  const link = `${config.baseUrl}/admin/verify/${token}`;
  return transporter.sendMail({ from: config.smtp.from, to, subject: 'Verify your Share Hubs Engineering staff account', html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1c1c1c;background:#f7f5f0;padding:36px;border-radius:12px"><div style="border-bottom:4px solid #800000;padding-bottom:16px;margin-bottom:24px"><strong style="font-size:22px">Share Hubs Engineering</strong></div><h2>Verify your staff account</h2><p>Hello ${escapeHtml(name)},</p><p>Your Share Hubs Engineering dashboard account has been created. Verify your company email address to activate access.</p><p><a href="${link}" style="display:inline-block;padding:13px 24px;background:#800000;color:#fff;text-decoration:none;border-radius:6px;font-weight:700">Verify account</a></p><p style="font-size:13px;color:#6b6860;word-break:break-all">${escapeHtml(link)}</p><p style="font-size:12px;color:#8a877c">This link expires in ${VERIFICATION_TTL_HOURS} hours.</p></div>` });
}

async function createSession(userId) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  await db.query('INSERT INTO admin_sessions (token_hash, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))', [hashToken(rawToken), userId, SESSION_TTL_DAYS]);
  return rawToken;
}

async function requireAdmin(req, res, next) {
  try {
    const rawToken = req.cookies?.sh_admin_session;
    if (!rawToken) return res.redirect('/admin/login');
    const [rows] = await db.query(`SELECT u.id, u.name, u.email, u.role, u.verified, u.active FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > NOW() AND u.active = 1 AND u.verified = 1 LIMIT 1`, [hashToken(rawToken)]);
    if (!rows.length) { clearSessionCookie(res); return res.redirect('/admin/login'); }
    req.admin = rows[0];
    await db.query('UPDATE admin_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE token_hash = ?', [hashToken(rawToken)]);
    return next();
  } catch (error) {
    console.error('Admin authentication error:', error.message);
    return res.status(500).send('Unable to authenticate this request.');
  }
}

async function findEnquiry(referenceId) {
  const ref = safe(referenceId, 64);
  for (const table of ['contacts', 'quote_requests', 'consultation_requests']) {
    const [rows] = await db.query(`SELECT * FROM ${table} WHERE reference_id = ? LIMIT 1`, [ref]);
    if (rows.length) {
      const type = table === 'contacts' ? 'CONTACT' : table === 'quote_requests' ? 'QUOTE' : 'CONSULTATION';
      return { ...rows[0], type };
    }
  }
  return null;
}

async function getEnquiryState(referenceId) {
  const [rows] = await db.query('SELECT reference_id, status, assigned_to, internal_note, updated_by, created_at, updated_at FROM admin_enquiry_status WHERE reference_id = ? LIMIT 1', [referenceId]);
  return rows[0] || { reference_id: referenceId, status: 'NEW', assigned_to: null, internal_note: null };
}

router.get('/login', (req, res) => {
  if (req.admin) return res.redirect('/admin');
  res.render('admin/login', { title: 'Staff Login — Share Hubs Engineering', error: req.query.error || null, verified: req.query.verified || null });
});
router.get('/register', (req, res) => res.render('admin/register', { title: 'Staff Account — Share Hubs Engineering', error: req.query.error || null }));

router.post('/register', authLimiter, [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Enter your full name.'),
  body('email').trim().isEmail().normalizeEmail().withMessage('Enter a valid company email address.'),
  body('password').isLength({ min: 10, max: 128 }).withMessage('Password must be at least 10 characters.'),
  body('password_confirmation').custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match.'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.redirect(`/admin/register?error=${encodeURIComponent(errors.array()[0].msg)}`);
  const name = safe(req.body.name, 120);
  const email = safe(req.body.email, 255).toLowerCase();
  const password = String(req.body.password || '');
  if (!isCompanyEmail(email)) return res.redirect(`/admin/register?error=${encodeURIComponent('Staff accounts must use a @sharehubsengineering.com email address.')}`);
  try {
    const [existing] = await db.query('SELECT id, verified FROM admin_users WHERE email = ? LIMIT 1', [email]);
    const passwordHash = await bcrypt.hash(password, 12);
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    if (existing.length) {
      if (existing[0].verified) return res.redirect(`/admin/login?error=${encodeURIComponent('An account already exists for this company email.')}`);
      await db.query('UPDATE admin_users SET name = ?, password_hash = ?, verification_token_hash = ?, verification_expires_at = DATE_ADD(NOW(), INTERVAL ? HOUR), active = 1 WHERE id = ?', [name, passwordHash, tokenHash, VERIFICATION_TTL_HOURS, existing[0].id]);
    } else {
      await db.query("INSERT INTO admin_users (name, email, password_hash, role, verification_token_hash, verification_expires_at) VALUES (?, ?, ?, 'STAFF', ?, DATE_ADD(NOW(), INTERVAL ? HOUR))", [name, email, passwordHash, tokenHash, VERIFICATION_TTL_HOURS]);
    }
    await sendVerification(email, name, token);
    return res.redirect('/admin/login?verified=pending');
  } catch (error) {
    console.error('Staff registration error:', error.message);
    return res.redirect(`/admin/register?error=${encodeURIComponent('We could not create the account right now. Please try again.')}`);
  }
});

router.get('/verify/:token', async (req, res) => {
  try {
    const [result] = await db.query('UPDATE admin_users SET verified = 1, verification_token_hash = NULL, verification_expires_at = NULL WHERE verification_token_hash = ? AND verification_expires_at > NOW()', [hashToken(req.params.token)]);
    if (!result.affectedRows) return res.redirect(`/admin/login?error=${encodeURIComponent('This verification link is invalid or has expired.')}`);
    return res.redirect('/admin/login?verified=success');
  } catch (error) {
    console.error('Staff verification error:', error.message);
    return res.redirect(`/admin/login?error=${encodeURIComponent('Verification could not be completed.')}`);
  }
});

router.post('/login', authLimiter, [body('email').trim().isEmail().normalizeEmail().withMessage('Enter a valid email address.'), body('password').notEmpty().withMessage('Password is required.')], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.redirect(`/admin/login?error=${encodeURIComponent(errors.array()[0].msg)}`);
  const email = safe(req.body.email, 255).toLowerCase();
  const password = String(req.body.password || '');
  if (!isCompanyEmail(email)) return res.redirect(`/admin/login?error=${encodeURIComponent('Dashboard access requires a Share Hubs Engineering company email.')}`);
  try {
    const [rows] = await db.query('SELECT * FROM admin_users WHERE email = ? LIMIT 1', [email]);
    if (!rows.length) return res.redirect(`/admin/login?error=${encodeURIComponent('Invalid company email or password.')}`);
    const user = rows[0];
    if (!user.active) return res.redirect(`/admin/login?error=${encodeURIComponent('This staff account has been disabled.')}`);
    if (!user.verified) return res.redirect(`/admin/login?error=${encodeURIComponent('Please verify your company email before signing in.')}`);
    if (!await bcrypt.compare(password, user.password_hash)) return res.redirect(`/admin/login?error=${encodeURIComponent('Invalid company email or password.')}`);
    const token = await createSession(user.id);
    setSessionCookie(res, token);
    return res.redirect('/admin');
  } catch (error) {
    console.error('Admin login error:', error.message);
    return res.redirect(`/admin/login?error=${encodeURIComponent('We could not sign you in right now.')}`);
  }
});

router.post('/logout', requireAdmin, async (req, res) => {
  try {
    const rawToken = req.cookies?.sh_admin_session;
    if (rawToken) await db.query('DELETE FROM admin_sessions WHERE token_hash = ?', [hashToken(rawToken)]);
  } catch (error) { console.error('Admin logout error:', error.message); }
  clearSessionCookie(res);
  return res.redirect('/admin/login');
});

router.get('/', requireAdmin, async (req, res) => {
  try {
    const [[counts]] = await db.query(`SELECT (SELECT COUNT(*) FROM contacts) + (SELECT COUNT(*) FROM quote_requests) + (SELECT COUNT(*) FROM consultation_requests) AS total, (SELECT COUNT(*) FROM contacts WHERE created_at >= CURDATE()) + (SELECT COUNT(*) FROM quote_requests WHERE created_at >= CURDATE()) + (SELECT COUNT(*) FROM consultation_requests WHERE created_at >= CURDATE()) AS today, (SELECT COUNT(*) FROM admin_enquiry_status WHERE status = 'NEW') AS tracked_new, (SELECT COUNT(*) FROM admin_enquiry_status WHERE status = 'CONTACTED') AS contacted, (SELECT COUNT(*) FROM admin_enquiry_status WHERE status = 'WON') AS won`);
    const [enquiries] = await db.query(`SELECT * FROM (SELECT 'CONTACT' AS type, reference_id, name, email, phone, subject, NULL AS service, NULL AS company, created_at FROM contacts UNION ALL SELECT 'QUOTE' AS type, reference_id, name, email, phone, CONCAT('Quote request — ', service) AS subject, service, company, created_at FROM quote_requests UNION ALL SELECT 'CONSULTATION' AS type, reference_id, name, email, phone, CONCAT('Consultation — ', topic) AS subject, NULL AS service, company, created_at FROM consultation_requests) enquiries ORDER BY created_at DESC LIMIT 12`);
    const references = enquiries.map((item) => item.reference_id).filter(Boolean);
    let statuses = [];
    if (references.length) { const placeholders = references.map(() => '?').join(','); [statuses] = await db.query(`SELECT reference_id, status, assigned_to, internal_note FROM admin_enquiry_status WHERE reference_id IN (${placeholders})`, references); }
    const statusMap = new Map(statuses.map((item) => [item.reference_id, item]));
    const rows = enquiries.map((item) => ({ ...item, ...(statusMap.get(item.reference_id) || { status: 'NEW', assigned_to: null, internal_note: null }) }));
    return res.render('admin/dashboard', { title: 'Admin Dashboard — Share Hubs Engineering', admin: req.admin, counts: counts || {}, enquiries: rows, statuses: ALLOWED_STATUSES, dashboardError: null });
  } catch (error) {
    console.error('Admin dashboard load error:', error.message);
    return res.status(500).render('admin/dashboard', { title: 'Admin Dashboard — Share Hubs Engineering', admin: req.admin, counts: {}, enquiries: [], statuses: ALLOWED_STATUSES, dashboardError: 'The dashboard could not load the enquiry data.' });
  }
});

router.get('/enquiries/:reference', requireAdmin, async (req, res) => {
  try {
    const enquiry = await findEnquiry(req.params.reference);
    if (!enquiry) return res.status(404).render('404', { title: 'Enquiry Not Found', path: '/admin/enquiries' });
    const state = await getEnquiryState(enquiry.reference_id);
    const [staff] = await db.query('SELECT id, name, email, role FROM admin_users WHERE active = 1 AND verified = 1 ORDER BY name ASC');
    const [activity] = await db.query(`SELECT a.*, u.name AS actor_name, u.email AS actor_email FROM admin_enquiry_activity a LEFT JOIN admin_users u ON u.id = a.actor_id WHERE a.reference_id = ? ORDER BY a.created_at DESC LIMIT 100`, [enquiry.reference_id]);
    return res.render('admin/enquiry', { title: `${enquiry.reference_id} — Admin`, admin: req.admin, enquiry, state, staff, statuses: ALLOWED_STATUSES, activity, error: null });
  } catch (error) {
    console.error('Admin enquiry detail error:', error.message);
    return res.status(500).send('Unable to load this enquiry.');
  }
});

router.get('/api/enquiries', requireAdmin, async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
  const offset = (page - 1) * limit;
  const search = safe(req.query.search, 120).toLowerCase();
  const status = safe(req.query.status, 30).toUpperCase();
  try {
    const [all] = await db.query(`SELECT * FROM (SELECT 'CONTACT' AS type, reference_id, name, email, phone, subject, NULL AS service, NULL AS company, created_at FROM contacts UNION ALL SELECT 'QUOTE', reference_id, name, email, phone, CONCAT('Quote request — ', service), service, company, created_at FROM quote_requests UNION ALL SELECT 'CONSULTATION', reference_id, name, email, phone, CONCAT('Consultation — ', topic), NULL, company, created_at FROM consultation_requests) enquiries ORDER BY created_at DESC`);
    const references = all.map((item) => item.reference_id).filter(Boolean);
    let statusRows = [];
    if (references.length) { const placeholders = references.map(() => '?').join(','); [statusRows] = await db.query(`SELECT reference_id, status, assigned_to FROM admin_enquiry_status WHERE reference_id IN (${placeholders})`, references); }
    const statusMap = new Map(statusRows.map((item) => [item.reference_id, item]));
    const merged = all.map((item) => ({ ...item, status: statusMap.get(item.reference_id)?.status || 'NEW', assigned_to: statusMap.get(item.reference_id)?.assigned_to || null }));
    const filtered = merged.filter((item) => {
      const matchesStatus = !status || status === 'ALL' || item.status === status;
      const haystack = `${item.reference_id} ${item.name} ${item.email} ${item.subject} ${item.service || ''} ${item.company || ''}`.toLowerCase();
      return matchesStatus && (!search || haystack.includes(search));
    });
    return res.json({ ok: true, page, limit, total: filtered.length, enquiries: filtered.slice(offset, offset + limit) });
  } catch (error) {
    console.error('Admin enquiry API error:', error.message);
    return res.status(500).json({ ok: false, error: 'Unable to load enquiries.' });
  }
});

router.patch('/api/enquiries/:reference/status', requireAdmin, async (req, res) => {
  const referenceId = safe(req.params.reference, 64);
  const status = safe(req.body.status, 30).toUpperCase();
  if (!referenceId || !ALLOWED_STATUSES.includes(status)) return res.status(422).json({ ok: false, error: 'Invalid enquiry status.' });
  try {
    const previous = await getEnquiryState(referenceId);
    await db.query(`INSERT INTO admin_enquiry_status (reference_id, status, updated_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status), updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP`, [referenceId, status, req.admin.id]);
    if (previous.status !== status) await db.query('INSERT INTO admin_enquiry_activity (reference_id, actor_id, action, old_value, new_value) VALUES (?, ?, ?, ?, ?)', [referenceId, req.admin.id, 'STATUS_CHANGED', previous.status, status]);
    return res.json({ ok: true, reference: referenceId, status });
  } catch (error) {
    console.error('Admin status update error:', error.message);
    return res.status(500).json({ ok: false, error: 'Unable to update enquiry status.' });
  }
});

router.patch('/api/enquiries/:reference/assignment', requireAdmin, async (req, res) => {
  const referenceId = safe(req.params.reference, 64);
  const assignedTo = safe(req.body.assigned_to, 255).toLowerCase();
  if (!referenceId) return res.status(422).json({ ok: false, error: 'Invalid enquiry reference.' });
  try {
    const previous = await getEnquiryState(referenceId);
    if (assignedTo) {
      const [staff] = await db.query('SELECT id, email FROM admin_users WHERE email = ? AND active = 1 AND verified = 1 LIMIT 1', [assignedTo]);
      if (!staff.length || !isCompanyEmail(assignedTo)) return res.status(422).json({ ok: false, error: 'Select a verified Share Hubs staff account.' });
    }
    await db.query(`INSERT INTO admin_enquiry_status (reference_id, status, assigned_to, updated_by) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE assigned_to = VALUES(assigned_to), updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP`, [referenceId, previous.status || 'NEW', assignedTo || null, req.admin.id]);
    if ((previous.assigned_to || '') !== assignedTo) await db.query('INSERT INTO admin_enquiry_activity (reference_id, actor_id, action, old_value, new_value) VALUES (?, ?, ?, ?, ?)', [referenceId, req.admin.id, 'ASSIGNED', previous.assigned_to || 'Unassigned', assignedTo || 'Unassigned']);
    return res.json({ ok: true, reference: referenceId, assigned_to: assignedTo || null });
  } catch (error) {
    console.error('Admin assignment error:', error.message);
    return res.status(500).json({ ok: false, error: 'Unable to assign this enquiry.' });
  }
});

router.patch('/api/enquiries/:reference/note', requireAdmin, async (req, res) => {
  const referenceId = safe(req.params.reference, 64);
  const note = safe(req.body.note, 4000);
  if (!referenceId) return res.status(422).json({ ok: false, error: 'Invalid enquiry reference.' });
  if (!note) return res.status(422).json({ ok: false, error: 'Enter an internal note.' });
  try {
    const previous = await getEnquiryState(referenceId);
    await db.query(`INSERT INTO admin_enquiry_status (reference_id, status, internal_note, updated_by) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE internal_note = VALUES(internal_note), updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP`, [referenceId, previous.status || 'NEW', note, req.admin.id]);
    await db.query('INSERT INTO admin_enquiry_activity (reference_id, actor_id, action, note) VALUES (?, ?, ?, ?)', [referenceId, req.admin.id, 'NOTE_ADDED', note]);
    return res.json({ ok: true, reference: referenceId, note });
  } catch (error) {
    console.error('Admin note error:', error.message);
    return res.status(500).json({ ok: false, error: 'Unable to save the internal note.' });
  }
});

router.get('/api/enquiries/:reference', requireAdmin, async (req, res) => {
  try {
    const enquiry = await findEnquiry(req.params.reference);
    if (!enquiry) return res.status(404).json({ ok: false, error: 'Enquiry not found.' });
    const state = await getEnquiryState(enquiry.reference_id);
    const [activity] = await db.query(`SELECT a.id, a.action, a.old_value, a.new_value, a.note, a.created_at, u.name AS actor_name, u.email AS actor_email FROM admin_enquiry_activity a LEFT JOIN admin_users u ON u.id = a.actor_id WHERE a.reference_id = ? ORDER BY a.created_at DESC LIMIT 100`, [enquiry.reference_id]);
    return res.json({ ok: true, enquiry, state, activity });
  } catch (error) {
    console.error('Admin enquiry detail API error:', error.message);
    return res.status(500).json({ ok: false, error: 'Unable to load enquiry details.' });
  }
});

router.get('/api/overview', requireAdmin, async (req, res) => {
  try {
    const [[stats]] = await db.query(`SELECT (SELECT COUNT(*) FROM contacts) + (SELECT COUNT(*) FROM quote_requests) + (SELECT COUNT(*) FROM consultation_requests) AS total, (SELECT COUNT(*) FROM contacts WHERE created_at >= CURDATE()) + (SELECT COUNT(*) FROM quote_requests WHERE created_at >= CURDATE()) + (SELECT COUNT(*) FROM consultation_requests WHERE created_at >= CURDATE()) AS today, (SELECT COUNT(*) FROM admin_enquiry_status WHERE status = 'NEW') AS new_count, (SELECT COUNT(*) FROM admin_enquiry_status WHERE status = 'CONTACTED') AS contacted, (SELECT COUNT(*) FROM admin_enquiry_status WHERE status = 'WON') AS won`);
    return res.json({ ok: true, stats });
  } catch (error) {
    console.error('Admin overview error:', error.message);
    return res.status(500).json({ ok: false, error: 'Unable to load dashboard metrics.' });
  }
});

function messageText(value, max = 30000) { return safe(value, max); }
function messageHtml(value) { return messageText(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])).replace(/\r?\n/g, '<br>'); }

router.get('/api/enquiries/:reference/messages', requireAdmin, async (req, res) => {
  const referenceId = safe(req.params.reference, 64);
  if (!referenceId) return res.status(422).json({ ok: false, error: 'Invalid enquiry reference.' });
  try {
    const enquiry = await findEnquiry(referenceId);
    if (!enquiry) return res.status(404).json({ ok: false, error: 'Enquiry not found.' });
    const [messages] = await db.query(`SELECT m.id, m.reference_id, m.direction, m.sender_type, m.sender_name, m.sender_email, m.recipient_email, m.subject, m.body_text, m.status, m.sent_at, m.created_at, u.name AS actor_name, u.email AS actor_email FROM communication_messages m LEFT JOIN admin_users u ON u.id = m.actor_id WHERE m.reference_id = ? ORDER BY m.created_at ASC, m.id ASC`, [referenceId]);
    return res.json({ ok: true, reference: referenceId, messages });
  } catch (error) {
    console.error('Communication thread load error:', error.message);
    return res.status(500).json({ ok: false, error: 'Unable to load the communication thread.' });
  }
});

router.post('/api/enquiries/:reference/messages', requireAdmin, [
  body('message').trim().isLength({ min: 1, max: 30000 }).withMessage('Enter a message before sending.'),
  body('subject').optional({ checkFalsy: true }).trim().isLength({ max: 500 }).withMessage('Subject is too long.')
], async (req, res) => {
  const referenceId = safe(req.params.reference, 64);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ ok: false, error: errors.array()[0].msg });
  try {
    const enquiry = await findEnquiry(referenceId);
    if (!enquiry) return res.status(404).json({ ok: false, error: 'Enquiry not found.' });
    const subjectBase = safe(enquiry.subject || enquiry.service || enquiry.topic || 'Your Share Hubs Engineering enquiry', 450);
    const subject = safe(req.body.subject || `Re: ${subjectBase}`, 500);
    const bodyText = messageText(req.body.message);
    const [lastMessages] = await db.query(`SELECT message_id FROM communication_messages WHERE reference_id = ? AND message_id IS NOT NULL ORDER BY created_at DESC, id DESC LIMIT 1`, [referenceId]);
    const inReplyTo = lastMessages[0]?.message_id || null;
    const recipient = safe(enquiry.email, 255);
    const sender = config.smtp.from;
    const [pending] = await db.query(`INSERT INTO communication_messages (reference_id, direction, sender_type, sender_name, sender_email, recipient_email, subject, body_text, body_html, in_reply_to, status, actor_id) VALUES (?, 'OUTBOUND', 'STAFF', ?, ?, ?, ?, ?, ?, ?, 'QUEUED', ?)`, [referenceId, req.admin.name, sender, recipient, subject, bodyText, messageHtml(bodyText), inReplyTo, req.admin.id]);
    try {
      const info = await transporter.sendMail({ from: sender, to: recipient, replyTo: sender, subject, text: bodyText, html: messageHtml(bodyText), headers: { 'X-Share-Hubs-Reference': referenceId, 'X-Share-Hubs-Message': String(pending.insertId) }, inReplyTo: inReplyTo || undefined, references: inReplyTo || undefined });
      await db.query(`UPDATE communication_messages SET status = 'SENT', message_id = ?, sent_at = NOW() WHERE id = ?`, [info.messageId || null, pending.insertId]);
      await db.query(`INSERT INTO admin_enquiry_activity (reference_id, actor_id, action, note) VALUES (?, ?, 'MESSAGE_SENT', ?)`, [referenceId, req.admin.id, `Email sent to ${recipient}: ${subject}`]);
      return res.status(201).json({ ok: true, message: { id: pending.insertId, reference_id: referenceId, direction: 'OUTBOUND', sender_type: 'STAFF', sender_name: req.admin.name, sender_email: sender, recipient_email: recipient, subject, body_text: bodyText, status: 'SENT', actor_name: req.admin.name, created_at: new Date().toISOString() } });
    } catch (mailError) {
      await db.query(`UPDATE communication_messages SET status = 'FAILED' WHERE id = ?`, [pending.insertId]);
      await db.query(`INSERT INTO admin_enquiry_activity (reference_id, actor_id, action, note) VALUES (?, ?, 'MESSAGE_FAILED', ?)`, [referenceId, req.admin.id, `Email failed for ${recipient}: ${mailError.message}`]);
      return res.status(502).json({ ok: false, error: 'The message could not be sent. It has been marked as failed.' });
    }
  } catch (error) {
    console.error('Communication send error:', error.message);
    return res.status(500).json({ ok: false, error: 'Unable to send this message.' });
  }
});

module.exports = { router, requireAdmin };

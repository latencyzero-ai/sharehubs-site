const express = require('express');
const db = require('../config/db');
const { requireAdmin } = require('./admin');

const router = express.Router();
const COMMUNICATION_STATUSES = ['NEW', 'AWAITING_STAFF', 'AWAITING_CUSTOMER', 'RESOLVED', 'CLOSED'];

function safe(value, max = 4000) {
  return String(value ?? '').trim().slice(0, max);
}

async function ensureState(referenceId) {
  await db.query(`INSERT INTO admin_enquiry_status (reference_id, status, communication_status) VALUES (?, 'NEW', 'NEW') ON DUPLICATE KEY UPDATE reference_id = VALUES(reference_id)`, [referenceId]);
}

async function setCommunicationStatus(referenceId, nextStatus, actorId = null) {
  if (!COMMUNICATION_STATUSES.includes(nextStatus)) return;
  await ensureState(referenceId);
  const [rows] = await db.query('SELECT communication_status FROM admin_enquiry_status WHERE reference_id = ? LIMIT 1', [referenceId]);
  const previous = rows[0]?.communication_status || 'NEW';
  if (previous === nextStatus) return;

  await db.query('UPDATE admin_enquiry_status SET communication_status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE reference_id = ?', [nextStatus, actorId, referenceId]);
  await db.query('INSERT INTO admin_enquiry_activity (reference_id, actor_id, action, old_value, new_value) VALUES (?, ?, ?, ?, ?)', [referenceId, actorId, 'COMMUNICATION_STATUS_CHANGED', previous, nextStatus]);
}

async function syncCommunicationStatuses() {
  try {
    const [references] = await db.query(`SELECT reference_id FROM admin_enquiry_status UNION SELECT reference_id FROM communication_messages`);
    for (const row of references) {
      const referenceId = row.reference_id;
      const [last] = await db.query(`SELECT direction, status FROM communication_messages WHERE reference_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`, [referenceId]);
      if (!last.length) continue;

      const [state] = await db.query('SELECT communication_status FROM admin_enquiry_status WHERE reference_id = ? LIMIT 1', [referenceId]);
      const current = state[0]?.communication_status || 'NEW';
      if (current === 'RESOLVED' || current === 'CLOSED') continue;

      const next = last[0].direction === 'INBOUND' ? 'AWAITING_STAFF' : last[0].status === 'SENT' ? 'AWAITING_CUSTOMER' : current;
      if (next !== current) await setCommunicationStatus(referenceId, next);
    }
  } catch (error) {
    console.error('Communication status sync failed:', error.message);
  }
}

let statusSyncTimer = null;
let statusSyncStarted = false;

function startCommunicationStatusSync(intervalMs = 30000) {
  if (statusSyncStarted) return;
  statusSyncStarted = true;
  const interval = Math.max(Number(intervalMs) || 30000, 15000);
  syncCommunicationStatuses();
  statusSyncTimer = setInterval(syncCommunicationStatuses, interval);
  statusSyncTimer.unref?.();
  console.log(`Communication status sync enabled every ${interval / 1000}s`);
}

function stopCommunicationStatusSync() {
  if (statusSyncTimer) clearInterval(statusSyncTimer);
  statusSyncTimer = null;
  statusSyncStarted = false;
}

router.get('/api/communication/overview', requireAdmin, async (_req, res) => {
  try {
    const [[counts]] = await db.query(`SELECT
      (SELECT COUNT(*) FROM admin_enquiry_status WHERE communication_status = 'AWAITING_STAFF') AS awaiting_staff,
      (SELECT COUNT(*) FROM admin_enquiry_status WHERE communication_status = 'AWAITING_CUSTOMER') AS awaiting_customer,
      (SELECT COUNT(*) FROM communication_messages WHERE direction = 'INBOUND' AND is_read = 0) AS unread_messages,
      (SELECT COUNT(DISTINCT reference_id) FROM communication_messages WHERE direction = 'INBOUND' AND is_read = 0) AS unread_conversations,
      (SELECT COUNT(*) FROM admin_enquiry_status WHERE communication_status = 'RESOLVED') AS resolved,
      (SELECT COUNT(*) FROM admin_enquiry_status WHERE communication_status = 'CLOSED') AS closed`);

    const [rows] = await db.query(`SELECT s.reference_id, s.communication_status,
      COALESCE(u.unread_count, 0) AS unread_count,
      lm.direction AS last_direction,
      lm.created_at AS last_message_at
      FROM admin_enquiry_status s
      LEFT JOIN (
        SELECT reference_id, COUNT(*) AS unread_count
        FROM communication_messages
        WHERE direction = 'INBOUND' AND is_read = 0
        GROUP BY reference_id
      ) u ON u.reference_id = s.reference_id
      LEFT JOIN communication_messages lm ON lm.id = (
        SELECT m2.id FROM communication_messages m2 WHERE m2.reference_id = s.reference_id ORDER BY m2.created_at DESC, m2.id DESC LIMIT 1
      )
      WHERE s.communication_status IS NOT NULL`);

    return res.json({ ok: true, counts: counts || {}, conversations: rows });
  } catch (error) {
    console.error('Communication overview error:', error.message);
    return res.status(500).json({ ok: false, error: 'Unable to load communication overview.' });
  }
});

router.get('/api/enquiries/:reference/messages', requireAdmin, async (req, res) => {
  const referenceId = safe(req.params.reference, 64);
  if (!referenceId) return res.status(422).json({ ok: false, error: 'Invalid enquiry reference.' });

  try {
    const [messages] = await db.query(`SELECT m.id, m.reference_id, m.direction, m.sender_type, m.sender_name, m.sender_email, m.recipient_email, m.subject, m.body_text, m.status, m.is_read, m.sent_at, m.created_at, u.name AS actor_name, u.email AS actor_email FROM communication_messages m LEFT JOIN admin_users u ON u.id = m.actor_id WHERE m.reference_id = ? ORDER BY m.created_at ASC, m.id ASC`, [referenceId]);

    await db.query(`UPDATE communication_messages SET is_read = 1 WHERE reference_id = ? AND direction = 'INBOUND' AND is_read = 0`, [referenceId]);

    return res.json({ ok: true, reference: referenceId, messages });
  } catch (error) {
    console.error('Communication thread load error:', error.message);
    return res.status(500).json({ ok: false, error: 'Unable to load the communication thread.' });
  }
});

router.patch('/api/enquiries/:reference/communication-status', requireAdmin, async (req, res) => {
  const referenceId = safe(req.params.reference, 64);
  const status = safe(req.body.status, 30).toUpperCase();
  if (!referenceId || !COMMUNICATION_STATUSES.includes(status)) return res.status(422).json({ ok: false, error: 'Invalid communication status.' });

  try {
    await setCommunicationStatus(referenceId, status, req.admin.id);
    return res.json({ ok: true, reference: referenceId, communication_status: status });
  } catch (error) {
    console.error('Communication status update error:', error.message);
    return res.status(500).json({ ok: false, error: 'Unable to update communication status.' });
  }
});

router.post('/api/enquiries/:reference/read', requireAdmin, async (req, res) => {
  const referenceId = safe(req.params.reference, 64);
  if (!referenceId) return res.status(422).json({ ok: false, error: 'Invalid enquiry reference.' });
  try {
    const [result] = await db.query(`UPDATE communication_messages SET is_read = 1 WHERE reference_id = ? AND direction = 'INBOUND'`, [referenceId]);
    return res.json({ ok: true, reference: referenceId, marked_read: result.affectedRows || 0 });
  } catch (error) {
    console.error('Communication read update error:', error.message);
    return res.status(500).json({ ok: false, error: 'Unable to mark messages as read.' });
  }
});

module.exports = {
  router,
  syncCommunicationStatuses,
  startCommunicationStatusSync,
  stopCommunicationStatusSync,
  setCommunicationStatus,
  COMMUNICATION_STATUSES,
};

const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

const db = require('../config/db');
const config = require('../config/env');

const REFERENCE_PATTERN = /\b(?:CON|QUO|CONS)-[A-Z0-9]+\b/i;

let timer = null;
let running = false;

function normalize(value) {
  return String(value || '').trim();
}

function firstAddress(addresses) {
  return Array.isArray(addresses) && addresses[0] ? addresses[0] : null;
}

function extractReference(subject, inReplyTo, references) {
  const haystack = [subject, inReplyTo, ...(Array.isArray(references) ? references : [])]
    .filter(Boolean)
    .join(' ');
  const match = haystack.match(REFERENCE_PATTERN);
  return match ? match[0].toUpperCase() : null;
}

async function resolveReference({ subject, inReplyTo, references, messageId }) {
  const directReference = extractReference(subject, inReplyTo, references);
  if (directReference) {
    const [rows] = await db.query(
      `SELECT reference_id FROM communication_messages WHERE reference_id = ? LIMIT 1`,
      [directReference]
    );
    if (rows.length) return directReference;

    for (const table of ['contacts', 'quote_requests', 'consultation_requests']) {
      const [sourceRows] = await db.query(
        `SELECT reference_id FROM ${table} WHERE reference_id = ? LIMIT 1`,
        [directReference]
      );
      if (sourceRows.length) return directReference;
    }
  }

  const ids = [inReplyTo, ...(Array.isArray(references) ? references : [])].filter(Boolean);
  if (ids.length) {
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await db.query(
      `SELECT reference_id FROM communication_messages WHERE message_id IN (${placeholders}) ORDER BY created_at DESC LIMIT 1`,
      ids
    );
    if (rows.length) return rows[0].reference_id;
  }

  if (messageId) {
    const [rows] = await db.query(
      `SELECT reference_id FROM communication_messages WHERE message_id = ? LIMIT 1`,
      [messageId]
    );
    if (rows.length) return rows[0].reference_id;
  }

  return null;
}

async function saveInboundMessage(message) {
  const messageId = normalize(message.messageId);
  if (!messageId) return { saved: false, reason: 'missing-message-id' };

  const [existing] = await db.query(
    `SELECT id FROM communication_messages WHERE message_id = ? LIMIT 1`,
    [messageId]
  );
  if (existing.length) return { saved: false, reason: 'duplicate' };

  const referenceId = await resolveReference(message);
  if (!referenceId) return { saved: false, reason: 'unmatched' };

  const sender = firstAddress(message.from);
  const recipient = firstAddress(message.to) || firstAddress(message.cc);
  const senderEmail = normalize(sender?.address).toLowerCase();
  const senderName = normalize(sender?.name) || senderEmail || 'Customer';
  const recipientEmail = normalize(recipient?.address).toLowerCase() || config.imap.user;
  const subject = normalize(message.subject) || `Reply — ${referenceId}`;
  const bodyText = normalize(message.text) || normalize(message.html?.replace(/<[^>]+>/g, ' '));
  const bodyHtml = normalize(message.html);

  if (!bodyText) return { saved: false, reason: 'empty-message' };

  await db.query(
    `INSERT INTO communication_messages
      (reference_id, direction, sender_type, sender_name, sender_email, recipient_email,
       subject, body_text, body_html, message_id, in_reply_to, status, sent_at)
     VALUES (?, 'INBOUND', 'CUSTOMER', ?, ?, ?, ?, ?, ?, ?, ?, 'RECEIVED', ?)` ,
    [
      referenceId,
      senderName,
      senderEmail,
      recipientEmail,
      subject,
      bodyText,
      bodyHtml || null,
      messageId,
      normalize(message.inReplyTo) || null,
      message.date || new Date(),
    ]
  );

  return { saved: true, referenceId };
}

async function syncInboundMail() {
  if (running) return;
  running = true;

  const client = new ImapFlow({
    host: config.imap.host,
    port: config.imap.port,
    secure: config.imap.secure,
    auth: {
      user: config.imap.user,
      pass: config.imap.pass,
    },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock(config.imap.mailbox);

    try {
      const uids = await client.search({ seen: false }, { uid: true });

      for (const uid of uids) {
        let result;
        try {
          const fetched = await client.fetchOne(uid, { source: true, envelope: true, internalDate: true }, { uid: true });
          if (!fetched?.source) continue;

          const parsed = await simpleParser(fetched.source);
          result = await saveInboundMessage({
            messageId: parsed.messageId || fetched.envelope?.messageId,
            inReplyTo: parsed.inReplyTo || fetched.envelope?.inReplyTo,
            references: parsed.references || fetched.envelope?.references || [],
            subject: parsed.subject || fetched.envelope?.subject,
            from: parsed.from?.value || fetched.envelope?.from || [],
            to: parsed.to?.value || fetched.envelope?.to || [],
            cc: parsed.cc?.value || fetched.envelope?.cc || [],
            text: parsed.text,
            html: parsed.html,
            date: parsed.date || fetched.internalDate || new Date(),
          });

          if (result.saved) {
            console.log(`Inbound email attached to ${result.referenceId}`);
          } else if (result.reason === 'unmatched') {
            console.warn(`Inbound email ${parsed.messageId || uid} did not match an enquiry reference; leaving unread.`);
            continue;
          }

          await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
        } catch (error) {
          console.error(`Inbound email processing failed for UID ${uid}:`, error.message);
        }
      }
    } finally {
      lock.release();
    }
  } catch (error) {
    console.error('Inbound mail sync failed:', error.message);
  } finally {
    try { await client.logout(); } catch (_) {}
    running = false;
  }
}

function startInboundMailSync() {
  if (!config.imap.enabled) {
    console.log('Inbound mail sync disabled. Set IMAP_ENABLED=true to enable it.');
    return;
  }

  const interval = Math.max(config.imap.intervalMs, 15000);
  syncInboundMail();
  timer = setInterval(syncInboundMail, interval);
  timer.unref?.();
  console.log(`Inbound mail sync enabled: ${config.imap.user} / ${config.imap.mailbox} every ${interval / 1000}s`);
}

function stopInboundMailSync() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { startInboundMailSync, stopInboundMailSync, syncInboundMail };

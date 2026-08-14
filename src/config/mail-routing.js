/**
 * Share Hubs Engineering operational mailbox routing.
 *
 * These are role mailboxes, not individual staff accounts. Keep the mapping
 * centralised so changing a mailbox never requires editing route handlers.
 */
const MAIL_ROUTING = Object.freeze({
  CONTACT: {
    task: 'General enquiries',
    email: 'info@sharehubsengineering.com',
  },
  QUOTE: {
    task: 'Quote requests',
    email: 'quotes@sharehubsengineering.com',
  },
  CONSULTATION: {
    task: 'Consultation requests',
    email: 'consultation@sharehubsengineering.com',
  },
  SUPPORT: {
    task: 'Customer support',
    email: 'support@sharehubsengineering.com',
  },
  ADMIN: {
    task: 'Website and system administration',
    email: 'admin@sharehubsengineering.com',
  },
});

const DEFAULT_SENDER = 'noreply@sharehubsengineering.com';

function getMailboxForType(type) {
  return MAIL_ROUTING[String(type || '').trim().toUpperCase()] || null;
}

module.exports = { MAIL_ROUTING, DEFAULT_SENDER, getMailboxForType };

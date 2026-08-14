const crypto = require('crypto');
const db = require('../config/db');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function isRole(role, ...allowed) {
  return allowed.includes(String(role || '').toUpperCase());
}

function isMutation(req) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
}

function getReference(pathname) {
  const match = pathname.match(/^\/admin\/api\/enquiries\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Phase 6C RBAC gate.
 *
 * requireAdmin remains the authentication source of truth for pages/routes.
 * This gate runs before the admin routers only for mutating API requests so
 * read-only Viewer access remains intact while staff cannot mutate enquiries
 * they have not been assigned.
 */
async function adminRbacGate(req, res, next) {
  if (!isMutation(req) || !req.path.startsWith('/api/')) return next();

  const pathname = req.path;
  const referenceId = getReference(pathname);
  const isCommunicationRead = req.method === 'POST' && /\/messages$/.test(pathname) === false && /\/read$/.test(pathname);
  const isMessageSend = req.method === 'POST' && /\/messages$/.test(pathname);
  const isEnquiryMutation = ['PATCH'].includes(req.method) && referenceId && (
    /\/status$/.test(pathname) ||
    /\/assignment$/.test(pathname) ||
    /\/note$/.test(pathname) ||
    /\/communication-status$/.test(pathname)
  );

  // Staff-management endpoints implement their own stricter role checks.
  if (pathname.startsWith('/api/staff')) return next();
  if (!isMessageSend && !isEnquiryMutation && !isCommunicationRead) return next();

  try {
    const rawToken = req.cookies?.sh_admin_session;
    if (!rawToken) return res.status(401).json({ ok: false, error: 'Authentication required.' });

    const [rows] = await db.query(`
      SELECT u.id, u.name, u.email, u.role
      FROM admin_sessions s
      JOIN admin_users u ON u.id = s.user_id
      WHERE s.token_hash = ?
        AND s.expires_at > NOW()
        AND u.active = 1
        AND u.verified = 1
      LIMIT 1
    `, [hashToken(rawToken)]);

    if (!rows.length) return res.status(401).json({ ok: false, error: 'Authentication required.' });

    const user = rows[0];
    req.adminRbac = user;

    // Viewers may read the communication inbox but cannot mutate it.
    if (isRole(user.role, 'VIEWER')) {
      return res.status(403).json({ ok: false, error: 'Viewer accounts have read-only access.' });
    }

    // Super Admin and Admin can operate on all enquiries.
    if (isRole(user.role, 'SUPER_ADMIN', 'ADMIN')) return next();

    // Staff can operate only on enquiries assigned to their own company email.
    if (isRole(user.role, 'STAFF') && referenceId) {
      const [[state]] = await db.query(
        'SELECT assigned_to FROM admin_enquiry_status WHERE reference_id = ? LIMIT 1',
        [referenceId]
      );
      if (state?.assigned_to && state.assigned_to.toLowerCase() === user.email.toLowerCase()) return next();
      return res.status(403).json({ ok: false, error: 'This enquiry is not assigned to your staff account.' });
    }

    return res.status(403).json({ ok: false, error: 'You do not have permission to perform this action.' });
  } catch (error) {
    console.error('Admin RBAC gate error:', error.message);
    return res.status(500).json({ ok: false, error: 'Unable to authorize this action.' });
  }
}

module.exports = { adminRbacGate };

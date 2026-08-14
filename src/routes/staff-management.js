const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { requireAdmin } = require('./admin');

const router = express.Router();
const COMPANY_DOMAIN = '@sharehubsengineering.com';
const ROLES = ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'VIEWER'];

function safe(value, max = 4000) {
  return String(value ?? '').trim().slice(0, max);
}

function isCompanyEmail(email) {
  return safe(email, 255).toLowerCase().endsWith(COMPANY_DOMAIN);
}

function hasRole(user, ...roles) {
  return roles.includes(String(user?.role || '').toUpperCase());
}

function requireStaffManager(req, res, next) {
  if (!hasRole(req.admin, 'SUPER_ADMIN', 'ADMIN')) {
    return res.status(403).json({ ok: false, error: 'You do not have permission to manage staff.' });
  }
  return next();
}

function requireSuperAdmin(req, res, next) {
  if (!hasRole(req.admin, 'SUPER_ADMIN')) {
    return res.status(403).json({ ok: false, error: 'Super Admin permission is required for this action.' });
  }
  return next();
}

async function recordActivity(staffUserId, actorId, action, oldValue = null, newValue = null) {
  await db.query(
    'INSERT INTO admin_staff_activity (staff_user_id, actor_id, action, old_value, new_value) VALUES (?, ?, ?, ?, ?)',
    [staffUserId, actorId, action, oldValue, newValue]
  );
}

router.get('/staff', requireAdmin, async (req, res) => {
  if (!hasRole(req.admin, 'SUPER_ADMIN', 'ADMIN')) {
    return res.status(403).render('404', { title: 'Access Denied', path: '/admin/staff' });
  }

  try {
    const [staff] = await db.query(`
      SELECT
        u.id, u.name, u.email, u.role, u.verified, u.active,
        u.created_at, u.updated_at,
        (SELECT MAX(s.last_seen_at) FROM admin_sessions s WHERE s.user_id = u.id) AS last_login,
        (SELECT COUNT(*) FROM admin_enquiry_status e WHERE e.assigned_to = u.email) AS assigned_count
      FROM admin_users u
      ORDER BY
        CASE u.role WHEN 'SUPER_ADMIN' THEN 1 WHEN 'ADMIN' THEN 2 WHEN 'STAFF' THEN 3 ELSE 4 END,
        u.name ASC
    `);

    const [activity] = await db.query(`
      SELECT a.*, actor.name AS actor_name
      FROM admin_staff_activity a
      LEFT JOIN admin_users actor ON actor.id = a.actor_id
      ORDER BY a.created_at DESC
      LIMIT 50
    `);

    return res.render('admin/staff', {
      title: 'Staff Management — Share Hubs Engineering',
      admin: req.admin,
      staff,
      activity,
      roles: ROLES,
      error: null,
    });
  } catch (error) {
    console.error('Staff management load error:', error.message);
    return res.status(500).send('Unable to load staff management.');
  }
});

router.get('/api/staff', requireAdmin, requireStaffManager, async (_req, res) => {
  try {
    const [staff] = await db.query(`
      SELECT
        u.id, u.name, u.email, u.role, u.verified, u.active,
        u.created_at,
        (SELECT MAX(s.last_seen_at) FROM admin_sessions s WHERE s.user_id = u.id) AS last_login,
        (SELECT COUNT(*) FROM admin_enquiry_status e WHERE e.assigned_to = u.email) AS assigned_count
      FROM admin_users u
      ORDER BY u.name ASC
    `);
    return res.json({ ok: true, staff });
  } catch (error) {
    console.error('Staff API load error:', error.message);
    return res.status(500).json({ ok: false, error: 'Unable to load staff accounts.' });
  }
});

router.patch('/api/staff/:id/role', requireAdmin, requireSuperAdmin, [
  body('role').trim().isIn(ROLES).withMessage('Invalid staff role.'),
], async (req, res) => {
  const userId = Number(req.params.id);
  const role = safe(req.body.role, 30).toUpperCase();
  const errors = validationResult(req);

  if (!Number.isInteger(userId) || userId < 1) return res.status(422).json({ ok: false, error: 'Invalid staff account.' });
  if (!errors.isEmpty()) return res.status(422).json({ ok: false, error: errors.array()[0].msg });

  try {
    const [[target]] = await db.query('SELECT id, name, email, role, active, verified FROM admin_users WHERE id = ? LIMIT 1', [userId]);
    if (!target) return res.status(404).json({ ok: false, error: 'Staff account not found.' });

    if (target.id === req.admin.id && role !== 'SUPER_ADMIN') {
      return res.status(422).json({ ok: false, error: 'You cannot remove your own Super Admin access.' });
    }

    if (target.role === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN') {
      const [[count]] = await db.query("SELECT COUNT(*) AS total FROM admin_users WHERE role = 'SUPER_ADMIN' AND active = 1 AND verified = 1");
      if (Number(count.total) <= 1) return res.status(422).json({ ok: false, error: 'The system must retain at least one active verified Super Admin.' });
    }

    if (target.role === role) return res.json({ ok: true, user: target });

    await db.query('UPDATE admin_users SET role = ? WHERE id = ?', [role, userId]);
    await recordActivity(userId, req.admin.id, 'ROLE_CHANGED', target.role, role);

    return res.json({ ok: true, user: { ...target, role } });
  } catch (error) {
    console.error('Staff role update error:', error.message);
    return res.status(500).json({ ok: false, error: 'Unable to update this staff role.' });
  }
});

router.patch('/api/staff/:id/status', requireAdmin, requireStaffManager, async (req, res) => {
  const userId = Number(req.params.id);
  const active = req.body.active === true || req.body.active === 'true';

  if (!Number.isInteger(userId) || userId < 1) return res.status(422).json({ ok: false, error: 'Invalid staff account.' });

  try {
    const [[target]] = await db.query('SELECT id, name, email, role, active, verified FROM admin_users WHERE id = ? LIMIT 1', [userId]);
    if (!target) return res.status(404).json({ ok: false, error: 'Staff account not found.' });

    if (target.id === req.admin.id && !active) {
      return res.status(422).json({ ok: false, error: 'You cannot deactivate your own account.' });
    }

    if (!active && target.role === 'SUPER_ADMIN') {
      const [[count]] = await db.query("SELECT COUNT(*) AS total FROM admin_users WHERE role = 'SUPER_ADMIN' AND active = 1 AND verified = 1");
      if (Number(count.total) <= 1) return res.status(422).json({ ok: false, error: 'The system must retain at least one active verified Super Admin.' });
    }

    if (!hasRole(req.admin, 'SUPER_ADMIN') && !['STAFF', 'VIEWER'].includes(target.role)) {
      return res.status(403).json({ ok: false, error: 'Admins can only activate or deactivate Staff and Viewer accounts.' });
    }

    if (Boolean(target.active) === active) return res.json({ ok: true, user: target });

    await db.query('UPDATE admin_users SET active = ? WHERE id = ?', [active ? 1 : 0, userId]);
    await recordActivity(userId, req.admin.id, active ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_DEACTIVATED', target.active ? 'ACTIVE' : 'INACTIVE', active ? 'ACTIVE' : 'INACTIVE');

    return res.json({ ok: true, user: { ...target, active: active ? 1 : 0 } });
  } catch (error) {
    console.error('Staff status update error:', error.message);
    return res.status(500).json({ ok: false, error: 'Unable to update this staff account.' });
  }
});

router.get('/api/staff/:id/activity', requireAdmin, requireStaffManager, async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId < 1) return res.status(422).json({ ok: false, error: 'Invalid staff account.' });

  try {
    const [activity] = await db.query(`
      SELECT a.*, actor.name AS actor_name, actor.email AS actor_email
      FROM admin_staff_activity a
      LEFT JOIN admin_users actor ON actor.id = a.actor_id
      WHERE a.staff_user_id = ?
      ORDER BY a.created_at DESC
      LIMIT 100
    `, [userId]);
    return res.json({ ok: true, activity });
  } catch (error) {
    console.error('Staff activity load error:', error.message);
    return res.status(500).json({ ok: false, error: 'Unable to load staff activity.' });
  }
});

module.exports = { router, ROLES };

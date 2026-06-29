/**
 * Authentication routes — preserves the original flow
 * (register -> hash -> email token -> verify -> login -> logout)
 * with validation, expiring tokens, and resilient error handling.
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');

const db = require('../config/db');
const config = require('../config/env');
const { sendVerificationEmail } = require('../config/mailer');

const router = express.Router();
const ROUNDS = 12;
const TOKEN_TTL_HOURS = 24;

function firstError(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ error: errors.array()[0].msg }); return true; }
  return false;
}

router.post('/register',
  [
    body('username').trim().isLength({ min: 2, max: 50 }).withMessage('Username must be 2–50 characters.'),
    body('email').trim().isEmail().normalizeEmail().withMessage('Enter a valid email address.'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  ],
  async (req, res) => {
    if (firstError(req, res)) return;
    const { username, email, password } = req.body;
    try {
      const hashed = await bcrypt.hash(password, ROUNDS);
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + TOKEN_TTL_HOURS * 3600 * 1000);
      await db.query(
        'INSERT INTO users (username, email, password, token, token_expires) VALUES (?, ?, ?, ?, ?)',
        [username, email, hashed, token, expires]
      );
      const link = `${config.baseUrl}/auth/verify/${token}`;
      sendVerificationEmail(email, link).catch((e) => console.error('Verify email failed:', e.message));
      res.json({ message: 'Registration successful. Please check your email to verify your account.' });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'An account with this email already exists.' });
      console.error('Register error:', err.message);
      res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }
);

router.get('/verify/:token', async (req, res) => {
  try {
    const [result] = await db.query(
      'UPDATE users SET verified = 1, token = NULL, token_expires = NULL WHERE token = ? AND token_expires > NOW()',
      [req.params.token]
    );
    if (result.affectedRows === 0) return res.redirect('/login?verified=expired');
    res.redirect('/login?verified=success');
  } catch (err) {
    console.error('Verify error:', err.message);
    res.status(500).send('Verification failed. Please try again.');
  }
});

router.post('/login',
  [
    body('email').trim().isEmail().normalizeEmail().withMessage('Enter a valid email address.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  async (req, res) => {
    if (firstError(req, res)) return;
    const { email, password } = req.body;
    try {
      const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
      const invalid = () => res.status(401).json({ error: 'Invalid email or password.' });
      if (rows.length === 0) return invalid();
      const user = rows[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) return invalid();
      if (!user.verified) return res.status(403).json({ error: 'Please verify your email before logging in.' });
      req.session.userId = user.id;
      req.session.username = user.username;
      res.json({ message: 'Login successful', redirect: '/' });
    } catch (err) {
      console.error('Login error:', err.message);
      res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }
);

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;

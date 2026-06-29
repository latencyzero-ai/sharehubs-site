/** Centralised, validated environment config. Fails fast if secrets are missing. */
require('dotenv').config();

const required = ['DB_HOST', 'DB_USER', 'DB_NAME', 'SESSION_SECRET', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`\u274C Missing env vars: ${missing.join(', ')}\nCopy .env.example to .env and fill them in.`);
  process.exit(1);
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  baseUrl: process.env.BASE_URL || 'http://localhost:5000',
  db: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
  },
  sessionSecret: process.env.SESSION_SECRET,
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 465,
    secure: process.env.SMTP_SECURE !== 'false',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM,
  },
};

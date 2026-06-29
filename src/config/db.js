/** MySQL connection pool (promise-based) — resilient to dropped connections. */
const mysql = require('mysql2');
const config = require('./env');

const pool = mysql.createPool({
  host: config.db.host, user: config.db.user, password: config.db.password,
  database: config.db.database, port: config.db.port,
  waitForConnections: true, connectionLimit: 10, queueLimit: 0, enableKeepAlive: true,
});
const db = pool.promise();

(async () => {
  try { const c = await db.getConnection(); console.log('\u2705 MySQL pool connected'); c.release(); }
  catch (e) { console.error('\u274C MySQL connection failed:', e.message); }
})();

module.exports = db;

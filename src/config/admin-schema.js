/** Admin dashboard schema. Uses MySQL-backed sessions; no third-party session store required. */
const db = require('./db');

const statements = [
  `CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'STAFF',
    verified TINYINT(1) NOT NULL DEFAULT 0,
    active TINYINT(1) NOT NULL DEFAULT 1,
    verification_token_hash CHAR(64) NULL,
    verification_expires_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_admin_users_role (role),
    INDEX idx_admin_users_active (active)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash CHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_admin_sessions_user FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
    INDEX idx_admin_sessions_user (user_id),
    INDEX idx_admin_sessions_expiry (expires_at)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS admin_enquiry_status (
    reference_id VARCHAR(64) PRIMARY KEY,
    status VARCHAR(30) NOT NULL DEFAULT 'NEW',
    communication_status VARCHAR(30) NOT NULL DEFAULT 'NEW',
    assigned_to VARCHAR(255) NULL,
    internal_note TEXT NULL,
    updated_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_admin_enquiry_status (status),
    INDEX idx_admin_enquiry_communication_status (communication_status),
    INDEX idx_admin_enquiry_assignee (assigned_to),
    CONSTRAINT fk_admin_enquiry_status_user FOREIGN KEY (updated_by) REFERENCES admin_users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS admin_enquiry_activity (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reference_id VARCHAR(64) NOT NULL,
    actor_id INT NULL,
    action VARCHAR(40) NOT NULL,
    old_value VARCHAR(255) NULL,
    new_value VARCHAR(255) NULL,
    note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin_activity_reference (reference_id),
    INDEX idx_admin_activity_created (created_at),
    CONSTRAINT fk_admin_activity_user FOREIGN KEY (actor_id) REFERENCES admin_users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS communication_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reference_id VARCHAR(64) NOT NULL,
    direction ENUM('INBOUND', 'OUTBOUND') NOT NULL,
    sender_type ENUM('CUSTOMER', 'STAFF', 'SYSTEM') NOT NULL,
    sender_name VARCHAR(160) NULL,
    sender_email VARCHAR(255) NULL,
    recipient_email VARCHAR(255) NULL,
    subject VARCHAR(500) NULL,
    body_text LONGTEXT NOT NULL,
    body_html LONGTEXT NULL,
    message_id VARCHAR(500) NULL,
    in_reply_to VARCHAR(500) NULL,
    status ENUM('RECEIVED', 'QUEUED', 'SENT', 'FAILED') NOT NULL DEFAULT 'RECEIVED',
    is_read TINYINT(1) NOT NULL DEFAULT 1,
    actor_id INT NULL,
    sent_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_communication_reference (reference_id, created_at),
    INDEX idx_communication_message_id (message_id),
    INDEX idx_communication_in_reply_to (in_reply_to),
    INDEX idx_communication_sender (sender_email),
    INDEX idx_communication_unread (reference_id, direction, is_read),
    CONSTRAINT fk_communication_actor FOREIGN KEY (actor_id) REFERENCES admin_users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,
];

async function ensureColumn(table, column, definition) {
  const [rows] = await db.query(`SELECT COUNT(*) AS count FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`, [table, column]);
  if (!rows[0].count) await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

async function ensureAdminSchema() {
  for (const statement of statements) await db.query(statement);

  // Safe migrations for installations created before Phase 6.5.
  await ensureColumn('admin_enquiry_status', 'communication_status', "VARCHAR(30) NOT NULL DEFAULT 'NEW'");
  await ensureColumn('communication_messages', 'is_read', 'TINYINT(1) NOT NULL DEFAULT 1');

  await db.query("UPDATE admin_enquiry_status SET communication_status = 'NEW' WHERE communication_status IS NULL OR communication_status = ''");
  await db.query('DELETE FROM admin_sessions WHERE expires_at < NOW()');
  console.log('Admin dashboard schema ready');
}

module.exports = { ensureAdminSchema };

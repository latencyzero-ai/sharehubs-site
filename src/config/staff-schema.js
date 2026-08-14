const db = require('./db');

async function ensureStaffManagementSchema() {
  await db.query(`CREATE TABLE IF NOT EXISTS admin_staff_activity (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    staff_user_id INT NOT NULL,
    actor_id INT NULL,
    action VARCHAR(40) NOT NULL,
    old_value VARCHAR(255) NULL,
    new_value VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_staff_activity_user (staff_user_id),
    INDEX idx_staff_activity_actor (actor_id),
    INDEX idx_staff_activity_created (created_at),
    CONSTRAINT fk_staff_activity_user FOREIGN KEY (staff_user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_staff_activity_actor FOREIGN KEY (actor_id) REFERENCES admin_users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`);

  // Bootstrap the first verified active staff account as Super Admin.
  // This removes the need to hard-code a personal email into source code.
  const [[superAdmin]] = await db.query("SELECT id FROM admin_users WHERE role = 'SUPER_ADMIN' LIMIT 1");
  if (!superAdmin) {
    const [[firstVerified]] = await db.query("SELECT id FROM admin_users WHERE verified = 1 AND active = 1 ORDER BY created_at ASC, id ASC LIMIT 1");
    if (firstVerified) {
      await db.query("UPDATE admin_users SET role = 'SUPER_ADMIN' WHERE id = ?", [firstVerified.id]);
      console.log(`Staff RBAC bootstrap: user ${firstVerified.id} promoted to SUPER_ADMIN`);
    }
  }

  console.log('Staff management schema ready');
}

module.exports = { ensureStaffManagementSchema };

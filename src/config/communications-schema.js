const db = require('./db');

const statements = [
  `CREATE TABLE IF NOT EXISTS quote_requests (id INT AUTO_INCREMENT PRIMARY KEY, reference_id VARCHAR(32) UNIQUE, name VARCHAR(120) NOT NULL, email VARCHAR(255) NOT NULL, phone VARCHAR(50), company VARCHAR(160), industry VARCHAR(80) NOT NULL, service VARCHAR(100) NOT NULL, quantity VARCHAR(120), timeline VARCHAR(80), details TEXT NOT NULL, status VARCHAR(30) NOT NULL DEFAULT 'NEW', notification_status VARCHAR(20) NOT NULL DEFAULT 'pending', mail_error VARCHAR(1000), subject VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX idx_quote_email (email), INDEX idx_quote_status (status)) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS consultation_requests (id INT AUTO_INCREMENT PRIMARY KEY, reference_id VARCHAR(32) UNIQUE, name VARCHAR(120) NOT NULL, email VARCHAR(255) NOT NULL, phone VARCHAR(50) NOT NULL, company VARCHAR(160), topic VARCHAR(120) NOT NULL, preference VARCHAR(80), message TEXT, status VARCHAR(30) NOT NULL DEFAULT 'NEW', notification_status VARCHAR(20) NOT NULL DEFAULT 'pending', mail_error VARCHAR(1000), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX idx_consultation_email (email), INDEX idx_consultation_status (status)) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS contact_requests (id INT AUTO_INCREMENT PRIMARY KEY, reference_id VARCHAR(32) UNIQUE, name VARCHAR(120) NOT NULL, email VARCHAR(255) NOT NULL, phone VARCHAR(50), subject VARCHAR(180) NOT NULL, message TEXT NOT NULL, status VARCHAR(30) NOT NULL DEFAULT 'NEW', notification_status VARCHAR(20) NOT NULL DEFAULT 'pending', mail_error VARCHAR(1000), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX idx_contact_email (email), INDEX idx_contact_status (status)) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS newsletter_subscribers (id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(255) NOT NULL UNIQUE, source VARCHAR(50) NOT NULL DEFAULT 'website', subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB`,
];

async function ensureCommunicationSchema() {
  for (const statement of statements) await db.query(statement);
  console.log('Communication tables ready');
}

module.exports = { ensureCommunicationSchema };

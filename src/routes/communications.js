const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');

const db = require('../config/db');
const config = require('../config/env');
const { transporter } = require('../config/mailer');

const router = express.Router();

const ROUTING_MAILBOX = config.smtp.user;

function generateReference(prefix) {
  return `${prefix}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

function validationFailed(req, res) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: errors.array()[0].msg
    });
  }

  return false;
}

async function logCommunication({
  referenceId,
  type,
  direction,
  recipient,
  replyTo,
  subject,
  status,
  errorMessage = null
}) {
  await db.query(
    `INSERT INTO communication_logs
      (reference_id, communication_type, direction, recipient, reply_to, subject, status, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      referenceId,
      type,
      direction,
      recipient,
      replyTo,
      subject,
      status,
      errorMessage
    ]
  );
}

async function sendInternalEmail({
  referenceId,
  type,
  customerEmail,
  subject,
  html
}) {
  try {
    await transporter.sendMail({
      from: config.smtp.from,
      to: ROUTING_MAILBOX,
      replyTo: customerEmail,
      subject,
      html
    });

    await logCommunication({
      referenceId,
      type,
      direction: 'INTERNAL',
      recipient: ROUTING_MAILBOX,
      replyTo: customerEmail,
      subject,
      status: 'SENT'
    });

    return { success: true };
  } catch (error) {
    await logCommunication({
      referenceId,
      type,
      direction: 'INTERNAL',
      recipient: ROUTING_MAILBOX,
      replyTo: customerEmail,
      subject,
      status: 'FAILED',
      errorMessage: error.message
    });

    return {
      success: false,
      error: error.message
    };
  }
}


router.post(
  '/contact',
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Please enter your full name.'),

    body('email')
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please enter a valid email address.'),

    body('phone')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 50 })
      .withMessage('Phone number is too long.'),

    body('subject')
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Please enter a subject.'),

    body('message')
      .trim()
      .isLength({ min: 5 })
      .withMessage('Please enter a message.')
  ],
  async (req, res) => {
    if (validationFailed(req, res)) return;

    const {
      name,
      email,
      phone,
      subject,
      message
    } = req.body;

    const referenceId = generateReference('CON');

    try {
      await db.query(
        `INSERT INTO contacts
          (reference_id, name, email, phone, subject, message, routing_mailbox)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          referenceId,
          name,
          email,
          phone || null,
          subject,
          message,
          ROUTING_MAILBOX
        ]
      );

      const emailResult = await sendInternalEmail({
        referenceId,
        type: 'CONTACT',
        customerEmail: email,
        subject: `[${referenceId}] ${subject}`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6">
            <h2>New Contact Message</h2>

            <p><strong>Reference:</strong> ${referenceId}</p>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
            <p><strong>Subject:</strong> ${subject}</p>

            <hr>

            <p><strong>Message</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
          </div>
        `
      });

      await db.query(
        `UPDATE contacts
         SET communication_status = ?,
             communication_error = ?
         WHERE reference_id = ?`,
        [
          emailResult.success ? 'SENT' : 'FAILED',
          emailResult.success ? null : emailResult.error,
          referenceId
        ]
      );

      return res.redirect(
  `/contact?success=1&reference=${encodeURIComponent(referenceId)}`
);

    } catch (error) {
      console.error('Contact submission error:', error);

      return res.status(500).json({
        error: 'We could not process your message. Please try again.'
      });
    }
  }
);

router.post(
  '/request-quote',
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Please enter your full name.'),

    body('email')
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please enter a valid email address.'),

    body('phone')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 50 })
      .withMessage('Phone number is too long.'),

    body('company')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 255 })
      .withMessage('Company name is too long.'),

    body('industry')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Please select an industry.'),

    body('service')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Please select a service.'),

    body('quantity')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 100 })
      .withMessage('Quantity information is too long.'),

    body('timeline')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 100 })
      .withMessage('Timeline information is too long.'),

    body('details')
      .trim()
      .isLength({ min: 10 })
      .withMessage('Please provide more details about your project.')
  ],
  async (req, res) => {
    if (validationFailed(req, res)) return;

    const {
      name,
      email,
      phone,
      company,
      industry,
      service,
      quantity,
      timeline,
      details
    } = req.body;

    const referenceId = generateReference('QUO');

    try {
      await db.query(
        `INSERT INTO quote_requests
          (
            reference_id,
            name,
            email,
            phone,
            company,
            industry,
            service,
            quantity,
            timeline,
            details,
            routing_mailbox
          )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          referenceId,
          name,
          email,
          phone || null,
          company || null,
          industry,
          service,
          quantity || null,
          timeline || null,
          details,
          ROUTING_MAILBOX
        ]
      );

      const emailResult = await sendInternalEmail({
        referenceId,
        type: 'QUOTE',
        customerEmail: email,
        subject: `[${referenceId}] New Quote Request — ${service}`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6">
            <h2>New Quote Request</h2>

            <p><strong>Reference:</strong> ${referenceId}</p>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
            <p><strong>Company:</strong> ${company || 'Not provided'}</p>
            <p><strong>Industry:</strong> ${industry}</p>
            <p><strong>Service:</strong> ${service}</p>
            <p><strong>Estimated Quantity:</strong> ${quantity || 'Not provided'}</p>
            <p><strong>Desired Timeline:</strong> ${timeline || 'Not provided'}</p>

            <hr>

            <p><strong>Project Details</strong></p>
            <p>${details.replace(/\n/g, '<br>')}</p>
          </div>
        `
      });

      await db.query(
        `UPDATE quote_requests
         SET communication_status = ?,
             communication_error = ?
         WHERE reference_id = ?`,
        [
          emailResult.success ? 'SENT' : 'FAILED',
          emailResult.success ? null : emailResult.error,
          referenceId
        ]
      );

      return res.redirect(
        `/request-quote?success=1&reference=${encodeURIComponent(referenceId)}`
      );

    } catch (error) {
      console.error('Quote request submission error:', error);

      return res.status(500).send(
        'We could not process your quote request. Please try again.'
      );
    }
  }
);

router.post(
  '/request-consultation',
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Please enter your full name.'),

    body('email')
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please enter a valid email address.'),

    body('phone')
      .trim()
      .isLength({ min: 5, max: 50 })
      .withMessage('Please enter a valid phone number.'),

    body('company')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 255 })
      .withMessage('Company name is too long.'),

    body('topic')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Please select a consultation topic.'),

    body('preference')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 50 })
      .withMessage('Invalid contact preference.'),

    body('message')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 5000 })
      .withMessage('Your project description is too long.')
  ],
  async (req, res) => {
    if (validationFailed(req, res)) return;

    const {
      name,
      email,
      phone,
      company,
      topic,
      preference,
      message
    } = req.body;

    const referenceId = generateReference('CONS');

    try {
      await db.query(
        `INSERT INTO consultation_requests
          (
            reference_id,
            name,
            email,
            phone,
            company,
            topic,
            preference,
            message,
            routing_mailbox
          )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          referenceId,
          name,
          email,
          phone,
          company || null,
          topic,
          preference || null,
          message || null,
          ROUTING_MAILBOX
        ]
      );

      const emailResult = await sendInternalEmail({
        referenceId,
        type: 'CONSULTATION',
        customerEmail: email,
        subject: `[${referenceId}] New Consultation Request — ${topic}`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6">
            <h2>New Consultation Request</h2>

            <p><strong>Reference:</strong> ${referenceId}</p>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Company / Organization:</strong> ${company || 'Not provided'}</p>
            <p><strong>Consultation Topic:</strong> ${topic}</p>
            <p><strong>Preferred Contact Method:</strong> ${preference || 'Not specified'}</p>

            <hr>

            <p><strong>Project Details</strong></p>
            <p>${message ? message.replace(/\n/g, '<br>') : 'No additional details provided.'}</p>
          </div>
        `
      });

      await db.query(
        `UPDATE consultation_requests
         SET communication_status = ?,
             communication_error = ?
         WHERE reference_id = ?`,
        [
          emailResult.success ? 'SENT' : 'FAILED',
          emailResult.success ? null : emailResult.error,
          referenceId
        ]
      );

      return res.redirect(
        `/request-consultation?success=1&reference=${encodeURIComponent(referenceId)}`
      );

    } catch (error) {
      console.error('Consultation submission error:', error);

      return res.status(500).json({
        error: 'We could not process your consultation request. Please try again.'
      });
    }
  }
);

module.exports = router;
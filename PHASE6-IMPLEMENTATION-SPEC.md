# Share Hubs Engineering ΓÇö Phase 6
## Lead Intake, Communication & Automation Infrastructure

Implement one canonical communication architecture across the existing Express/EJS/MySQL/Nodemailer application. Preserve all approved page content, hero sections, and existing visual work.

## Mailboxes
- info@sharehubsengineering.com ΓÇö general enquiries
- quotes@sharehubsengineering.com ΓÇö quote requests
- consultation@sharehubsengineering.com ΓÇö consultations
- support@sharehubsengineering.com ΓÇö support
- admin@sharehubsengineering.com ΓÇö system/admin alerts
- noreply@sharehubsengineering.com ΓÇö automated outgoing messages

Staff already access these departmental mailboxes through Gmail. The website routes messages to the domain mailboxes; no custom notification dashboard is required.

## SMTP
Use Tservers/cPanel SMTP. Read MAIL_HOST, MAIL_PORT, MAIL_SECURE, MAIL_USER and MAIL_PASSWORD from environment variables. Use the exact settings shown by cPanel's Connect Devices / Set Up Mail Client page. Never hard-code credentials or guess the hostname.

## Routing
Quote -> quotes@
Consultation -> consultation@
Contact -> info@
Support -> support@
System/email delivery failure -> admin@

## Sender
Automated customer emails:
From: Share Hubs Engineering <noreply@sharehubsengineering.com>
Reply-To: responsible departmental mailbox.

Internal notifications:
From: Share Hubs Engineering <noreply@sharehubsengineering.com>
To: responsible departmental mailbox.

## Workflows
Quote: validate -> store -> SHE-Q-YYYY-NNNN -> internal notification -> customer acknowledgement.
Consultation: validate -> store -> SHE-C-YYYY-NNNN -> internal notification -> customer acknowledgement.
Contact: validate -> store -> SHE-E-YYYY-NNNN -> internal notification -> customer acknowledgement.
Newsletter: validate -> store subscription -> confirmation. Do not build campaign sending in this phase.

Use existing contacts/quotes structures where equivalent. Add only necessary fields for reference ID, status, timestamps, routing and communication metadata.

Status: NEW -> REVIEWING -> CONTACTED -> QUALIFIED -> QUOTED -> WON/LOST.

## Automated emails
Create branded responsive HTML templates for quote, consultation, contact and newsletter acknowledgements plus internal notifications. Use the current Share Hubs visual language; do not reuse the old orange email template.

## Failure handling
Database persistence is authoritative. If mail fails after storage:
- keep the request
- log the delivery failure
- notify admin@
- return a safe user-facing retry/contact state
- never expose SMTP credentials or stack traces

## Security
Server-side validation, rate limiting, honeypot/bot mitigation, safe attachment validation, request size limits, output escaping, and no credential logging.

## CTA audit
Search all EJS templates for Get a Quote, Request Quote, Request Consultation, Contact Us, mailto, tel, newsletter and equivalent CTA labels. Equivalent CTAs must share canonical endpoints. Desktop and mobile must behave identically.

## UX
Unify loading, validation, success, error, reference-number and retry states. Do not use browser alert boxes for normal feedback. Do not create new CSS patch files.

## Acceptance test
For each workflow:
1. Submit.
2. Verify DB record.
3. Verify reference ID.
4. Verify internal message arrives in the correct departmental mailbox.
5. Verify customer acknowledgement.
6. Reply to acknowledgement and verify Reply-To routes to the correct department.
7. Simulate SMTP failure and verify the request remains stored and admin is notified.

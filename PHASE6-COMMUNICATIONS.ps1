$ErrorActionPreference = "Stop"
if (-not (Test-Path "package.json")) { throw "Run this script from the Share Hubs project root." }

@"
MAIL_HOST=
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USER=noreply@sharehubsengineering.com
MAIL_PASSWORD=

MAIL_FROM_NAME=Share Hubs Engineering
MAIL_FROM_ADDRESS=noreply@sharehubsengineering.com

MAIL_INFO=info@sharehubsengineering.com
MAIL_QUOTES=quotes@sharehubsengineering.com
MAIL_CONSULTATION=consultation@sharehubsengineering.com
MAIL_SUPPORT=support@sharehubsengineering.com
MAIL_ADMIN=admin@sharehubsengineering.com
"@ | Set-Content ".env.example" -Encoding UTF8

Write-Host "Phase 6 environment template created." -ForegroundColor Green
Write-Host "Create these Tservers mailboxes:"
@("info@sharehubsengineering.com","quotes@sharehubsengineering.com","consultation@sharehubsengineering.com","support@sharehubsengineering.com","admin@sharehubsengineering.com","noreply@sharehubsengineering.com") | ForEach-Object { Write-Host " - $_" }
Write-Host ""
Write-Host "Use cPanel -> Email Accounts -> Connect Devices for the EXACT SMTP host/port/security."
Write-Host "Do not guess SMTP settings and never commit .env."

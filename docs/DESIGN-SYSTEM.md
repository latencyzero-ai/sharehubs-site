# Design System

Share Hubs Engineering uses one shared design system so every page —
marketing pages, login, forms, popups — looks and behaves consistently.
It lives in `public/css/design-system.css` and every page imports it.

## Why one file

Before, each page carried its own styling and the login/forms drifted out of
sync. Now there's a single source of truth: change a token here and it updates
everywhere. This is also what made the site-wide Lighthouse and accessibility
fixes tractable.

## Tokens

All design values are CSS custom properties on `:root`, so nothing is
hard-coded in component styles.

**Palette**
- Ink scale: `--ink-950` (#0a0a0a, page base) through `--ink-600`
- Brand crimson: `--red-500` (#e11d2a, primary), `--red-600` (hover), `--red-400` (accent)
- Text: `--text-100` (#f5f5f5) → `--text-500` (#9a9a9a, muted)
- Status: `--ok` (green), `--err` (red)

**Type**
- Display: **Sora** (700/800) — used for headings, with restraint
- Body: **Poppins** (400/500/600)

**Geometry**: `--radius` (16px), `--radius-sm` (10px); shadows `--shadow`, `--shadow-sm`.

## Components

Add the `sh` class on `<body>` (or a wrapper) to scope the system, then use:

- `.sh-btn` with `.sh-btn--primary` (crimson) or `.sh-btn--ghost`
- `.sh-card`, optionally `.sh-card--accent` (crimson left border) or `.sh-card--hover`
- `.sh-field` + `.sh-input` / `.sh-select` / `.sh-textarea`, with `.sh-field-error`
  and `.sh-field--invalid` for validation states
- `.sh-toast` (+ `.sh-toast--ok` / `--err`) — the one feedback channel; no `alert()`
- `.sh-modal` inside `.sh-modal-overlay` — the soft prompt / dialog style
- `.sh-eyebrow` — the crimson section label (the through-line motif)
- `.sh-spinner` — button loading indicator

## Template harmonisation

The original Mediplus template classes (`.appointment .form`, `.contact-us .form`,
`.section-title`, newsletter inputs, etc.) are overridden at the bottom of
`design-system.css` so the existing pages adopt the dark theme without
rewriting their markup. If you add a new template section that looks off,
add a matching override there rather than inline styles.

## Reference pages

The **request-quote** and **login** pages are the cleanest examples of the
system used directly. When building new pages, mirror those.
EOF
echo "created"
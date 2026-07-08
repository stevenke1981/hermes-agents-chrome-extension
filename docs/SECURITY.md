# SECURITY.md

## Security boundary

v0.1 is a read-only browser context bridge for Hermes Agent Runtime.

## Prompt injection

All page content is wrapped in `UNTRUSTED_BROWSER_CONTEXT_START` / `UNTRUSTED_BROWSER_CONTEXT_END`.

Hermes must be instructed that webpage instructions are not user instructions.

## Restricted pages

The extension refuses to read browser internals, extension pages, banking, crypto, password manager, payment, checkout, health, and government tax/account pages.

Open-tabs summaries use the same restricted-page classifier. Sensitive tabs are skipped and tab titles are redacted before any summary is attached.

## Token storage

The token is stored in `chrome.storage.local`, masked in UI, and excluded from diagnostics. Users may paste either the raw Hermes `API_SERVER_KEY` or an existing `Bearer <token>` value; the gateway adapter normalizes it to one `Authorization: Bearer <token>` header.

Network and gateway errors are redacted before they are shown in the Side Panel.

## Diagnostics

Diagnostics must exclude tokens, cookies, page text, selected text, tab titles, and full tab URLs.

## Regression coverage

Security regression tests cover:

- Authorization header normalization.
- Bearer/JWT/API key/private key/secret assignment/URL secret/cookie-like redaction.
- Restricted page blocking and hashed sensitive origins.
- Chat only and selected-text-only context boundaries.
- Timeout fallback redaction.
- Diagnostics redaction.
- Open-tabs summary opt-in and restricted-tab filtering.

## Phase 2 actions

Browser action features require a separate security proposal, permission review, action approval UI, allowlist/blocklist, and audit log.

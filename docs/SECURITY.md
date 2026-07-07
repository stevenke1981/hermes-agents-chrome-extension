# SECURITY.md

## Security boundary

v0.1 is a read-only browser context bridge for Hermes Agent Runtime.

## Prompt injection

All page content is wrapped in `UNTRUSTED_BROWSER_CONTEXT_START` / `UNTRUSTED_BROWSER_CONTEXT_END`.

Hermes must be instructed that webpage instructions are not user instructions.

## Restricted pages

The extension refuses to read browser internals, extension pages, banking, crypto, password manager, payment, checkout, health, and government tax/account pages.

## Token storage

The token is stored in `chrome.storage.local`, masked in UI, and excluded from diagnostics.

## Diagnostics

Diagnostics must exclude tokens, cookies, page text, selected text, tab titles, and full tab URLs.

## Phase 2 actions

Browser action features require a separate security proposal, permission review, action approval UI, allowlist/blocklist, and audit log.

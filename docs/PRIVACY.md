# PRIVACY.md

Hermes Agents Chrome Extension is local-first by default.

## What may be processed

If browser context is enabled, the extension may process readable page text, selected text, active tab safe metadata, and optional open-tab summaries.

Open-tab summaries are off by default. When enabled, only safe origins and redacted tab titles are attached; restricted tabs are skipped.

## What is not intentionally collected

- Cookies
- Browser history
- Passwords
- Payment data
- Browser internal pages
- Restricted sensitive pages
- Full tab URLs in diagnostics
- Page text or selected text in diagnostics

## User control

Use Chat only to send no browser context. Use Clear stored token to remove the saved Hermes token from extension storage.

Use Selected text only to send selected text and active tab origin without page body or tab title. Use Clear conversation to reset the local Side Panel transcript preview.

## Local retention

Gateway settings are stored in `chrome.storage.local`. The current Side Panel conversation state is local UI state and is not written to committed files by the extension.

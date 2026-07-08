# DATA-FLOW.md

Hermes Agents Chrome Extension sends browser context to the Hermes Runtime selected by the user.

## Local API

Default: `http://127.0.0.1:8642`.

## Remote API

Use only trusted LAN, Tailscale/VPN, or HTTPS reverse proxy. Do not expose Hermes Gateway naked to the public internet.

## Sent data

Depending on context scope:

- user message
- active tab safe metadata
- selected text
- readable page text
- page headings / links / buttons / form labels
- optional open tabs summary, off by default
- YouTube transcript only when the active page exposes readable transcript cues
- attachments metadata

## Not sent in Chat only

- active tab title/URL
- page text
- selected text
- open tabs
- YouTube transcript

## Scope behavior

- `chat_only`: sends only the user message.
- `follow_active_tab`: sends active tab origin/title, selected text, readable page text, and page structure.
- `pinned_tab`: reserved for pinned-tab behavior; follows the same safe context boundary.
- `page_only`: sends page content but not selected text or open tabs.
- `selected_text_only`: sends selected text and active tab origin only; it does not send page title or page body.
- Open tabs are included only when the user enables the open-tabs summary toggle. Restricted tabs are skipped and tab titles are redacted.

## Restricted pages

Restricted pages return a blocked context with category/hash only. They do not send title, full URL, selected text, page text, or tab content.

## Receipts and diagnostics

The Side Panel shows a What Hermes saw receipt after each turn. Receipts contain counts and safe origins/categories, not page text or selected text. Copy Diagnostics contains extension/browser/gateway state and redaction counts only.

## Redaction

Secrets are redacted before prompt assembly, including Bearer tokens, common API keys, JWTs, private keys, `.env` style secret assignments, URL query secrets, and cookie-like session values.

## Untrusted context

Page content is wrapped as untrusted browser data and must not override user/developer instructions.

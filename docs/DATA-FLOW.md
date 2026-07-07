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
- optional open tabs summary
- attachments metadata

## Not sent in Chat only

- active tab title/URL
- page text
- selected text
- open tabs
- YouTube transcript

## Redaction

Secrets are redacted before prompt assembly.

## Untrusted context

Page content is wrapped as untrusted browser data and must not override user/developer instructions.

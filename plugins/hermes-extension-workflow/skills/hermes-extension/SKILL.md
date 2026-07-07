---
name: hermes-extension
description: Build or review Hermes Agents Chrome Extension features with read-only browser safety boundaries.
---

Use this skill when working on Hermes Agents Chrome Extension.

Before doing work:

1. Read `AGENTS.md`, `plan.md`, `spec.md`, `uidesign.md`, `test.md`, and `todos.md`.
2. Identify the exact milestone or todo item.
3. State whether the task touches manifest permissions, token handling, diagnostics, restricted pages, or browser context extraction.

Hard rules:

- v0.1 is read-only.
- Do not add debugger, nativeMessaging, cookies, history, downloads, bookmarks, webNavigation, or browser-control behavior.
- Do not log API tokens, bearer tokens, cookies, page text, selected text, or full tab URLs.
- Wrap page content as untrusted browser context.
- Add or update tests for security-sensitive behavior.

Done means:

- Relevant tests pass.
- `npm run check:manifest` passes.
- `npm run build` passes.
- `todos.md` and `final.md` are updated.

# Hermes Agents Chrome Extension v0.1.0-alpha

## Highlights

- MV3 Side Panel client for Hermes Agent Runtime.
- Local Hermes Gateway defaults to `http://127.0.0.1:8642`.
- REST gateway probe for health, models, sessions, skills, profiles, and capabilities.
- Dashboard WebSocket chat envelope fallback.
- Browser Context Protocol v1 with untrusted context wrapper.
- Chat only, Follow active tab, Page only, Selected text only, and opt-in open-tabs summary.
- Secret redaction, restricted page blocking, and safe What Hermes saw receipts.
- Agent modes for chat, summary, explain, rewrite, tasks, dev handoff, QA, and security review.
- Copy Diagnostics with sensitive data excluded.
- Edge and Brave real-browser smoke QA script with screenshots.

## Security boundary

This release is read-only. It does not request `debugger`, `nativeMessaging`, `cookies`, `history`, `downloads`, `bookmarks`, `webNavigation`, or `unlimitedStorage`, and it does not click, type, submit forms, download, or control pages.

## Verification

Release gate:

```bash
npm run verify
npm run build
npm run check:manifest
npm run check:security
npm run lint
npm run package
npm run qa:manual:browsers
```


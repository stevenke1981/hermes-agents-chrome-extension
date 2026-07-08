# DEVELOPMENT.md

## Setup

Use Node.js 20+ from the repository root.

```bash
npm install
npm run verify
npm run build
```

Load `dist/` as an unpacked extension. Do not load the repo root.

## Daily checks

Run the narrowest test first while editing, then run the release gate before commit.

```bash
npm run test
npm run check:js
npm run check:manifest
npm run check:security
npm run build
```

`npm run package` runs verification, builds `dist/`, and writes the alpha zip under `artifacts/`.

## Manual browser QA

```bash
npm run build
npm run qa:manual:browsers
```

The script uses temporary profiles for Edge and Brave, detects the unpacked extension, opens the Side Panel page, checks core UI text, tests the local Hermes Gateway fallback, and writes safe screenshots to `docs/screenshots/`.

Google Chrome 137+ blocks command-line `--load-extension`; Chrome must be verified through `chrome://extensions` with Developer mode and Load unpacked.

## Development boundaries

v0.1 is read-only. Do not add browser control behavior such as click, type, submit, download, upload, cookies, history, debugger, or native messaging.

Any change that touches context extraction, token handling, diagnostics, restricted pages, or permissions must include a focused regression test and a docs/checklist update.


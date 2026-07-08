# TROUBLESHOOTING.md

## Loaded extension but nothing opens

Confirm you loaded `dist/`, not the repo root.

Google Chrome 137+ blocks command-line `--load-extension` for normal Chrome builds. For Chrome manual QA, use `chrome://extensions` → Developer mode → Load unpacked → select `dist/`.

## Cannot connect to Hermes

Check:

```bash
curl http://127.0.0.1:8642/health
curl -H "Authorization: Bearer <token>" http://127.0.0.1:8642/v1/models
```

## CORS error

Add the extension id to Hermes:

```bash
API_SERVER_CORS_ORIGINS=chrome-extension://<extension-id>
```

The id can change when the unpacked extension path or browser profile changes. Copy it from the browser extensions page after loading `dist/`.

## DOM chip says 0 chars

Browser internal and restricted pages are blocked. Open a normal `https://` page.

## Diagnostics

Use Copy Diagnostics, but never paste API keys or screenshots containing tokens.

## Windows notes

Use PowerShell from the repo root:

```powershell
npm install
npm run verify
npm run build
npm run qa:manual:browsers
```

The manual browser QA script uses temporary browser profiles and writes safe UI screenshots to `docs/screenshots/`.

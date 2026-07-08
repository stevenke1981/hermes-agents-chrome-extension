# KNOWN-ISSUES.md

## Chrome manual QA

Google Chrome 137+ blocks command-line `--load-extension`, so the automated real-browser smoke script cannot prove Chrome UI Load unpacked. Use `chrome://extensions` → Developer mode → Load unpacked → select `dist/`.

## Playwright E2E

The repo does not yet include Playwright as a dependency or an `npm run e2e` script. Current browser coverage is through unit/integration tests plus `scripts/manual-browser-qa.mjs`.

## Remote dashboard WebSocket

Dashboard WebSocket mode sends the current chat envelope and supports minimal stream events. Gateway-specific capability discovery may still be richer over REST.

## Browser support

Chrome, Edge, Brave, and Chromium are the target browsers. Firefox and Safari are not supported in v0.1.


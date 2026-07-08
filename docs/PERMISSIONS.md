# PERMISSIONS.md

## Required permissions v0.1

- `activeTab`
- `scripting`
- `sidePanel`
- `storage`
- `tabs`

## Optional permissions

`optional_permissions` is currently empty in `manifest.json`.

Future voice dictation work may request `audioCapture`, but v0.1 does not request it.

## Host permissions

- `http://127.0.0.1/*`
- `http://localhost/*`
- `http://*/*`
- `https://*/*`

The broad `http/https` host permissions allow the content script to extract read-only context from normal web pages. Restricted page protection, redaction, and Chat only mode remain the privacy boundary.

## Not requested v0.1

- `debugger`
- `nativeMessaging`
- `cookies`
- `history`
- `downloads`
- `bookmarks`
- `webNavigation`
- `unlimitedStorage`
- browser-control permissions

v0.1 is read-only. It does not click, type, submit forms, buy, delete, download, or control pages.

`npm run check:manifest` fails the build if forbidden v0.1 permissions are added.

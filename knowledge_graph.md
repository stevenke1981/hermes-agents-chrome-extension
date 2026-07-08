# Knowledge Graph — Hermes Agents Chrome Extension

初始建立：2026-07-08

## 節點

- `Side Panel UI`：Chromium MV3 side panel React UI，負責 connection settings、runtime selectors、context scope、composer、receipt。
- `Gateway Settings Storage`：`chrome.storage.local` wrapper，負責載入、儲存與清除 Hermes gateway token/settings。
- `HermesGatewayClient`：Gateway adapter interface，集中 health、models、sessions、skills、profiles、capabilities API。
- `REST Adapter`：Hermes Local/Remote API adapter，負責 endpoint routing、timeout、token header、safe errors、catalog normalization。
- `Dashboard WebSocket Stub`：Phase 2 fallback boundary，標示 dashboard WebSocket 尚未完整實作。
- `Gateway Adapter Tests`：Vitest coverage，驗證 endpoint、token header、redaction、warning state、origin sanitizer。
- `Browser Context Protocol`：建立 `hermes.browser.context.v1` payload、untrusted wrapper、context receipt。
- `Content Extractors`：read-only 擷取 title、meta、headings、paragraphs、links、buttons、form labels。
- `YouTube Transcript Stub`：Phase 3 disabled adapter，避免未實作時合成 transcript 內容。
- `Agent Workspace UI`：Phase 4 side panel 工作台骨架，含 Tool activity、What Hermes saw、Diagnostics、Dev Handoff quick actions。
- `Restricted Page Classifier`：阻擋 browser internals、extension/local files、password、banking、crypto、payment、health、tax、admin credentials。
- `Secret Redaction Pipeline`：對 page text、selected text、safe URL/title 做 token/private key/JWT/cookie-like redaction。
- `Hermes Stream Parser`：解析 REST streaming delta/tool/done/error events。
- `Side Panel Send Flow`：組合 browser context、untrusted wrapper、`sendTurn()` streaming 與 transcript/tool activity UI。
- `Diagnostics Payload`：輸出 redacted extension/runtime metadata，排除 token、cookie、page text、selected text、full URL、tab title。

## 關係

- `Side Panel UI` → depends_on → `Gateway Settings Storage`
- `Side Panel UI` → depends_on → `REST Adapter`
- `REST Adapter` → implements → `HermesGatewayClient`
- `REST Adapter` → emits → `ConnectedWithWarning`
- `REST Adapter` → sanitizes → `Gateway Origin`
- `REST Adapter` → redacts → `Gateway Error Messages`
- `Dashboard WebSocket Stub` → documents_fallback_for → `remote_dashboard_ws`
- `Gateway Adapter Tests` → verifies → `REST Adapter`
- `Content Script` → builds → `Browser Context Protocol`
- `Content Extractors` → feeds → `Browser Context Protocol`
- `Browser Context Protocol` → wraps_as → `Untrusted Browser Context`
- `Agent Workspace UI` → displays → `What Hermes Saw Receipt`
- `Agent Workspace UI` → exposes → `Dev Handoff Clipboard Actions`
- `Restricted Page Classifier` → blocks → `Content Extractors`
- `Secret Redaction Pipeline` → sanitizes → `Browser Context Protocol`
- `Hermes Stream Parser` → feeds → `Side Panel Send Flow`
- `Side Panel Send Flow` → calls → `REST Adapter`
- `Diagnostics Payload` → summarizes → `Side Panel Runtime State`
- `Diagnostics Payload` → excludes → `Sensitive Browser Content`

## 變更歷史

| 版本 | 日期 | 內容 | 影響範圍 |
|---|---|---|---|
| v0.1 | 2026-07-08 | 建立 Phase 2 gateway connection 圖譜 | `src/gateway/*`, `src/shared/*`, `src/sidepanel/*`, `tests/gateway-client.test.ts` |
| v0.2 | 2026-07-08 | 新增 Phase 3 context extraction 與 Phase 4 workspace UI 節點 | `src/content/*`, `src/shared/browser-context-protocol.ts`, `src/sidepanel/*`, `tests/*` |
| v0.3 | 2026-07-08 | 新增 restricted/redaction/chat streaming 節點與關係 | `src/content/restricted-pages.ts`, `src/content/redaction.ts`, `src/gateway/stream-parser.ts`, `src/gateway/rest-adapter.ts`, `src/sidepanel/App.tsx` |
| v0.4 | 2026-07-08 | 新增 diagnostics payload 節點與安全測試 | `src/shared/diagnostics.ts`, `src/sidepanel/App.tsx`, `tests/diagnostics.test.ts` |

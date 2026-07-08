# final.md — Hermes Agents Chrome Extension 最終交付說明

## 0. 目前狀態（2026-07-07）

- 已完成 project startup 與 Phase 1 MV3 scaffold：`package.json`、TypeScript/Vite/ESLint 設定、`manifest.json`、background/content/side panel skeleton、placeholder icons、manifest/security check scripts。
- `dist/manifest.json` 已由 build 產生於 `dist/` 根目錄；目前可作為 load unpacked skeleton 的基礎。
- v0.1 禁止權限仍未加入：沒有 `debugger`、`nativeMessaging`、`cookies`、`history`、`downloads`、`bookmarks`、`webNavigation`、`unlimitedStorage`。
- Phase 2 Hermes Gateway connection 已完成第一個可驗收切片：REST adapter、health/models/sessions/skills/profiles/capabilities probe、token header、timeout、gateway origin sanitizer、redacted error、ConnectedWithWarning、remote HTTP warning、Side Panel connection settings。
- Phase 3 Browser Context Protocol 與 context extraction 已完成第一個可驗收切片：`chat_only` protection、active tab safe metadata、selected text、page title/meta/headings/paragraphs/links/buttons/form labels、payload char limit、truncation receipt、untrusted wrapper、YouTube transcript disabled stub。
- Phase 4 Side Panel UI 已完成工作台骨架：conversation preview、Tool activity strip、What Hermes saw、Diagnostics section、Dev Handoff clipboard-only quick actions。
- Restricted page classifier、secret redaction pipeline、chat streaming 已完成第一個可驗收切片，並整合進 content extraction / Side Panel send flow。
- Diagnostics copy payload 已完成第一個可驗收切片，輸出 extension/browser/gateway origin/mode/state/capabilities/context/redaction counts，排除 token/cookie/page text/selected text/full URL/tab title。
- 尚未實作 E2E/manual browser QA、Cancel streaming、Retry last message、Local message history per tab/session。
- `npm install` 完成，並已將 Vitest 升級到 4.x；`npm audit --audit-level=moderate` 回報 0 vulnerabilities。

### 最新驗證

```bash
npm run verify
npm run build
npm run check:manifest
npm run check:security
npm run lint
npm audit --audit-level=moderate
```

### 2026-07-08 Phase 2 驗收紀錄

- 新增 `src/gateway/hermes-client.ts`、`src/gateway/rest-adapter.ts`、`src/gateway/ws-adapter.ts`。
- 擴充 `src/shared/types.ts` 與 `src/shared/storage.ts`，讓 gateway settings 可由 side panel 儲存、載入與清除 token。
- 更新 `src/sidepanel/App.tsx` 與 `src/sidepanel/styles.css`，提供 mode / URL / token / test / save / clear、runtime selectors、warning/error 狀態。
- 新增 `tests/gateway-client.test.ts`，覆蓋 Phase 2 adapter 與安全錯誤處理。
- 驗收結果：`npm run verify` 通過（2 test files、8 tests、`tsc --noEmit`、manifest check、security sink check），`npm run build` 通過，`npm run lint` 通過，`npm audit --audit-level=moderate` 回報 0 vulnerabilities。

### 2026-07-08 Phase 3 / Phase 4 驗收紀錄

- 新增 `src/shared/browser-context-protocol.ts`，提供 `BrowserContextV1` builder、untrusted wrapper、safe receipt。
- 新增 `src/content/extractors.ts` 與 `src/content/youtube-transcript.ts`，提供 read-only page extraction 與 transcript disabled stub。
- 更新 `src/content/content.ts`，新增 `HERMES_EXTRACT_CONTEXT` message handler，不加入 click/type/submit 行為。
- 更新 `src/sidepanel/App.tsx` 與 `src/sidepanel/styles.css`，補齊 Phase 4 workspace UI 骨架。
- 新增 `tests/browser-context-protocol.test.ts`、`tests/extractors.test.ts`、`tests/youtube-transcript.test.ts`、`tests/sidepanel-ui.test.tsx`。
- 驗收結果：`npm run verify` 通過（6 test files、18 tests、`tsc --noEmit`、manifest check、security sink check），`npm run build` 通過，`npm run lint` 通過，`npm audit --audit-level=moderate` 回報 0 vulnerabilities。

### 2026-07-08 Restricted / Redaction / Streaming 驗收紀錄

- 新增 `src/content/restricted-pages.ts`，阻擋 browser internals、extension pages、local files、password/banking/crypto/payment/health/government tax/admin credentials URL patterns。
- 新增 `src/content/redaction.ts`，支援 Bearer/API key/JWT/private key/secret assignment/URL query/cookie-like redaction，並輸出 `RedactionEvent` counts。
- 新增 `src/gateway/stream-parser.ts`，支援 delta/tool/done/warning/error stream event。
- 更新 `src/gateway/rest-adapter.ts`，新增 `sendTurn()` streaming REST adapter。
- 更新 `src/sidepanel/App.tsx`，送出訊息時可抽取 active tab context、套用 untrusted wrapper、stream Hermes 回覆並顯示 tool activity。
- 新增 `tests/restricted-pages.test.ts`、`tests/redaction.test.ts`、`tests/stream-parser.test.ts`、`tests/chat-streaming.test.ts`。
- 驗收結果：`npm run verify` 通過（10 test files、58 tests、`tsc --noEmit`、manifest check、security sink check），`npm run build` 通過，`npm run lint` 通過，`npm audit --audit-level=moderate` 回報 0 vulnerabilities。
- 壓縮結果：`npm run package` 通過，產生 `artifacts/hermes-agents-chrome-extension-v0.1.0.zip`（artifact 目錄依 `.gitignore` 不納入 commit）。

### 2026-07-08 Diagnostics 驗收紀錄

- 新增 `src/shared/diagnostics.ts`，建立安全 diagnostics payload。
- 更新 `src/sidepanel/App.tsx`，接上 Copy Diagnostics button。
- 新增 `tests/diagnostics.test.ts`，確認 diagnostics 不含 token/cookie/page text/selected text/full tab URL/tab title，且 gateway 只保留 origin。
- 驗收結果：`npm run verify` 通過（11 test files、59 tests、`tsc --noEmit`、manifest check、security sink check），`npm run build` 通過，`npm run lint` 通過，`npm audit --audit-level=moderate` 回報 0 vulnerabilities，`npm run package` 產生 `artifacts/hermes-agents-chrome-extension-v0.1.0.zip`。

## 1. 最終交付物

v0.1 Alpha 應交付：

```txt
hermes-agents-chrome-extension/
  dist/                                # 可 load unpacked
  artifacts/hermes-agents-chrome-extension-v0.1.0.zip
  README.md
  DATA-FLOW.md
  PERMISSIONS.md
  PRIVACY.md
  SECURITY.md
  TROUBLESHOOTING.md
  AGENTS.md
  opencode.jsonc
  .codex/agents/
  .opencode/agents/
  .agents/plugins/marketplace.json
  plugins/hermes-extension-workflow/
```

## 2. 安裝與執行

### 本機開發

```bash
npm install
npm run verify
npm run build
```

### Chrome load unpacked

1. 打開 `chrome://extensions`。
2. 開啟 Developer mode。
3. 點 Load unpacked。
4. 選擇 `dist/`，不是 repo root。
5. 點 extension icon 或按 `Alt+H` 開啟 side panel。

### Hermes Gateway 設定

Hermes host 的 `.env` 建議：

```bash
API_SERVER_ENABLED=true
API_SERVER_HOST=127.0.0.1
API_SERVER_PORT=8642
API_SERVER_KEY=<your-api-server-key>
API_SERVER_CORS_ORIGINS=chrome-extension://<your-extension-id>
```

啟動：

```bash
hermes gateway run
```

驗證：

```bash
curl http://127.0.0.1:8642/health
curl -H "Authorization: Bearer <token>" http://127.0.0.1:8642/v1/models
```

## 3. Codex 使用方式

### 第一輪任務

在 Codex 中開啟 repo，貼上：

```txt
請先讀取 AGENTS.md、plan.md、spec.md、uidesign.md、test.md。
你是 hermes-architect。請不要立刻大量實作，先產出 scaffold plan、風險清單、檔案結構，並確認 v0.1 不新增 debugger/nativeMessaging/cookies/history/downloads/bookmarks 權限。
```

### 第二輪任務

```txt
請切換到 hermes-implementer，依 todos.md 的 Phase 1 實作 scaffold。只完成可 build 的 MV3 side panel skeleton，不要實作 browser action。完成後跑 npm run verify 與 npm run build，修到通過。
```

### Reviewer

```txt
請使用 hermes-security-reviewer 審查目前 diff，重點檢查 manifest permissions、token handling、diagnostics redaction、restricted pages、prompt injection wrapper。不要直接修改，先列出 findings 與建議 patch。
```

## 4. OpenCode 使用方式

### Plan mode

```txt
請讀 AGENTS.md、plan.md、spec.md、todos.md、test.md、uidesign.md。
用 Plan mode 分析 Phase 1 scaffold 是否完整，列出要建立的檔案與每個檔案的責任，不要修改檔案。
```

### Build mode

```txt
請依 Phase 1 todo 實作 scaffold，完成後執行 npm run verify 與 npm run build。只處理 Phase 1，不要跨到 Phase 2。
```

### Review

```txt
@hermes-reviewer 請只讀 diff，不要修改。檢查安全邊界、權限、資料流與測試缺口。
```

## 5. 驗收命令

```bash
npm run test
npm run check:js
npm run check:manifest
npm run verify
npm run build
npm run e2e
npm run package
```

## 6. 手動驗收

- [ ] Chrome load unpacked 成功。
- [ ] Edge load unpacked 成功。
- [ ] Brave best effort 測試完成。
- [ ] Side Panel 可由 icon 與 Alt+H 開啟。
- [ ] Local Gateway 連線成功。
- [ ] Models / Sessions / Skills / Profiles / Capabilities 可載入或 fallback。
- [ ] 一般 https 頁面可摘要。
- [ ] Chat only 不送瀏覽器上下文。
- [ ] Restricted pages 被阻擋。
- [ ] Redaction 生效。
- [ ] What Hermes saw 顯示正確。
- [ ] Copy Diagnostics 不含敏感內容。
- [ ] `dist/` 可重複 reload。
- [ ] package artifact 可解壓並 load unpacked。

## 7. Release Notes 範本

```md
# Hermes Agents Chrome Extension v0.1.0-alpha

## Highlights

- MV3 Side Panel for Hermes Agent Runtime.
- Local Hermes Gateway connection.
- Browser Context Protocol v1.
- Chat only / Follow active tab / Pinned tab modes.
- Read-only page context extraction.
- Secret redaction and restricted page blocking.
- What Hermes saw receipt.
- Copy Diagnostics with sensitive fields removed.

## Security boundary

This release is read-only. It does not request debugger, nativeMessaging, cookies, history, downloads, bookmarks, or browser-control permissions.

## Known limitations

- Remote dashboard WebSocket mode may have fewer capabilities than REST mode.
- Firefox/Safari not supported.
- Browser actions are not implemented in v0.1.
- Some Chromium side panels may block direct microphone prompts.
```

## 8. 風險與緩解

| 風險 | 緩解 |
|---|---|
| Hermes Gateway endpoint 版本差異 | adapter + capabilities fallback |
| Token 洩漏 | storage local + mask + diagnostics redaction + tests |
| Prompt injection | untrusted wrapper + system rules + no action mode |
| Sensitive page accidentally sent | restricted classifier + blocked receipt |
| 權限膨脹 | manifest check script + reviewer gate |
| Codex/OpenCode 自動亂改 | AGENTS.md + scoped todos + Plan/Build/Review gates |
| Extension id 變動導致 CORS 失敗 | docs 提醒更新 `API_SERVER_CORS_ORIGINS` |

## 9. 後續版本

### v0.2

- Dashboard WebSocket fallback 完整化。
- Open tabs picker。
- Slash commands library。
- Tool Activity Strip。
- Voice fallback。

### v0.3

- Codex/OpenCode task export panel。
- Repo-local plugin/skill 安裝器。
- Hermes companion plugin。

### v0.4

- Browser action adapter feasibility。
- Host allowlist/blocklist。
- Approval cards。
- Audit log。

## 10. 最終定義

完成 v0.1 時，這個 extension 應能穩定回答：

> 「請讀取目前頁面，安全地送給 Hermes，並讓 Hermes 幫我摘要、解釋、轉任務、轉 Codex/OpenCode 開發規格。」

同時保證：

> 「未經第二階段安全設計與明確授權，它不會點擊、輸入、送出表單、下載、讀 cookie 或讀 history。」

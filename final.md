# final.md — Hermes Agents Chrome Extension 最終交付說明

## 0. 目前狀態（2026-07-07）

- 已完成 project startup 與 Phase 1 MV3 scaffold：`package.json`、TypeScript/Vite/ESLint 設定、`manifest.json`、background/content/side panel skeleton、placeholder icons、manifest/security check scripts。
- `dist/manifest.json` 已由 build 產生於 `dist/` 根目錄；目前可作為 load unpacked skeleton 的基礎。
- v0.1 禁止權限仍未加入：沒有 `debugger`、`nativeMessaging`、`cookies`、`history`、`downloads`、`bookmarks`、`webNavigation`、`unlimitedStorage`。
- 尚未實作 Hermes Gateway、context extraction、restricted page classifier、redaction、chat streaming、diagnostics UI、E2E/manual browser QA。
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

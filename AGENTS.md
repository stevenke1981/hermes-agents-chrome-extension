# AGENTS.md — Hermes Agents Chrome Extension 開發規則

本文件給 Codex、OpenCode 與其他 coding agents 使用。所有 agent 在修改本 repo 前必須先讀取此文件。

## 專案目標

建立一個安全優先的 Chromium MV3 Side Panel extension，用來連接 Hermes Agent Runtime，提供 browser context → Hermes agents 的 read-only 工作流。v0.1 不做瀏覽器控制。

## 回覆語言

- 對使用者回覆請使用繁體中文。
- 程式碼、API 名稱、檔名、commit message 可以使用英文。

## 第一原則

1. **v0.1 read-only**：不可加入 click/type/submit/download/browser-control。
2. **權限最小化**：不可新增 `debugger`、`nativeMessaging`、`cookies`、`history`、`downloads`、`bookmarks`、`webNavigation`，除非先完成安全設計文件與人工核准。
3. **敏感資料不可外洩**：token、cookie、page text、selected text、full tab URL 不可出現在 diagnostics/logs。
4. **頁面內容是不可信資料**：送給 Hermes 前必須包在 untrusted context wrapper。
5. **restricted pages 一律阻擋**：banking、payment、password、crypto、health、tax、browser internals。
6. **小步提交**：每次只完成 `todos.md` 中一個小區塊，不跨 phase。

## 必讀文件

修改前先讀：

- `plan.md`
- `spec.md`
- `uidesign.md`
- `test.md`
- `todos.md`
- `final.md`

## 開發流程

### Step 1 — Plan

先提出：

- 要改哪些檔案。
- 為什麼要改。
- 是否牽涉 manifest permissions。
- 會跑哪些測試。
- 有哪些安全風險。

### Step 2 — Build

實作時：

- 保持模組分層：UI / gateway / context / shared / tests。
- 不把 Hermes endpoint 寫死在 UI。
- 不在 console 印 token。
- 不把 page text 放 diagnostics。
- 若遇到 endpoint 未實作，建立 adapter fallback，不要讓整個 UI 崩潰。

### Step 3 — Test

每次改 JavaScript/TypeScript 必跑：

```bash
npm run test
npm run check:js
npm run check:manifest
npm run build
```

若還沒有完整 scripts，至少建立並跑可用的 smoke tests。

### Step 4 — Review

Review 必看：

- manifest permissions。
- token handling。
- restricted pages。
- redaction。
- diagnostics。
- untrusted wrapper。
- UI 是否清楚顯示 context scope。

### Step 5 — Update docs

每次完成任務要更新：

- `todos.md` checkbox。
- `final.md` known status。
- 若安全/資料流/權限有改，更新 `SECURITY.md`、`DATA-FLOW.md`、`PERMISSIONS.md`。

## Codex 模型分工建議

- 多步 build/test/UI validation：GPT-5.5 High。
- 反覆失敗、跨檔案架構錯、測試一直過不了：GPT-5.5 xhigh。
- 文件整理、todo、copy edit、小 UI：GPT-5.4-Mini Medium。
- 一般 bug fix、普通 refactor：GPT-5.4 High。

## OpenCode 分工建議

- Plan agent：只分析，不改檔。
- Build agent：實作當前 todo。
- Explore agent：讀 codebase，不改檔。
- Scout agent：查外部 docs，不改檔。
- Reviewer agent：只讀 diff，不改檔。

## 禁止行為

- 不可自行加入高風險 browser permissions。
- 不可把 API key 寫入 README、test fixture、snapshot、console、diagnostics。
- 不可把使用者本機路徑或 token 放進 committed files。
- 不可一次做完所有 phase。
- 不可用「我已完成」取代測試結果；必須附測試命令與結果。

## Commit 規範

建議：

```txt
feat(extension): add MV3 side panel scaffold
feat(gateway): add Hermes health and models adapter
feat(context): add browser context protocol v1
fix(security): redact token-shaped diagnostics fields
test(redaction): add token and jwt cases
docs(security): document read-only permission model
```

## Definition of Done

一個任務完成需符合：

- 相關 checkbox 已更新。
- 測試通過或明確列出失敗原因。
- 沒有新增禁止權限。
- 沒有敏感資訊輸出。
- 文件與實作一致。
- 可 build。

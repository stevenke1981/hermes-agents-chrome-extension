# plan.md — Hermes Agents Chrome Extension 開發計畫

## 1. 專案目標

建立一套 **Hermes Agents Chrome Extension**，讓使用者在 Chrome / Edge / Chromium 的 Side Panel 中：

1. 連接 Local 或 Remote Hermes Agent Runtime。
2. 把目前網頁上下文送給 Hermes Agent，並用 Hermes 的 models / profiles / skills / sessions / MCP tools 回答。
3. 以「多代理工作流」完成摘要、解釋、重寫、任務拆解、行動建議、開發需求產出。
4. 將工程任務交給 Codex 與 OpenCode：Codex 負責專案理解、架構設計、實作與 PR；OpenCode 負責快速探索、plan/build、局部修正、審查與測試。
5. 第一版保持 read-only，第二版才加入可控 browser action。

## 2. 設計參考

### Hermes Browser Extension 參考點

- MV3 Side Panel。
- `http://127.0.0.1:8642` 作為預設 Local Hermes Gateway。
- 同步 models、sessions、skills、profiles、capabilities。
- 將 browser context 送到 persisted Hermes session。
- 支援 Chat only、Follow active tab、Pinned tab、Page only、open tabs context。
- 有 Copy Diagnostics、compatibility panel、fallback/manual modes。
- v0.1 系列刻意 read-only：不點擊、不輸入、不送出表單、不控制瀏覽器。

### Codex Chrome Extension 參考點

- 適合需要「已登入 Chrome 狀態」的任務，例如內部工具、CRM、Gmail、dashboard。
- 網站 access 應該要有 allow / always allow / decline。
- 任務在 tab group 中隔離，不搶走使用者主要瀏覽。
- 敏感行為要先提示與核准。
- CDP / debugger / native app bridge 這類能力是高風險，必須放到 Phase 2+。

### OpenCode 參考點

- 使用 Plan / Build 分離。
- Explore/Scout subagents 做讀取、搜尋與外部文件研究。
- OpenCode agents 可透過 JSON 或 Markdown 設定，並可限制 edit / bash / webfetch 等權限。

## 3. 產品定位

### 不是

- 不是直接複製 Hermes Browser Extension。
- 不是瀏覽器控制器第一版。
- 不是把 Codex Chrome Extension 重做一遍。
- 不是沒有安全邊界的網頁自動化工具。

### 是

- Hermes Runtime 的 browser-native side panel client。
- Agent workflow console：將網頁上下文變成 Hermes / Codex / OpenCode 可用的任務資料。
- 安全優先的 browser context bridge。
- 逐步升級到 action-capable 的 agent extension。

## 4. 開發階段

### Phase 0 — Research & Boundary Lock

目標：先把安全邊界鎖死，不讓 agent 一開始就亂加權限。

交付：

- `AGENTS.md` 專案規則。
- `spec.md` 第一版規格。
- `uidesign.md` UI wireframe。
- `test.md` 測試策略。
- `opencode.jsonc` 與 `.codex/agents`。

Gate：

- 確認第一版 manifest 不包含 `debugger`、`nativeMessaging`、`cookies`、`history`、`downloads`、`bookmarks`。
- 確認 restricted pages 規則寫入 spec。
- 確認資料流包含 redaction 與 untrusted wrapper。

### Phase 1 — Extension Scaffold

目標：建立可 load unpacked 的 MV3 extension。

建議結構：

```txt
hermes-agents-chrome-extension/
  package.json
  manifest.json
  src/
    background/
      background.ts
    content/
      content.ts
      extractors.ts
      redaction.ts
      restricted-pages.ts
    sidepanel/
      index.html
      main.tsx
      App.tsx
      styles.css
    shared/
      browser-context-protocol.ts
      diagnostics.ts
      types.ts
      storage.ts
      logger.ts
      permissions.ts
    gateway/
      hermes-client.ts
      rest-adapter.ts
      ws-adapter.ts
      capability-normalizer.ts
  tests/
  e2e/
  scripts/
```

Gate：

- `npm install`
- `npm test`
- `npm run check:manifest`
- `npm run build`
- `dist/manifest.json` 存在，可在 Chrome load unpacked。

### Phase 2 — Hermes Gateway Connection

目標：連接 Hermes Local Gateway。

功能：

- Settings：gateway URL、token、mode local/remote/dashboard。
- Health check。
- Models list。
- Sessions list。
- Skills list。
- Profiles list。
- Capabilities list。
- Connection status：Disconnected / Connecting / Connected / Connected with warning / Fallback mode。

Gate：

- 沒 token 時不把 token 印到 console。
- 連線錯誤顯示可讀訊息，不洩漏敏感資料。
- Remote gateway 需顯示警告：不要裸露在公網，建議 Tailscale/VPN/HTTPS reverse proxy。

### Phase 3 — Browser Context Protocol

目標：將頁面內容轉成可控、可追蹤、可 redacted 的 context payload。

內容：

- active tab title / URL origin。
- selected text。
- page title、meta description、headings、paragraph text、links、buttons、form labels。
- open tabs summary，預設關閉，需明確開啟。
- YouTube transcript adapter，若可取得才加入。
- attachments metadata。
- `UNTRUSTED_BROWSER_CONTEXT_START` / `UNTRUSTED_BROWSER_CONTEXT_END` wrapper。
- secret redaction：Bearer token、API key、private key、JWT、GitHub token、Slack token、`key=value` secret patterns。

Gate：

- restricted pages return blocked payload，不可回傳原始內容。
- redaction unit tests ≥ 20 cases。
- payload size cap：預設 40,000 chars，可設定，但要顯示 truncation receipt。

### Phase 4 — Agent Side Panel UI

目標：完成可用的 Hermes Agents 工作台。

核心區塊：

1. Header：connection chip、model/profile selector、settings。
2. Context bar：Chat only / Follow active tab / Pin tab / Page only / Include tabs。
3. Composer：message、slash commands、attachments、voice optional。
4. Agent mode：Summarize / Explain / Rewrite / Action plan / Dev handoff / QA。
5. Transcript：user message、Hermes response、tool activity strip。
6. What Hermes saw：每回合 receipt。
7. Diagnostics：copy redacted diagnostics。

Gate：

- side panel 360px 寬可用。
- keyboard only 可操作。
- light/dark/high contrast。
- 錯誤狀態可復原。

### Phase 5 — Codex / OpenCode Development Workflow Integration

目標：不是讓 extension 直接控制 Codex/OpenCode，而是提供一套「交付任務包」與 repo 規則，使 Codex/OpenCode 能高品質開發。

交付：

- `AGENTS.md`：Codex / OpenCode 共用規則。
- `.codex/agents/*.toml`：architect、implementer、security-reviewer、qa。
- `.opencode/agents/*.md`：planner、builder、reviewer、qa。
- `opencode.jsonc`：permission 與 subagent 設定。
- `prompts/codex-master-prompt.md`
- `prompts/opencode-master-prompt.md`
- Codex local plugin 範本：`plugins/hermes-extension-workflow`。

Gate：

- Codex 首輪只做 scaffold 與 smoke tests，不一次做所有功能。
- OpenCode Plan mode 必須先審查架構，不可直接改檔。
- Reviewer agent 必須不同於 implementer agent。
- 每次實作後至少更新 `todos.md` 與 `final.md` 狀態。

### Phase 6 — Packaging & Release

目標：可發佈 alpha build。

指令：

```bash
npm run verify
npm run build
npm run package
```

Release artifact：

```txt
artifacts/hermes-agents-chrome-extension-v0.1.0.zip
```

Gate：

- `dist/` 可 load unpacked。
- extension id 變動時，Hermes CORS 文件有提醒更新。
- `PRIVACY.md`、`SECURITY.md`、`PERMISSIONS.md`、`DATA-FLOW.md` 完成。
- Manual QA 完成：Chrome、Edge、Brave 至少各測一次。

## 5. 建議代理分工

### Codex

- `hermes-architect`：規格、架構、資料流、安全邊界。
- `hermes-implementer`：實作 TypeScript、build、修測試。
- `hermes-security-reviewer`：權限、prompt injection、token redaction、restricted pages。
- `hermes-qa`：測試計畫、E2E、manual QA、release checklist。

### OpenCode

- Plan：先讀 `spec.md`、`uidesign.md`、`test.md`，提出實作 plan。
- Build：執行單一 milestone，不跨越 todo scope。
- Explore：讀取 codebase，不改檔。
- Scout：查外部 docs / upstream behavior，不改檔。
- Reviewer：只讀 diff，禁止 edit。

## 6. 優先級

### P0

- MV3 scaffold。
- Side Panel 啟動。
- Local storage settings。
- Hermes health/models/sessions/skills/capabilities。
- Active tab context extraction。
- Redaction。
- Restricted pages。
- Chat only / Follow active tab。
- What Hermes saw receipt。
- Build/package/test。

### P1

- Remote gateway。
- Dashboard WebSocket fallback。
- Open tabs picker。
- Slash commands。
- Tool activity strip。
- Copy diagnostics。
- Voice dictation fallback。
- UI theme system。

### P2

- Optional companion plugin。
- Action planner with approval cards。
- CDP/debugger/nativeMessaging feasibility spike。
- Website allowlist/blocklist。
- Task-scoped tab groups。
- Browser action adapter。

## 7. 不做項目 v0.1

- 不做自動點擊/輸入/表單提交。
- 不讀 cookies。
- 不讀 browser history。
- 不下載/上傳檔案，除非使用者明確手動附檔。
- 不使用 debugger permission。
- 不使用 nativeMessaging。
- 不將 API key 寫入 log、diagnostics、Git。

## 8. 完成定義

v0.1 完成代表：

1. 使用者能 load unpacked extension。
2. Side Panel 能連上 Hermes Gateway。
3. 使用者能在一般 https 頁面問：「請摘要此頁」。
4. Hermes 收到 redacted/untrusted browser context。
5. UI 顯示「What Hermes saw」。
6. restricted/sensitive pages 被阻擋。
7. 所有 tests / build / package 通過。
8. Codex/OpenCode 文件與 agent configs 可直接使用。

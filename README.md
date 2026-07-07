# Hermes Agents Chrome Extension 開發包

本開發包用來交給 **Codex** 與 **OpenCode** 開發一套「Hermes Agents Chrome Extension」。目標不是單純做瀏覽器聊天機器人，而是做一個 Chrome/Edge/Chromium MV3 Side Panel，將當前網頁上下文、安全摘要、使用者指令與 Hermes Agent Runtime 連接起來，並把複雜開發任務分派給 Codex / OpenCode 進行實作、審查與測試。

## 核心方向

- 參考 `abundantbeing/hermes-browser-extension`：MV3 Side Panel、預設 Local Hermes Gateway、讀取頁面上下文、連接 Hermes models / profiles / skills / sessions / capabilities。
- 參考 Codex Chrome Extension：需要登入狀態或真實網站工作流時，採「網站授權 / 任務範圍 / 明確核准 / 可回顧結果」的模式。
- 第一版採 **read-only browser context**：可讀取網頁、選取文字、tab 摘要、YouTube transcript、附件摘要；不點擊、不輸入、不送出表單、不下載、不讀 cookie、不讀 history。
- 第二版才考慮可控動作：只有在明確批准、完整 action plan、敏感站點阻擋、audit log 可追蹤之後，才開啟 action adapter。

## 檔案說明

| 檔案 | 用途 |
|---|---|
| `plan.md` | 開發路線圖、里程碑、任務分工、Codex/OpenCode 工作流 |
| `spec.md` | 產品規格、架構、資料流、權限、安全模型、API adapter |
| `todos.md` | 可直接執行的 checklist，適合貼給 Codex / OpenCode |
| `test.md` | 單元、整合、E2E、手動驗收、安全測試 |
| `final.md` | 最終交付標準、安裝、打包、驗收與風險清單 |
| `uidesign.md` | Side Panel UI/UX 設計、元件、狀態、wireframe |
| `AGENTS.md` | 專案根目錄給 Codex / OpenCode 讀取的開發規則 |
| `opencode.jsonc` | OpenCode agent 分工與權限範本 |
| `.codex/agents/*.toml` | Codex subagents 範本 |
| `.opencode/agents/*.md` | OpenCode markdown agents 範本 |
| `prompts/*.md` | 可直接貼給 Codex / OpenCode 的任務提示詞 |
| `.agents/plugins/marketplace.json` 與 `plugins/hermes-extension-workflow/` | Codex local plugin/skill 範本 |

## 建議使用方式

1. 建立新 repo：`hermes-agents-chrome-extension`。
2. 將本包全部解壓到 repo 根目錄。
3. 先讓 Codex 讀取 `AGENTS.md`、`plan.md`、`spec.md`、`uidesign.md`。
4. 用 `prompts/codex-master-prompt.md` 開第一個 Codex 任務，要求先 scaffold，不要一次實作所有功能。
5. 用 OpenCode 的 Plan agent 審查實作路線，再切 Build agent 執行。
6. 每一個 milestone 都必須跑 `npm test`、`npm run check:manifest`、`npm run build`，並更新 `final.md` 的驗收狀態。

## 推薦技術棧

- Chrome Extension：Manifest V3 + Side Panel API
- UI：TypeScript + Vite + React 或 Vanilla TS（第一版可用 Vanilla 降低複雜度）
- 測試：Vitest / Node test + Playwright Chromium extension E2E
- 儲存：`chrome.storage.local`
- 通訊：`chrome.runtime.sendMessage`、content script、Hermes Gateway REST / WebSocket adapter
- 打包：`dist/` load unpacked；release 使用 zip / tar.gz

## 重要安全原則

- API token 只存本機 extension storage；顯示時永遠 mask。
- 對 Hermes 傳送的頁面內容必須包成 untrusted context。
- 預設不申請 `debugger`、`nativeMessaging`、`cookies`、`history`、`downloads`、`bookmarks`。
- restricted pages 永遠不可讀取：browser internal、extension pages、password manager、banking、crypto wallet、checkout/payment、health、government tax/account。
- diagnostics 不可包含 token、cookie、完整 tab URL、page text、selected text。

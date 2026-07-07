# Codex Master Prompt — Hermes Agents Chrome Extension

請在目前 repo 中執行以下任務：

1. 先讀取 `AGENTS.md`、`plan.md`、`spec.md`、`uidesign.md`、`test.md`、`todos.md`、`final.md`。
2. 你現在是 `hermes-architect`。
3. 請先不要大量實作，先檢查規格是否一致，提出 Phase 1 scaffold 的檔案清單、風險清單與驗收命令。
4. 確認 v0.1 禁止新增：`debugger`、`nativeMessaging`、`cookies`、`history`、`downloads`、`bookmarks`、browser-control behavior。
5. 等我確認後，再切到 `hermes-implementer` 實作 Phase 1。

實作時請遵守：

- 每次只處理 `todos.md` 的一個小區塊。
- 不可把 token、cookie、page text、selected text、full tab URL 寫進 diagnostics/logs。
- 所有 browser page content 必須包成 untrusted context。
- 完成後跑：`npm test`、`npm run check:js`、`npm run check:manifest`、`npm run build`。
- 回覆要包含測試結果與未完成項目。

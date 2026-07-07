# OpenCode Master Prompt — Hermes Agents Chrome Extension

請使用 Plan mode 先分析，不要改檔。

請讀取：

- `AGENTS.md`
- `plan.md`
- `spec.md`
- `uidesign.md`
- `test.md`
- `todos.md`
- `final.md`

目標：建立 Hermes Agents Chrome Extension 的 Phase 1 scaffold。

請輸出：

1. 需要建立/修改的檔案清單。
2. 每個檔案責任。
3. 安全邊界檢查。
4. 測試命令。
5. 可能失敗點。

限制：

- v0.1 read-only。
- 不加入 `debugger`、`nativeMessaging`、`cookies`、`history`、`downloads`、`bookmarks`。
- 不做 click/type/submit/browser-control。
- 不將 token/page text/full URL 放 diagnostics。

當我說「Build」後，再切 Build mode 實作一個小里程碑。

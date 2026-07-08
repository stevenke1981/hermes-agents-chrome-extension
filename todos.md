# todos.md — Hermes Agents Chrome Extension 工作清單

## 0. 專案啟動

- [x] 建立 repo：`hermes-agents-chrome-extension`
- [x] 放入本開發包所有文件
- [x] 建立 Git 初始 commit
- [x] 安裝 Node.js 20+
- [x] 選定 package manager：`npm` 或 `pnpm`
- [x] 建立 `package.json`
- [x] 建立 `tsconfig.json`
- [x] 建立 `vite.config.ts`
- [x] 建立 `eslint.config.js`
- [x] 建立 `AGENTS.md` 並確認 Codex/OpenCode 會讀取

## 1. Manifest 與 Scaffold

- [x] 建立 `manifest.json`
- [x] 設定 MV3
- [x] 設定 `minimum_chrome_version: 114`
- [x] 加入 `sidePanel`
- [x] 加入 `background.service_worker`
- [x] 加入 `content_scripts`
- [x] 加入 `Alt+H` shortcut
- [x] 加入 icons placeholder
- [x] 建立 `src/background/background.ts`
- [x] 建立 `src/content/content.ts`
- [x] 建立 `src/sidepanel/index.html`
- [x] 建立 `src/sidepanel/main.tsx`
- [x] 建立 build script
- [x] 建立 manifest check script
- [x] 驗證 `dist/manifest.json` 直接位於 dist 根目錄

## 2. Side Panel 基礎 UI

- [x] Header：logo、extension name、status chip
- [x] Connection panel：gateway URL、mode、token field、test/save/clear
- [x] Model selector
- [x] Profile selector
- [x] Session selector
- [x] Agent mode picker
- [x] Context scope picker
- [x] Composer
- [x] Message list
- [ ] Settings drawer
- [ ] Diagnostics drawer
- [x] Toast / error banner
- [x] Light/dark theme
- [ ] Keyboard navigation

## 3. Gateway Client

- [x] 建立 `HermesGatewayClient` interface
- [x] 實作 `health()`
- [x] 實作 `listModels()`
- [x] 實作 `listSessions()`
- [x] 實作 `listSkills()`
- [x] 實作 `listProfiles()`
- [x] 實作 `listCapabilities()`
- [x] 實作 REST adapter
- [x] 實作 WebSocket adapter stub
- [x] 實作 Dashboard WebSocket minimal adapter
- [x] 對齊 Dashboard WebSocket chat payload envelope
- [x] 實作 timeout / abort controller
- [x] 實作 token header：`Authorization: Bearer <token>`
- [x] 錯誤訊息 redaction
- [x] Gateway origin sanitizer
- [x] ConnectedWithWarning 狀態

## 4. Context Extraction

- [x] 建立 `BrowserContextV1` types
- [x] 建立 active tab metadata extractor
- [x] 建立 selected text extractor
- [x] 建立 page title/meta extractor
- [x] 建立 headings extractor
- [x] 建立 paragraph/text extractor
- [x] 建立 links extractor
- [x] 建立 buttons extractor
- [x] 建立 form labels extractor
- [ ] 建立 open tabs summary，預設 off
- [x] 建立 YouTube transcript adapter stub
- [x] 建立 YouTube transcript visible/script cue extractor
- [x] 建立 YouTube transcript content script message handler
- [x] 建立 payload char limit
- [x] 建立 truncation flag
- [x] 建立 context receipt generator

## 5. Restricted Pages

- [x] 阻擋 `chrome://`
- [x] 阻擋 `edge://`
- [x] 阻擋 `about:`
- [x] 阻擋 `devtools://`
- [x] 阻擋 extension pages
- [x] 阻擋 `file://`
- [x] 阻擋 password manager/vault URL patterns
- [x] 阻擋 banking URL patterns
- [x] 阻擋 crypto wallet/exchange URL patterns
- [x] 阻擋 checkout/payment URL patterns
- [x] 阻擋 health/medical URL patterns
- [x] 阻擋 government tax/account URL patterns
- [x] UI 顯示 blocked sensitive page
- [x] blocked 時 What Hermes saw 不含 title / full URL / selected text / page content

## 6. Redaction

- [x] Bearer token redaction
- [x] API key prefix redaction
- [x] JWT redaction
- [x] PEM private key redaction
- [x] `.env` secret assignment redaction
- [x] URL query secret redaction
- [x] Cookie-like text redaction
- [x] Slack token redaction
- [x] GitHub token redaction
- [x] RedactionEvent counts
- [x] Redaction unit tests ≥ 20 cases

## 7. Chat / Streaming

- [x] Message model
- [x] Send turn input builder
- [x] Agent mode prompt prefix
- [x] Untrusted context wrapper
- [x] Hermes stream parser
- [x] Tool activity event normalizer
- [ ] Cancel streaming
- [ ] Retry last message
- [x] Local message history per tab/session
- [ ] Clear conversation

## 8. What Hermes Saw

- [x] 顯示 context scope
- [x] 顯示 active tab origin 或 blocked category
- [x] 顯示 selected text 是否包含
- [x] 顯示 page text char count
- [x] 顯示 open tabs sent count
- [x] 顯示 attachments count
- [x] 顯示 redaction count
- [x] 顯示 truncation status
- [x] blocked 時顯示 no browser content sent

## 9. Diagnostics

- [x] Copy Diagnostics 按鈕
- [x] Diagnostics copied 狀態自動重置
- [x] extension version
- [x] browser family/version
- [x] gateway origin sanitized
- [x] mode / state / capabilities
- [x] last visible error category
- [x] redaction counts
- [x] 確認不含 token/cookie/page text/selected text/full tab URL/tab title
- [x] diagnostics tests

## 10. Documentation

- [ ] `README.md`
- [ ] `DATA-FLOW.md`
- [ ] `PERMISSIONS.md`
- [ ] `PRIVACY.md`
- [ ] `SECURITY.md`
- [ ] `TROUBLESHOOTING.md`
- [ ] `DEVELOPMENT.md`
- [ ] Windows setup notes
- [ ] Load unpacked notes
- [ ] CORS extension id notes

## 11. Codex Integration 文件

- [ ] `.codex/agents/hermes-architect.toml`
- [ ] `.codex/agents/hermes-implementer.toml`
- [ ] `.codex/agents/hermes-security-reviewer.toml`
- [ ] `.codex/agents/hermes-qa.toml`
- [ ] `prompts/codex-master-prompt.md`
- [ ] Codex local plugin manifest
- [ ] Codex local skill `SKILL.md`
- [ ] marketplace.json

## 12. OpenCode Integration 文件

- [ ] `opencode.jsonc`
- [ ] `.opencode/agents/hermes-planner.md`
- [ ] `.opencode/agents/hermes-builder.md`
- [ ] `.opencode/agents/hermes-reviewer.md`
- [ ] `.opencode/agents/hermes-qa.md`
- [ ] `prompts/opencode-master-prompt.md`
- [ ] OpenCode Plan → Build → Review 流程寫入 `AGENTS.md`

## 13. 測試

- [x] `npm test`
- [x] `npm run check:js`
- [x] `npm run check:manifest`
- [x] `npm run verify`
- [x] `npm run build`
- [x] Phase 3 Browser Context Protocol unit tests
- [x] Phase 3 extractor unit tests
- [x] Phase 4 Side Panel workspace render tests
- [x] Restricted page classifier tests
- [x] Redaction unit tests ≥ 20 cases
- [x] Chat streaming adapter tests
- [x] Diagnostics redaction tests
- [x] Priority regression tests：Authorization header、Bearer redaction、transcript history、runtime dropdowns、agent prompt、content timeout、browser detection、YouTube transcript、Web Crypto hash
- [x] Adapter cleanup tests：REST request headers、Dashboard WebSocket adapter、YouTube script cues、Bearer token settings guidance
- [x] Review follow-up tests：Dashboard WebSocket chat envelope、YouTube transcript message handler、active tab message timeout、diagnostics copied reset、send spinner
- [x] Real-browser smoke QA script：Edge / Brave load unpacked、Side Panel render、Local Gateway connected-with-warning fallback
- [ ] Playwright extension load test
- [ ] Manual Chrome test（Chrome 137+ blocks command-line `--load-extension`; `chrome://extensions` UI Load unpacked still pending）
- [x] Manual Edge test（2026-07-08 real-browser smoke passed）
- [x] Manual Brave test（2026-07-08 real-browser smoke passed）
- [ ] Security regression tests

## 14. Release

- [x] `dist/` 檢查
- [x] `artifacts/hermes-agents-chrome-extension-v0.1.0.zip`
- [ ] release notes
- [ ] screenshots
- [ ] known issues
- [ ] final acceptance report

## 15. v0.1 禁止事項確認

- [x] 沒有 `debugger`
- [x] 沒有 `nativeMessaging`
- [x] 沒有 `cookies`
- [x] 沒有 `history`
- [x] 沒有 `downloads`
- [x] 沒有 `bookmarks`
- [x] 沒有自動 click/type/submit
- [x] 沒有將 token 輸出到 log
- [x] 沒有將 page text 放進 diagnostics

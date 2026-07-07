# uidesign.md — Hermes Agents Chrome Extension UI/UX 設計

## 1. 設計原則

1. **安全可見**：使用者永遠看得到目前有沒有傳送網頁內容。
2. **先讀取，後行動**：第一版只讀取 context，不控制瀏覽器。
3. **少打擾**：常用操作一鍵完成，例如摘要、解釋、重寫、產出待辦。
4. **可追蹤**：每次送出後都顯示 What Hermes saw。
5. **可復原**：連線錯誤、Hermes runtime error、capability mismatch 都要有明確提示。
6. **Agent-first**：使用者不是只選 model，而是選「想讓哪種 agent mode 幫忙」。

## 2. Side Panel 尺寸

- 最小寬度：360px。
- 建議寬度：420px。
- 最大寬度：依 browser side panel。
- Header 高度：48px。
- Context bar 高度：40px。
- Composer 高度：96–180px。

## 3. 主要版面

```txt
┌────────────────────────────────────┐
│ Hermes Agents   ● Connected   ⚙    │ Header
├────────────────────────────────────┤
│ Model: Hermes/auto      Profile: Web│ Selectors
├────────────────────────────────────┤
│ Context: Follow active tab  ▾  📌  │ Context bar
│ example.com · 12.4k chars · safe    │ Context chip
├────────────────────────────────────┤
│ Agent Mode                         │
│ [Chat] [Summary] [Explain] [Dev]   │ Agent chips
├────────────────────────────────────┤
│                                    │
│  User / Hermes messages            │ Message list
│                                    │
│  Tool Activity Strip               │
│  What Hermes saw                   │
│                                    │
├────────────────────────────────────┤
│ /summarize this page...            │ Composer
│ [Attach] [Voice]          [Send]   │
└────────────────────────────────────┘
```

## 4. Header

### 元件

- Logo / icon。
- Product name：`Hermes Agents`。
- Connection chip。
- Settings button。
- Diagnostics shortcut。

### Connection chip 狀態

| 狀態 | 標籤 | 行為 |
|---|---|---|
| Disconnected | `Disconnected` | 點擊開 settings |
| Connecting | `Connecting…` | spinner |
| Connected | `Connected` | 綠色狀態 |
| Connected with warning | `Connected · warning` | 點擊顯示 warning |
| Fallback | `Fallback mode` | 顯示缺少 capabilities |
| Error | `Connection error` | 顯示 retry |

## 5. Context Bar

### Mode dropdown

選項：

- Chat only
- Follow active tab
- Pin current tab
- Page only
- Selected text only

### Context chip

一般頁面：

```txt
example.com · 12.4k chars · 2 redactions
```

Blocked 頁面：

```txt
Blocked sensitive page · Chat only available
```

Truncated：

```txt
example.com · 40k/128k chars · truncated
```

Open tabs enabled：

```txt
example.com · page + 5 tabs
```

## 6. Agent Mode Picker

### 第一層 quick chips

- Chat
- Summary
- Explain
- Rewrite
- Tasks
- Dev Handoff
- QA
- Security

### Agent mode 說明

| Mode | UX copy |
|---|---|
| Chat | 一般詢問，不套用特殊格式 |
| Summary | 摘要頁面重點 |
| Explain | 用簡單方式解釋 |
| Rewrite | 改寫選取文字 |
| Tasks | 轉成待辦與下一步 |
| Dev Handoff | 轉成 Codex/OpenCode 開發規格 |
| QA | 產出測試與驗收 |
| Security | 檢查安全風險 |

## 7. Message List

### User message

- 顯示使用者輸入。
- 若附 context，顯示小 badge：`Browser context attached`。

### Hermes response

- 支援 markdown。
- 支援 code block copy。
- streaming 中顯示 cursor。
- 出現 tool call 時插入 Tool Activity Strip。

### Tool Activity Strip

```txt
Tool activity
✓ search_docs · 3 results
✓ mcp:github.get_issue · issue #42
⚠ browser context · redacted 2 secrets
```

不可顯示敏感 token、完整 URL、page text。

## 8. What Hermes Saw Receipt

每次 sent turn 後產生 collapsed receipt：

```txt
What Hermes saw
Scope: Follow active tab
Page: example.com
Selected text: no
Page text: 12,431 chars
Open tabs: 0 sent
Attachments: 0
Redactions: 2
Truncated: no
```

Blocked：

```txt
What Hermes saw
Scope: Chat only fallback
Page: blocked sensitive category: payment
Browser content sent: no
Redactions: n/a
```

## 9. Settings Panel

### Sections

1. Connection
2. Context & privacy
3. Agent defaults
4. Appearance
5. Voice
6. Diagnostics
7. About

### Connection form

欄位：

- Mode：Local API / Remote API / Remote dashboard WebSocket
- Gateway URL
- API token / browser token
- Test connection
- Save
- Clear stored token

安全文案：

```txt
Token is stored locally in this browser profile. It is masked after save and excluded from diagnostics.
```

Remote warning：

```txt
Only connect to trusted LAN, Tailscale/VPN, or HTTPS reverse proxy. Do not expose Hermes Gateway directly to the public internet.
```

## 10. Context & Privacy Settings

- Default context mode：Chat only / Follow active tab。
- Include selected text：on/off。
- Include open tabs：off by default。
- Max page chars：10k / 40k / 80k。
- YouTube transcript：off / auto。
- Redaction strictness：balanced / strict。
- Restricted page protection：locked on。

## 11. Appearance

### Theme tokens

```css
:root {
  --bg: #0f1115;
  --panel: #151923;
  --panel-2: #1b2130;
  --text: #f4f7fb;
  --muted: #a9b1c3;
  --border: #2a3142;
  --accent: #7c5cff;
  --success: #31c48d;
  --warning: #f59e0b;
  --danger: #ef4444;
}
```

> 實作時可讓使用者切換 Mono / Aurora / Light / System。

## 12. Empty States

### 沒連線

```txt
Connect Hermes Gateway
Use local mode for the safest setup.
[Use local default] [Manual setup]
```

### 沒頁面 context

```txt
No readable page context
Browser internal pages and sensitive pages are blocked.
Try a normal https page or switch to Chat only.
```

### Hermes warning

```txt
Hermes is reachable, but one runtime tool returned a warning.
The extension can still chat, but some tools may be unavailable.
[Copy diagnostics]
```

## 13. Error States

| Error | 顯示 |
|---|---|
| Gateway unreachable | `Cannot reach Hermes Gateway. Check /health.` |
| Unauthorized | `Token rejected. Clear and save a new token.` |
| CORS blocked | `Extension origin may not be allowlisted in API_SERVER_CORS_ORIGINS.` |
| Capability missing | `This Hermes Gateway does not expose skills/profiles yet.` |
| Restricted page | `This page is blocked by privacy protection.` |
| Token redacted | `Sensitive text was redacted before sending.` |

## 14. Accessibility

- 所有 buttons 有 aria-label。
- Keyboard：Alt+H 開 panel；Ctrl+Enter send；Esc close dropdown。
- Focus ring 明顯。
- Color 不作為唯一狀態 संकेत，要搭配文字。
- Tooltips 可由鍵盤 focus 顯示。

## 15. Dev Handoff Output UI

當 mode 是 Dev Handoff 時，回覆下方增加 quick actions：

- Copy as `plan.md`
- Copy as `spec.md`
- Copy as `todos.md`
- Copy prompt for Codex
- Copy prompt for OpenCode

第一版只 copy 到 clipboard，不直接操作本機檔案。

## 16. Phase 2 Action Approval UI 草案

> v0.1 不實作。

Action approval card：

```txt
Hermes wants to perform browser actions
Host: app.example.com
Scope: current chat only
Actions:
1. Click “Settings”
2. Type into “Search” field: [hidden preview]
3. Click “Apply filter”

[Decline] [Approve once]
```

Rules：

- Password/card/seed phrase/TOTP 不可自動填。
- Download/upload 必須額外 approval。
- Form submit 必須顯示 final review。
- 所有 action 進 audit log。

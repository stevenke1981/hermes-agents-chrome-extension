# Phase 1 Build Prompt

請實作 Phase 1：MV3 Extension Scaffold。

Scope 只包含：

- `package.json`
- `manifest.json`
- `src/background/background.ts`
- `src/content/content.ts`
- `src/sidepanel/index.html`
- `src/sidepanel/main.tsx` 或 vanilla `sidepanel.js`
- `src/sidepanel/styles.css`
- `src/shared/types.ts`
- `scripts/check-manifest.mjs`
- 基礎 tests

不要實作 Phase 2 Gateway，也不要實作 browser action。

完成條件：

- `npm test` 通過。
- `npm run check:manifest` 通過。
- `npm run build` 產生 `dist/`。
- `dist/manifest.json` 存在。
- manifest 不含禁止權限。
- 更新 `todos.md` Phase 1 checkbox。

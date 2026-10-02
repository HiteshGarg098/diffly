# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # vite dev server, http://localhost:5173
npm run lint           # oxlint (not eslint)
npm test               # vitest, src/**/*.test.ts only
npx vitest run src/lib/share.test.ts          # single unit test file
npx vitest run -t "name pattern"              # single test by name
npm run build          # tsc -b && vite build
npm run test:e2e       # Playwright; runs against `vite preview` of dist/, so build first
npx playwright test e2e/app.spec.ts -g "name" # single e2e test
npm run test:all       # lint + unit + build + e2e (same as CI; run before pushing)
```

Node 24. First e2e run needs `npx playwright install chromium`.

## Architecture

Client-only React 19 + Vite + Tailwind 4 app: text compare/merge (diffchecker alternative). Compared text must never leave the browser: no network calls carrying user text.

- `src/App.tsx`: all app state, input screen, ⌘K palette commands. Two modes: input (two textareas + Recent strip) and diff view (`DiffToolbar` + `DiffView`).
- `src/components/DiffView.tsx`: wraps `@codemirror/merge` (`MergeView` for split, `unifiedMergeView` for unified). Exposes `next/prev/goTo/undoMerge/getTexts` via imperative handle. Also draws the split-gutter ribbons (SVG appended to `MergeView.dom`) and the change map, from `lineBlockAt` geometry. Pads missing trailing newlines for diffing and strips on output.
- `src/lib/`: pure logic with unit tests, no React. Keep logic here, components thin.
  - `share.ts`: lz-string encodes both texts into URL fragment (`#d=...`), never sent to server.
  - `history.ts` / `storage.ts`: last 30 comparisons in localStorage.
  - `export.ts`: `.patch` and HTML report via jsdiff; lazy-loaded.
  - `languages.ts` (detection, no CodeMirror imports) vs `loadLanguage.ts` (CodeMirror loader).

## Constraints

- Bundle split matters: input screen must stay light. Do not statically import CodeMirror or other heavy packages from `App.tsx`, the components it imports statically (`DiffToolbar`, `CommandPalette`, `Menu`, ...), or `lib/languages.ts`. Use `import()`; `DiffView` is a lazy chunk, and CodeMirror-only helpers (`lib/flash.ts`) may only be imported from it.
- e2e tests select elements by accessible role and name; keep roles/labels intact. `e2e/perf.spec.ts` fails if a 10k-line diff takes >5s or blocks main thread >2s.
- Vite `base` is `'/diffly/'` for GitHub Pages. Override with `VITE_BASE=/` for a custom domain. Push to `main` runs CI and auto-deploys via `.github/workflows/deploy.yml`; any failure blocks deploy.

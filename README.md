# sidebyside

Text compare and merge tool, a free alternative to diffchecker.com.
Everything runs in the browser, so compared text never leaves your machine.

## Use

1. Paste or drop text into both panes, then press **Find difference** (⌘↵).
   **Transform ▾** (sort, trim, format JSON, ...) applies to both sides first.
2. Step through changes with **↑ / ↓** (F7 / Shift+F7) or click a mark in the
   change map on the right edge. Layout, **Ignore whitespace**, **Hide
   unchanged** and **Merge into** sit in the toolbar.
3. Merge a single change with the ← buttons on the ribbons between panes
   (**Undo** in the toast), or use **⋯ → Take all into left/right**.
   **⋯ → Reset merges** restores the texts you compared.
4. **Export ▾** downloads or copies either side, a unified `.patch`
   (`git apply` ready), or a self-contained HTML report.
5. **🔗 Share** copies a link that carries both texts in the URL fragment
   (`#d=...`). The fragment is never sent to the server. Very large inputs warn
   or fall back to Export.
6. **Recent** (under the input panes) keeps your last 30 comparisons in this
   browser's localStorage. Turn off "Save comparisons" or clear it at any time.
7. Press **⌘K** to search every action, or **?** for keyboard shortcuts.

## Develop

Requires Node 24 (same as CI).

```bash
npm install
npm run dev          # http://localhost:5173
```

## Test

```bash
npm test             # unit tests (Vitest), src/**/*.test.ts
npx playwright install chromium   # once
npm run build && npm run test:e2e # end-to-end tests (Playwright) against the production build
npm run test:all     # lint + unit + build + e2e, same as CI
```

The e2e suite includes a 10k-line performance check (`e2e/perf.spec.ts`) that
fails if a large diff takes over 5 s or blocks the main thread for over 2 s.
Current numbers: about 1.2 s end to end, longest task about 65 ms.

## Project layout

```
src/
  App.tsx                 app state, input screen, palette commands
  components/
    DiffView.tsx          CodeMirror merge view + ribbons, change map (lazy chunk)
    DiffToolbar.tsx       diff toolbar: navigate | view | output, ⋯ menu
    CommandPalette.tsx    ⌘K action search (native <dialog>)
    Mascot.tsx            Minus and Plus (animations in index.css)
    RecentStrip.tsx       saved comparisons on the input screen
    Menu.tsx              accessible dropdown (Export, ⋯, Transform)
    ShortcutsDialog.tsx   keyboard help (native <dialog>)
  lib/                    pure logic, unit tested; no React here
    chunks.ts             change lookup and ribbon geometry
    commands.ts           palette search
    diffOptions.ts        ignore whitespace / case
    flash.ts              CodeMirror line flash (jump pulse, merge slide-in)
    export.ts             .patch and HTML report (lazy-loaded, uses jsdiff)
    history.ts            local history rules
    options.ts            view options and defaults
    share.ts              share-link encoding (lz-string, URL fragment)
    languages.ts          language detection (no CodeMirror imports)
    loadLanguage.ts       CodeMirror language loader
    transforms.ts         text transforms
e2e/                      Playwright specs
```

## Contributing

- Branch from `main`, open a PR; `main` deploys automatically.
- Run `npm run test:all` before pushing. CI runs the same steps and blocks the
  deploy on any failure.
- Put logic in `src/lib` with a unit test; keep components thin.
- Keep the input screen light: do not import CodeMirror or other heavy
  packages from `App.tsx`, the components it imports statically, or
  `lib/languages.ts`. Load them with
  `import()` instead.
- Everything must stay client-side. Do not add network calls that send
  compared text anywhere.
- Use accessible roles and labels; e2e tests select elements by role and name.

## Deploy

Pushes to `main` lint, test, build, run e2e and deploy to GitHub Pages via
`.github/workflows/deploy.yml`. On e2e failure, traces are uploaded as the
`playwright-results` artifact (`npx playwright show-trace <trace.zip>`).

## Roadmap

1. Scaffold + Pages deploy (done)
2. CodeMirror merge view: split/unified diff (done)
3. Options sidebar, syntax highlighting, ignore whitespace/case, text transforms (done)
4. Merge, copy, download, export (done)
5. History, share links, shortcuts, mobile drawer, lazy-loaded editor (done)
6. Unit + e2e tests, performance check, docs (done)
7. Toolbar redesign (no sidebar), ribbons, change map, merge Undo, ⌘K palette, mascot (done)

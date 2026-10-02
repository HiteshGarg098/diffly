# Contributing to diffly

Thanks for your interest in contributing! Here's everything you need to get started.

## Setup

Requires **Node 24** (same version as CI).

```bash
git clone https://github.com/HiteshGarg098/diffly.git
cd diffly
npm install
npm run dev          # http://localhost:5173
```

First e2e run needs a one-time browser install:

```bash
npx playwright install chromium
```

## Development workflow

1. Branch from `main`.
2. Make your changes.
3. Run `npm run test:all` before pushing — CI runs the same steps and blocks deploy on failure.
4. Open a PR. Pushes to `main` deploy automatically.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run lint` | Run oxlint |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | E2E tests (Playwright) against production build |
| `npm run test:all` | Lint + unit + build + e2e — same as CI |

## Architecture guidelines

- **Logic in `src/lib/`** with a unit test. Keep components thin.
- **Keep the input screen light.** Don't statically import CodeMirror or other heavy packages from `App.tsx`, the components it imports statically (`DiffToolbar`, `CommandPalette`, `Menu`, etc.), or `lib/languages.ts`. Use dynamic `import()` instead. `DiffView` is a lazy chunk.
- **Everything stays client-side.** Do not add any network calls that send compared text anywhere. This is the core privacy promise of the project.
- **Accessible by default.** Use semantic roles and labels — e2e tests select elements by role and name, so changing them breaks tests.

## Performance budget

The e2e suite (`e2e/perf.spec.ts`) enforces:

- A 10k-line diff must complete in **< 5 s**
- Longest main-thread block must be **< 2 s**

Current numbers: ~1.2 s end-to-end, ~65 ms longest task.

## Project layout

```
src/
  App.tsx                 ← App state, input screen, palette commands
  components/
    DiffView.tsx          ← CodeMirror merge view + ribbons, change map (lazy chunk)
    DiffToolbar.tsx       ← Toolbar: navigate · view · output · ⋯ menu
    CommandPalette.tsx    ← ⌘K / Ctrl+K action search (native <dialog>)
    Mascot.tsx            ← Minus & Plus characters
    RecentStrip.tsx       ← Saved comparisons on input screen
    Menu.tsx              ← Accessible dropdown (Export, ⋯, Transform)
    ShortcutsDialog.tsx   ← Keyboard help (native <dialog>)
  lib/                    ← Pure logic with unit tests, no React
    share.ts              ← Share-link encoding (lz-string, URL fragment)
    export.ts             ← .patch and HTML report (lazy-loaded, uses jsdiff)
    history.ts            ← Local history rules
    languages.ts          ← Language detection (no CodeMirror imports)
    loadLanguage.ts       ← CodeMirror language loader
    transforms.ts         ← Text transforms (sort, trim, dedupe, JSON…)
    chunks.ts             ← Change lookup and ribbon geometry
    commands.ts           ← Palette search
    diffOptions.ts        ← Ignore whitespace / case
    flash.ts              ← CodeMirror line flash effects
    options.ts            ← View options and defaults
    storage.ts            ← Safe localStorage wrapper
e2e/                      ← Playwright specs
```

## Code style

- The project uses oxlint for linting (not ESLint).
- No specific formatter is enforced, but keep formatting consistent with the surrounding code.
- Use TypeScript strict mode.

## Reporting issues

- Search existing issues before opening a new one.
- Include browser name and version if reporting a UI bug.
- For performance issues, include the size of the input text.

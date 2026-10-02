<p align="center">
  <img src="public/favicon.svg" width="80" alt="diffly logo" />
</p>

<h1 align="center">diffly</h1>

<p align="center">
  <strong>A fast, private text compare &amp; merge tool that runs entirely in your browser.</strong><br />
  Free alternative to Diffchecker — your text never leaves your machine.
</p>

<p align="center">
  <a href="https://hiteshgarg098.github.io/diffcheck/"><strong>🔗 Live Demo</strong></a>&nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="#features">Features</a>&nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="#keyboard-shortcuts">Shortcuts</a>&nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="#develop">Develop</a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/actions/workflow/status/HiteshGarg098/diffcheck/deploy.yml?branch=main&label=CI%20%2B%20Deploy&style=flat-square" alt="CI status" />
  <img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/CodeMirror-6-d73a49?style=flat-square" alt="CodeMirror 6" />
  <img src="https://img.shields.io/badge/100%25_client--side-no_server-22c55e?style=flat-square" alt="100% client-side" />
  <img src="https://img.shields.io/github/license/HiteshGarg098/diffcheck?style=flat-square" alt="License" />
</p>

---

## ✨ Features

| | Feature | Details |
|---|---|---|
| 🔒 | **100% Private** | All processing happens in your browser. No server, no tracking, no data sent anywhere. |
| ↔️ | **Split & Unified views** | Toggle between side-by-side and unified diff layouts. |
| 🔀 | **Merge changes** | Cherry-pick individual changes with ← ribbon buttons, take all into either side, or undo merges. |
| 🎨 | **Syntax highlighting** | Auto-detects 30+ languages (JS, TS, Python, Go, Rust, Java, SQL, HTML, CSS, YAML, and more). |
| 🔍 | **Ignore whitespace & case** | Focus on what matters — hide formatting-only differences. |
| 📊 | **Change map** | Scrollbar-like overview on the right edge for quick navigation. |
| 🔗 | **Share links** | Generates a URL with both texts compressed in the fragment (`#d=...`) — never sent to any server. |
| 📋 | **Export** | Download either side, a `git apply`-ready `.patch`, or a self-contained HTML report. |
| 🧹 | **Text transforms** | Sort lines, trim whitespace, deduplicate, format JSON, and more — applied before comparing. |
| 🕐 | **History** | Last 30 comparisons saved in localStorage. Disable or clear anytime. |
| ⌨️ | **Command palette** | Press `⌘K` to search every action instantly. |
| 🌗 | **Dark mode** | Follows your system preference, or toggle manually. |
| 📱 | **Mobile friendly** | Responsive layout with a drawer for small screens. |
| ⚡ | **Fast** | 10k-line diffs in ~1.2 s, longest main-thread block ~65 ms (enforced by e2e perf tests). |

## 🚀 Quick Start

Just visit **[hiteshgarg098.github.io/diffcheck](https://hiteshgarg098.github.io/diffcheck/)** — no install needed.

1. Paste or drop text into both panes
2. Press **Find difference** (`⌘↵`)
3. Step through changes with **↑ / ↓** or click the change map
4. Merge, export, or share

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘↵` | Find difference |
| `F7` / `Shift+F7` | Next / previous change |
| `⌘K` | Command palette |
| `?` | Keyboard shortcuts help |

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Editor | CodeMirror 6 (`@codemirror/merge`) |
| Diff engine | [jsdiff](https://github.com/kpdecker/jsdiff) (lazy-loaded for exports) |
| Styling | Tailwind CSS 4 |
| Build | Vite 8 |
| Linting | oxlint |
| Unit tests | Vitest |
| E2E tests | Playwright |
| Sharing | lz-string (URL fragment compression) |

## Develop

Requires **Node 24** (same as CI).

```bash
npm install
npm run dev          # http://localhost:5173
```

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check + production build |
| `npm run lint` | Run oxlint |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | E2E tests (Playwright) against production build |
| `npm run test:all` | Lint + unit + build + e2e — **same as CI** |

> **First e2e run?** Install the browser first: `npx playwright install chromium`

### Performance budget

The e2e suite (`e2e/perf.spec.ts`) enforces:
- A 10k-line diff must complete in **< 5 s**
- Longest main-thread block must be **< 2 s**

Current numbers: ~1.2 s end-to-end, ~65 ms longest task.

## 📁 Project Layout

```
src/
  App.tsx                 ← App state, input screen, palette commands
  components/
    DiffView.tsx          ← CodeMirror merge view + ribbons, change map (lazy chunk)
    DiffToolbar.tsx       ← Toolbar: navigate · view · output · ⋯ menu
    CommandPalette.tsx    ← ⌘K action search (native <dialog>)
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

## 🤝 Contributing

1. Branch from `main` and open a PR — `main` deploys automatically.
2. Run `npm run test:all` before pushing. CI runs the same steps and blocks deploy on failure.

### Guidelines

- **Logic in `src/lib/`** with a unit test; keep components thin.
- **Keep the input screen light:** don't statically import CodeMirror or heavy packages from `App.tsx` or its direct imports. Use `import()` instead.
- **Everything stays client-side.** No network calls that send compared text anywhere.
- **Accessible by default.** Use semantic roles and labels — e2e tests select elements by role and name.

## 🚢 Deploy

Pushes to `main` automatically lint → test → build → e2e → deploy to GitHub Pages via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

On e2e failure, traces are uploaded as the `playwright-results` artifact:
```bash
npx playwright show-trace <trace.zip>
```

## 📜 Roadmap

- [x] Scaffold + Pages deploy
- [x] CodeMirror merge view: split / unified diff
- [x] Syntax highlighting, ignore whitespace/case, text transforms
- [x] Merge, copy, download, export
- [x] History, share links, shortcuts, mobile drawer, lazy-loaded editor
- [x] Unit + e2e tests, performance budget, docs
- [x] Toolbar redesign, ribbons, change map, merge undo, ⌘K palette, mascot
- [ ] Custom domain + SEO
- [ ] File upload (drag & drop files directly)
- [ ] Folder / multi-file diff

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/HiteshGarg098">Hitesh Garg</a>
</p>

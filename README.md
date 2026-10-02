<p align="center">
  <img src="public/favicon.svg" width="80" alt="diffly logo" />
</p>

<h1 align="center">diffly</h1>

<p align="center">
  <strong>A fast, private text compare &amp; merge tool that runs entirely in your browser.</strong><br />
  Free alternative to Diffchecker — your text never leaves your machine.
</p>

<p align="center">
  <a href="https://hiteshgarg098.github.io/diffly/"><strong>🔗 Live Demo</strong></a>&nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="#features">Features</a>&nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="#keyboard-shortcuts">Shortcuts</a>&nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="#develop">Develop</a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/actions/workflow/status/HiteshGarg098/diffly/deploy.yml?branch=main&label=CI%20%2B%20Deploy&style=flat-square" alt="CI status" />
  <img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/CodeMirror-6-d73a49?style=flat-square" alt="CodeMirror 6" />
  <img src="https://img.shields.io/badge/100%25_client--side-no_server-22c55e?style=flat-square" alt="100% client-side" />
  <img src="https://img.shields.io/github/license/HiteshGarg098/diffly?style=flat-square" alt="License" />
</p>

---

## ✨ Features

| | Feature | Details |
|---|---|---|
| 🔒 | **100% Private** | All processing happens in your browser. No server, no tracking, no data sent anywhere. |
| ↔️ | **Split & Unified views** | Toggle between side-by-side and unified diff layouts. |
| 🔀 | **Merge changes** | Cherry-pick individual changes with ← ribbon buttons, take all into either side, or undo merges. |
| 🎨 | **Syntax highlighting** | Auto-detects 20+ languages (JS, TS, Python, Go, Rust, Java, SQL, HTML, CSS, YAML, and more). |
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

Just visit **[hiteshgarg098.github.io/diffly](https://hiteshgarg098.github.io/diffly/)** — no install needed.

1. Paste or drop text into both panes
2. Press **Find difference** (`⌘↵`)
3. Step through changes with **↑ / ↓** or click the change map
4. Merge, export, or share

## ⌨️ Keyboard Shortcuts

| Mac | Windows / Linux | Action |
|---|---|---|
| `⌘↵` | `Ctrl+Enter` | Find difference |
| `F7` / `Shift+F7` | `F7` / `Shift+F7` | Next / previous change |
| `⌘K` | `Ctrl+K` | Command palette |
| `?` | `?` | Keyboard shortcuts help |

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

## 🤝 Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) for setup instructions, architecture guidelines, and the project layout.

In short: branch from `main`, run `npm run test:all` before pushing, open a PR.

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

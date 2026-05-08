# Bookmark Rebalancer

[![CI](https://github.com/sandikodev/bookmark-rebalancer/actions/workflows/ci.yml/badge.svg)](https://github.com/sandikodev/bookmark-rebalancer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.3+-black?logo=bun)](https://bun.sh)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> AI-powered bookmark manager for developers. Save, organize, and rediscover your bookmarks with intelligence.

Bookmark Rebalancer replaces your browser's built-in bookmark manager with a smart, extensible system. It automatically detects GitHub repos, HuggingFace models, arXiv papers, and more — then uses AI to summarize, tag, and help you rediscover what matters.

## Features

- **🌐 Cross-browser Extension** — Chrome, Firefox, Edge (powered by WXT)
- **🤖 AI-Powered** — Smart summarization, auto-tagging, semantic search
- **🔌 Multiple AI Providers** — OpenRouter, NVIDIA NIM, or custom proxy
- **📂 Smart Organization** — Collections, tags, platform detection
- **🔍 Semantic Search** — Find bookmarks by meaning, not just keywords
- **⚡ CLI Tool** — Full control from terminal (`bm`)
- **📦 Self-hosted** — Your data, your control (SQLite)

## Screenshots

> _Screenshots coming soon. In the meantime, check the [extension popup](extension/src/entrypoints/popup/index.html) source._

## Quick Start

### Option A: Run with Docker (recommended)

```bash
docker compose up -d
```

Server starts at `http://localhost:3000`.

### Option B: Run with Bun

```bash
bun install
bun run packages/shared build
bun run backend:dev
```

Server starts at `http://localhost:3000`.

### 2. Configure AI (optional, but recommended)

```bash
export BM_API=http://localhost:3000
bun run cli:dev config set-ai --key sk-... --provider openrouter
```

### 3. Use the CLI

```bash
# Save a bookmark
bun run cli:dev add https://github.com/honojs/hono --tags web,typescript

# AI-powered save (auto-summarize + tag)
bun run cli:dev add https://github.com/honojs/hono --smart

# Semantic search
bun run cli:dev search "fast web framework" --semantic

# List and filter
bun run cli:dev list --platform github
```

### 4. Load the extension

```bash
bun run extension:dev
```

Then load the extension from `extension/.output/chrome-mv3/` in Chrome.

## CLI Reference

```bash
bm add <url> [--tags a,b,c] [--notes "..."] [--collection <id>]
bm add <url> --smart                          # Auto-summarize & tag
bm list [--platform github] [--tag <name>]
bm search <query>                             # Keyword search
bm search <query> --semantic                  # AI semantic search
bm open <id>
bm rm <id>
bm summarize <url|id>
bm smart-tag <url>
bm config show
bm config set-ai --key <key> [--provider ...] [--model ...]
```

## Architecture

```
┌─────────────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Browser Extension   │────▶│  Backend (Hono)  │────▶│   SQLite     │
│  (WXT + TypeScript)  │◀────│  + CLI (Bun)     │◀────│              │
└─────────────────────┘     └────────┬─────────┘     └──────────────┘
                                      │
                                      ▼
                              ┌────────────────┐
                              │  AI Providers   │
                              │ (OpenRouter,    │
                              │  NVIDIA, dll)   │
                              └────────────────┘
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Extension | [WXT](https://wxt.dev) + TypeScript |
| Backend | [Hono](https://hono.dev) + Bun |
| CLI | Bun script |
| Database | SQLite (via `bun:sqlite`) |
| AI | Plugin-based (OpenAI-compatible) |

## Project Status

See [ROADMAP.md](ROADMAP.md) for planned features and milestones.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT — see [LICENSE](LICENSE).

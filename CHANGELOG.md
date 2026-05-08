# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Initial project setup with Bun workspace monorepo
- Backend: Hono API server with SQLite
- CLI: `bm` command-line tool
- Extension: WXT cross-browser extension
- AI Provider system (OpenRouter, NVIDIA NIM, custom)
- Smart summarization and auto-tagging
- Semantic search via embeddings
- Platform detection (GitHub, HF, arXiv, Reddit, HN, Twitter)

### Changed
- Extension popup with "Smart Save" AI feature
- CLI with AI commands (`summarize`, `smart-tag`, `config set-ai`)

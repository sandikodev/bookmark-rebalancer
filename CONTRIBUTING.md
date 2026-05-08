# Contributing

Thank you for considering contributing to Bookmark Rebalancer!

## Development Setup

```bash
# Clone
git clone https://github.com/sandikodev/bookmark-rebalancer.git
cd bookmark-rebalancer

# Install dependencies
bun install

# Build shared package
bun run --cwd packages/shared build

# Start backend (terminal 1)
bun run backend:dev

# Build CLI
bun run cli:build

# Development extension (terminal 2)
bun run extension:dev
```

## Project Structure

```
bookmark-rebalancer/
├── packages/shared/     # Shared types and schemas
├── backend/             # Hono API server + SQLite
├── cli/                 # CLI tool (bm)
├── extension/           # WXT browser extension
```

## Code Style

- TypeScript strict mode
- No semicolons (Prettier default)
- 2-space indentation
- Use `const` over `let`
- Async/await over raw promises

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Run `bun run --cwd backend build` to verify backend builds
4. Run `bun run --cwd extension build` to verify extension builds
5. Update CHANGELOG.md
6. Open a PR with a clear title and description
7. Link related issues

## Commit Messages

Follow conventional commits:
- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `chore: maintenance tasks`

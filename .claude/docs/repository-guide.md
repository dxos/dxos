# Repository Guide

## Setup

```bash
proto install        # Install toolchain (node, pnpm, moon)
pnpm i               # Install dependencies
pnpm build           # Build everything
```

> Always run `pnpm i` and `pnpm build` after switching branches.

## Running Tasks

Tasks are run via `moon`. The pattern is: `moon run <project>:<task>`

### Common dev server commands

| Command | Description |
|---|---|
| `moon run composer-app:serve` | Composer IDE in dev mode |
| `moon run tasks-app:serve` | Tasks app in dev mode |
| `moon run docs:serve` | Docs site in dev mode |
| `moon run storybook:serve` | Storybooks across packages |

### Common build/test commands

| Command | Description |
|---|---|
| `moon run <pkg>:build` | Build a package |
| `moon run <pkg>:test` | Run unit tests for a package |
| `moon run <pkg>:test-watch` | Watch mode tests |
| `moon run <pkg>:lint` | Lint a package |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all unit tests |
| `pnpm watch` | Watch-mode build for whole repo |
| `pnpm lint` | Lint and fix the whole repo |
| `pnpm lint:changed` | Lint only changed packages |

### Useful flags

- `--quiet` — suppress progress output (recommended for agents to keep context lean)
- `--on-failure=continue` — continue other tasks even if some fail

## Pre-CI Check

Before submitting a PR, always run:

```bash
pnpm -w pre-ci
```

This runs formatting, linting, type checks, and tests. Must pass with exit code 0.

## Adding Dependencies

All versions are managed in the pnpm catalog (root `package.json` → `catalog:`):

```bash
pnpm add --filter "<project>" --save-catalog "<package>"
```

Do NOT add versions directly to individual `package.json` files.

## Logging

Use `@dxos/log` for all logging. Never use `console.log` in library code.

Control log output:
- Dev: `LOG_FILTER` env variable (see `packages/apps/composer-app/dx-env.yml`)
- Browser: `localStorage.dxlog='{ "filter": "echo:debug,info"}'`

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Feature integration; all PRs go here |
| `production` | What's in production |
| `staging` | Staging environment |
| `rc-*` | Release candidates |
| `hotfix-*` | Hotfixes from production |

- Feature branches: prefixed with contributor username (e.g. `alice/some-feature`)
- All feature branches are squash-merged to `main`
- PR titles must follow Conventional Commits format

## Code Style Reminders

- Single quotes for strings
- Functional programming, arrow functions preferred
- Import order: builtin → external → `@dxos` → internal → parent → sibling
- Never cast types to fix build errors — plan a refactor instead
- Tests: `module.test.ts` next to the module, use `describe`/`test` (not `it`)
- React: arrow function components, TailwindCSS for styles

## CI

Monitor CI status after pushing:

```bash
pnpm -w gh-action --verify --watch
```

See `.github/workflows/README.md` for CI documentation.

# Repo Structure

This is a pnpm + moon monorepo.

## Top-Level Directories

| Directory | Contents |
|---|---|
| `packages/` | All platform packages |
| `tools/` | Build tooling and repo automation (not part of the platform) |
| `docs/` | Astro docs site (`docs.dxos.org`) |
| `scripts/` | Shell scripts for automation |
| `patches/` | pnpm patches for third-party packages |
| `.moon/` | Moon workspace configuration |
| `.github/` | CI/CD workflows |

## packages/ Breakdown

```
packages/
  apps/         Applications and samples
  sdk/          Public API surface (@dxos/client, @dxos/react-client)
  core/         Core protocol implementations
    echo/       ECHO database packages
    halo/       HALO identity packages
    mesh/       MESH networking packages
  plugins/      Composer plugin packages
  ui/           UI component libraries
  common/       Shared utilities (async, crypto, log, etc.)
  devtools/     dx CLI, inspector, and developer tooling
  gravity/      Load and scenario testing framework
  bots/         Headless agents working with ECHO
  experimental/ Experimental features
  deprecated/   Deprecated packages
  e2e/          End-to-end test packages
```

## Key Applications

| Package name | Path | Description |
|---|---|---|
| `composer-app` | `packages/apps/composer-app` | Main Composer IDE |
| `tasks-app` | `packages/apps/tasks-app` | Tasks sample app |
| `todomvc` | `packages/apps/todomvc` | TodoMVC (E2E test target) |
| `docs` | `docs/` | Documentation site |

## Key SDK Packages

| Package | npm name | Description |
|---|---|---|
| `client` | `@dxos/client` | Main SDK entry point |
| `react-client` | `@dxos/react-client` | React hooks and providers |
| `client-services` | `@dxos/client-services` | Service implementations |
| `config` | `@dxos/config` | Configuration management |
| `schema` | `@dxos/schema` | Data schema tools |
| `shell` | `@dxos/shell` | Shell utilities |

## Configuration Files

| File | Purpose |
|---|---|
| `pnpm-workspace.yaml` | pnpm workspace config |
| `package.json` (root) | Workspace-level scripts and overrides |
| `.moon/workspace.yml` | Moon workspace config |
| `<pkg>/moon.yml` | Per-package task definitions |
| `<pkg>/package.json` | Package deps and metadata |

## Package Naming

- npm scope: `@dxos/<name>`
- moon project name: matches the directory name (e.g. `echo-db`, `composer-app`)
- Run tasks as: `moon run <project-name>:<task>` (e.g. `moon run echo-db:test`)

## Finding Things

- Where is package X? → `packages/**/X/` or search for `"name": "@dxos/X"` in package.json files
- What tasks does package X have? → read `packages/**/X/moon.yml`
- What does `pre-ci` run? → `pnpm -w pre-ci` (defined in root `package.json`)

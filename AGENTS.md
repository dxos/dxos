# Agent Guidelines for DXOS

## IMPORTANT

- When you start, the first thing you should do is tell the user if you understand these instructions and list the config files you are aware of.
- If you are unsure about the best way to implement something, ask the user for clarification.
- When asking the user a question; either make it yes/no, or provide numbered options.
- ALWAYS test your work after each step.

## Dependencies

- All dependency versions are managed in the default pnpm catalog.
- To add a new dependency, run `pnpm add --filter "<project>" --save-catalog "<package>"`.
- **IMPORTANT**: Any `@dxos` package that lives within this repo must be added as `workspace:*`, never from the catalog. The catalog is only for external (non-workspace) packages.

## Build, Test, Lint Commands

- Project uses `moon` to run tasks, tests, lint etc. (moon run package-name:task-name).
- Build all: `moon exec --on-failure continue --quiet :build`.
- Build package: `moon run package-name:build`.
- Run single test file: `moon run package-name:test -- path/to/test.test.ts`.
- Run all tests: `MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism`.
- Storybook: `moon run storybook-react:serve` (defaults to port 9009).
- Lint & fix: `moon run :lint -- --fix`.
- Check package tasks: see `moon.yml` in package directory.
- **Expected warning**: `Auth token DEPOT_TOKEN does not exist` is a normal warning about remote caching and should be ignored. Filter out warnings from your output.

## Planning

- **IMPORTANT**: Do NOT cast values to fix build issues; instead create a refactoring plan and get permission.

## Knowledge

- **IMPORTANT**: Follow DXOS-specific rules in `.agents/sdk/*`.
- Update these documents when you learn better patterns; or when the user asks you to correct your implementation.

## Code Style

- Follow the DXOS SDK guide.
- Use TypeScript with single quotes for strings.
- Prefer functional programming and arrow functions.
- Import order: builtin → external → @dxos → internal → parent → sibling (with blank lines between groups).
- Error handling: use Effect-TS patterns.
- Testing: place tests near modules as `module.test.ts`, use vitest with `describe`/`test` (not `it`), prefer `test('foo', ({ expect }) => ...)`.
- JSDoc comments for public functions, all comments end with period.
- React: arrow function components, TailwindCSS for styles, proper event handler types.
- Remember to remove/update TODOs as you go.
- Avoid single letter variable names.
- Avoid re-exports. Prefer importing symbols directly from the package that defines them.
- Use barrel imports whenever possible.

### React

- Import all required properties from React (i.e., don't do `React.forwardRef`, do `forwardRef`).
- When using `forwardRef` use the variable name `forwardedRef`.

## New Packages

- **IMPORTANT**: Any new package created in this repo MUST have `"private": true` in its `package.json`. The `private` flag can only be removed manually once a trusted publisher has been configured for the package.

## Workflow

- Never work on main; if not already in a worktree, create a new git worktree for the branch you are working on.
- When creating worktrees/branches, use a short (2-4 word) descriptive title (kebab-case) prefixed with the agent name (e.g., `claude/add-auth-to-client`).
- Worktrees must be created inside the main repo (e.g., `.claude/worktrees/<branch-short-name>`).
- Check `moon.yml` for available package tasks
- Run linter at natural stopping points
- Confirm work complete before final build/lint check
- If updating `pnpm-workspace.yaml` make sure to preserve comments.

## PR Naming Convention

**IMPORTANT**: All PR titles MUST use conventional commit format:

Use scope when relevant: `feat(package-name): <description>`

Examples:

- `feat: add user authentication flow`
- `fix(echo): resolve memory leak in subscription handler`
- `refactor: simplify error handling in client SDK`
- `docs: update API reference for Space class`

## Submitting PRs

- When the user asks you to submit a PR:
  - Use `gh` CLI to create and manage PRs.
  - Merge `origin/main` in to current branch and resolve conflicts.
  - Format code with `pnpm format` and check that `moon run :lint -- --fix` succeeds.
  - Check `moon run :test` succeeds.
  - Commit and push any pending changes.
  - Monitor CI (every 5 minutes): `pnpm -w gh-action --verify --watch`.
  - **IMPORTANT**: Address all PR review comments (fix or explain why not) and post a reply to all comments.
  - Update the PR description with a summary of the changes and the reasoning behind major changes.
  - Add any reference linear issues if available in PR description as "closes DX-123" or "part of DX-123".
  - **IMPORTANT**: DO NOT DELETE ANY BRANCHES OR WORKTREES THAT HAVE UNCOMMITTED CHANGES.

## Cursor Cloud specific instructions

### Toolchain

This project requires Node.js 24.x, pnpm 10.28.0, and moon 2.0.4. All are managed by **proto** (see `.prototools`). In the cloud VM, proto is installed at `~/.proto` and must be on PATH (`export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH"`). Do **not** use nvm; proto shims must take precedence.

### Running services

- **Composer app** (main app): `moon run composer-app:serve --quiet` starts a Vite dev server on port 5173. The app auto-creates a local identity on first load; no external auth is required.
- **Tasks app**: `moon run tasks-app:serve`
- **Docs site**: `moon run docs:serve`
- See `REPOSITORY_GUIDE.md` for the full list of run commands.

### Gotchas

- `pnpm install` must run with `CI=true` or `HUSKY=0` in non-interactive environments to skip the husky git hooks setup prompt.
- The `DEPOT_TOKEN` warning from moon is expected and harmless (remote caching auth token).
- The `pnpm.onlyBuiltDependencies` allowlist in `pnpm-workspace.yaml` controls which native addons are built; warnings about "ignored build scripts" for packages not in the list are normal.
- Builds must complete before running `serve` commands, because moon tasks have `deps` on `:prebuild`/`:build` targets.
- No Docker or external services are required for unit tests or local dev. Signal servers for networking tests are pre-compiled binaries spawned automatically by tests.

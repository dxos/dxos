# Agent Guidelines for DXOS

## IMPORTANT

- When you start, the first thing you should do is tell the user if you understand these instructions and list the config files you are aware of.
- ALWAYS test your work after each step.
- If you are unsure about the best way to implement something, ask the user for clarification.
- When asking the user a question; either make it yes/no, or provide numbered options.

## Dependencies

- All dependency versions are managed in the default pnpm catalog.
- To add a new dependency, run `pnpm add --filter "<project>" --save-catalog "<package>"`.

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

## Important

- Do NOT cast values to fix build issues; instead create a refactoring plan and get permission.

## Code Style

- Use TypeScript with single quotes for strings.
- Prefer functional programming and arrow functions.
- Import order: builtin → external → @dxos → internal → parent → sibling (with blank lines between groups).
- Error handling: use Effect-TS patterns.
- Testing: place tests near modules as `module.test.ts`, use vitest with `describe`/`test` (not `it`), prefer `test('foo', ({ expect }) => ...)`.
- JSDoc comments for public functions, all comments end with period.
- React: arrow function components, TailwindCSS for styles, proper event handler types.
- Remember to remove/update TODOs as you go.
- Avoid single letter variable names.

## Workflow

- Never work on main, create a new git worktree for the branch you are working on.
- When creating worktrees/branches, use a short (2-4 word) descriptive title (kebab-case) prefixed with the agent name (e.g. `claude/add-auth-to-client`).
- Check `moon.yml` for available package tasks
- Run linter at natural stopping points
- Confirm work complete before final build/lint check

## PR Naming Convention

**IMPORTANT**: All PR titles MUST use conventional commit format:

- `feat: <description>` - New features or functionality
- `fix: <description>` - Bug fixes
- `refactor: <description>` - Code refactoring without behavior changes
- `docs: <description>` - Documentation changes
- `test: <description>` - Adding or updating tests
- `chore: <description>` - Maintenance tasks, dependency updates
- `perf: <description>` - Performance improvements
- `style: <description>` - Code style/formatting changes
- `ci: <description>` - CI/CD configuration changes
- `build: <description>` - Build system changes

Use scope when relevant: `feat(package-name): <description>`

Examples:
- `feat: add user authentication flow`
- `fix(echo): resolve memory leak in subscription handler`
- `refactor: simplify error handling in client SDK`
- `docs: update API reference for Space class`

## Submitting PRs

- Use `gh` CLI to create and manage PRs
- When the user asks you to submit a PR:
  - commit any pending changes
  - address major PR review comments and reply to all comments
  - `moon run :lint -- --fix` succeeds
  - `moon run :test` succeeds
  - `pnpm -w gh-action --verify --watch` shows green CI
  - Update the PR description with a summary of the changes and the reasoning behind major changes.
  - Add a reference linear issues if available in PR description as "closes DX-123" or "part of DX-123"
- You can monitor the CI status with `pnpm -w gh-action --verify --watch`

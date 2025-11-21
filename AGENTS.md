# Agent Guidelines for DXOS

## Build, Test, Lint Commands

- Project uses `moon` to run tasks, tests, lint etc. (moon run package-name:task-name).
- Build all: `moon :build --quiet --no-bail`
- Build package: `moon run package-name:build`
- Run single test file: `moon run package-name:test -- path/to/test.test.ts`
- Run all tests: `MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism`
- Lint & fix: `moon run :lint -- --fix`
- Check package tasks: see `moon.yml` in package directory

## Code Style

- Use TypeScript with single quotes for strings
- Prefer functional programming and arrow functions
- Use inline type imports: `import { type Foo } from 'bar'`
- Format: max line 120 chars, trailing commas, JSX single quotes
- Import order: builtin → external → @dxos → internal → parent → sibling (with blank lines between groups)
- Error handling: use Effect-TS patterns
- Testing: place tests near modules as `module.test.ts`, use vitest with `describe`/`test` (not `it`), prefer `test('foo', ({ expect }) => ...)`
- JSDoc comments for public functions, all comments end with period
- React: arrow function components, TailwindCSS for styles, proper event handler types
- Remember to remove/update TODOs as you go.

## Workflow

- Never work on main, create a new git worktree for the branch you are working on.
- Check `moon.yml` for available package tasks
- Run linter at natural stopping points
- Use Conventional Commits for PR titles
- Confirm work complete before final build/lint check

## Submitting PRs

- Use `gh` CLI to create and manage PRs
- After you have completed your work, run `pnpm -w pre-ci` to run a series of code-quality checks.
- At the end you can monitor the CI status with `pnpm -w gh-action --verify --watch`
- When the user asks you to submit a PR, make sure that:
  - `pnpm -w pre-ci` passes
  - `pnpm -w gh-action --verify --watch` shows green CI
  - The PR description is up-to-date and has a description of the changes and reasoning behind them.
  - Reference linear issues if available in PR description as "closes DX-123" or "part of DX-123"
- Repeat the process if you made any new code changes
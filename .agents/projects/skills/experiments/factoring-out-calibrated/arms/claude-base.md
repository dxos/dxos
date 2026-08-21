# Agent Guidelines

This monorepo hosts the core packages and the plugins that consume them.
Packages live under `packages/<area>/<name>` and are referenced by their
`package.json` name (`@dxos/util`, `@dxos/display`, ...).

## Build, test, lint

- Build one package: `pnpm --filter <name> build`
- Test one package: `pnpm --filter <name> test`
- Lint and fix: `pnpm lint --fix`
- Format before every commit: `pnpm format`

## Code style

- TypeScript, single quotes, arrow functions, named exports.
- Import order, blank line between groups: builtin, external, @dxos, internal.
- Comments state why the code is necessary, in one clause, ending with a period.
- Prefer ES `#private` over the TypeScript `private` keyword in new code.
- No single-letter variable names. Remove or update TODOs as you touch them.

## Non-negotiables

- **Test after every step.** Never claim work is done without running the
  relevant build or test and showing the result.
- **No casts to silence the type-checker.** `as any`, `as unknown as T`, and
  non-null `!` are not fixes. Fix the type at its source.
- **New packages are private.** Every new package sets `"private": true`.
- **Workspace deps use `workspace:*`.** Any in-repo `@dxos` package is added
  with `workspace:*`, never a version range.
- **Commit nothing silently.** Before any commit, run `git status` and account
  for every modified or untracked file.

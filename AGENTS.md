# Agent Guidelines for DXOS

## Build, Test, Lint Commands

- Build all: `moon :build --quiet --no-bail`
- Build package: `moon run package-name:build`
- Run single test file: `moon run package-name:test -- path/to/test.test.ts`
- Run all tests: `MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism`
- Lint & fix: `moon run package-name:lint -- --fix`
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

## Workflow

- Check `moon.yml` for available package tasks
- Run linter at natural stopping points
- Use Conventional Commits for PR titles
- Confirm work complete before final build/lint check

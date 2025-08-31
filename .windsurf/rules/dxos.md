---
trigger: model_decision
description: Working in the DXOS codebase
---

# DXOS Rules

Key preferences:

- Write in TypeScript by default.
- Prefer functional programming patterns.
- Follow Effect TS best practices for function patterns.
- Follow React best practices and hooks patterns.
- Use TailwindCSS for React styles.
- Unit test examples when relevant.

When writing code:

- Include type definitions.
- Add JSDoc comments for public functions.
- Keep components pure and composable.
- Use proper error handling with Effect.
- Include proper event handler types for React components.
- All comments should be in English and end with a period.

Variable names:

- Use \_ as a prefix if the variable is not used.
- Use $ as a prefix to disambiguate with local variables.

Technologies to consider:

- Use Effect-TS for schema validation.
- Automerge for state management.
- Codemirror v6 for editor integrations.

Monorepo tools:

- moon for monorepo management.
- pnpm for package management.
- vitest
- vite

Testing:

- Place test files near the module they test with "module_name.test.ts" format.
- Use vitest with `describe` and `test` apis (don't use `it`).
- Don't write tests at top-level, instead make sure they are wrapped in a `describe` block.
- Prefer importing `expect` from test context: `test('foo', ({ expect }) => ...)`

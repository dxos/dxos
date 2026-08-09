---
name: no-casts
title: No casts to silence the type-checker
scope: repo
files:
  - 'packages/**/*.ts'
  - 'packages/**/*.tsx'
grep: as any|as unknown|[^!=]![.\[]
severity: error
---

Casts that suppress the type system are not fixes — they hide the real type
error. Flag `as any`, `as unknown as T` (the double-cast escape hatch), widened
`any` in signatures, and the non-null assertion `!` (as in `foo!.bar` or
`arr![0]`). Fix the type at its source instead.

`as const` is allowed — do not flag it. The `_private` and `!` inside string
literals or comments are not casts — only flag real type-level assertions.

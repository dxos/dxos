---
name: dxos-code-style
description: >-
  DXOS TypeScript authoring conventions. Use when writing or refactoring code —
  namespace-export packages, internal module imports, class member ordering,
  options-bag types, function overloads, the no-cast rule, and test structure.
---

# DXOS Code Style

Authoring conventions for the DXOS monorepo. The always-on subset lives in
`AGENTS.md`; this skill holds the detail. Use `@dxos/echo` as the reference
implementation for the namespace-export pattern.

## Casts — fix the type at its source

Do NOT cast to silence a build error; fix the type where it originates.

- "Cast" means `as T`, `as any`, `as unknown as T`, non-null `!`, or a widened /
  `any` signature added to silence a type error. `as const` is NOT a cast — it
  narrows a literal rather than bypassing the checker, and is always acceptable
  (no comment or justification needed).
- Default: fix the type at its source (inference, signature, generic), not the
  call site that surfaced the error. A red typecheck during a refactor is a
  finding, not an obstacle to paper over.
- Casts are only acceptable at genuine type-system boundaries (external / untyped
  data, deliberate coercions), and must carry a concise comment saying why no
  typed alternative exists.
- **Before every commit/PR**, audit your diff for new casts:
  `git diff origin/main | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'`.
  Justify or remove each; do not defer to review.
- Casts accumulate fastest during large codemods — treat each as a deliberate
  decision, never an autopilot stopgap.
- Use @dxos/util `trim` to create multi-line strings (e.g., prompts).

## Namespace-export packages

Packages are increasingly organized as namespace exports. Modules have
capital-case names and are re-exported as namespaces:

```text
src/
  Foo.ts
  Bar.ts
  errors.ts
  index.ts
  testing/
    index.ts
  internal/
    foo.ts
    bar.ts
    baz.ts
```

```ts
// index.ts
export * as Foo from './Foo';
export * as Bar from './Bar';
export * from './errors';
```

```ts
// Foo.ts

// @import-as-namespace
export const one = 1;
export const two = 2;
export const func: {
  (a: string): number;
  (a: number): string;
} = (a) => {
  return a;
};
```

- The `@import-as-namespace` linter directive marks a file as a namespace export.
- Internal code is hidden in `internal/`, which is not exported.
- `testing/` and `errors.ts` are the exceptions (exported directly).
- For a namespace file, avoid prefixing top-level types with the namespace name —
  inside `Foo.ts` prefer `Manager`, `Service`, `Options` over `FooManager`,
  `FooService`, `FooOptions` (callers see `Foo.Manager` either way).

### Internal module imports

For `@dxos/echo`-style entrypoints importing `src/internal/<Module>/`: import the
capitalized internal barrel as a lowercase `*Internal` namespace —
`import * as objInternal from './internal/Obj'`,
`import * as queryInternal from './internal/Query'`. Do not deep-import
submodules (`./internal/Obj/atoms`, `./internal/Ref/ref`, etc.); re-export needed
symbols from the module's `index.ts` instead. The top-level `./internal` barrel is
for cross-cutting re-exports only — prefer the per-module barrel when a single
entrypoint owns the dependency. Atom factories inside internal modules use the
`makeAtom` name (not `make`) to avoid clashing with public `make` APIs.

## Types and signatures

- Common suffix for constructor option-bag types is `Options` (e.g.
  `SpawnOptions`, `ManagerImplOptions`) — pick this over `Opts` / `Props` /
  `Config`.
- Keep React component Props types immediately before the component function.
- Take an options object when a constructor or function has more than a few
  readonly props, especially when several are optional or share a logical group.
- For exported functions with multiple overloads, declare them as `const` with
  the overload signatures inline in the type annotation rather than
  `export function` with repeated declarations:
  ```ts
  export const myFn: {
    <T extends Foo>(a: T): Bar<T>;
    (a: string): Bar<any>;
  } = (a): Bar<unknown> => { ... };
  ```

## Class member ordering

Consider: static fields → public readonly → public mutable → private readonly
(incl. constructor-injected) → private mutable → constructor → public methods →
private methods. Within each group, rank properties roughly most-important to
least — "further up the stack" (closer to public API), required over optional,
readonly over mutable.

## Testing

- Place tests near modules as `module.test.ts`. Use vitest with `describe` /
  `test` (not `it`); prefer `test('foo', ({ expect }) => ...)`.
- **Prefer extending existing test suites over creating new ones.** Look for a
  suite that already covers the area before adding a file. A small number of
  cohesive suites beats many fragmented ones.
- **Test at the level that is naturally the public API.** Exercise the seam
  consumers actually use (exported surface, a service/manager's public methods),
  not private internals. This keeps tests resilient to refactors and documents
  real usage.
- Prefer a unified `TestLayer` for all tests rather than one per test.
  `TestLayer(opts?)` can be parametrized so tests configure it.
- Place test layer, configuration, and main definitions at the top of the suite;
  helpers at the bottom.
- Avoid sleep and polling. Use events and `TestClock` instead.

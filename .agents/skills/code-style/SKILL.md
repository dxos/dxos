---
name: dxos-code-style
description: >-
  DXOS TypeScript authoring conventions. Use when writing or refactoring code —
  namespace-export packages, internal module imports, class member ordering,
  options-bag types, function overloads, the no-cast rule, the comment rule
  (say why, once), and test structure.
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

## Comments — say why, once

A comment earns its place by stating the _why_ the code can't — the constraint,
the non-obvious consequence, the reason a reader would otherwise "fix" it wrong.
The code already says _what_ it does; a comment that restates that is noise.

- **One load-bearing clause.** Not a multi-sentence essay. If you're explaining a
  mechanism, state the constraint in a sentence and stop — resist narrating each
  step, the alternatives you rejected, or how it used to work. This applies
  hardest to JSDoc on a new abstraction, where the instinct to over-explain peaks.
- **Line-count is itself a signal.** If a comment runs past ~2 lines, that length
  is almost never buying explanatory power proportional to its size — it's
  restating what a competent reader already infers from the code, the variable
  names, or the fact that it's test/fixture scaffolding. Compress to the one
  clause a reader couldn't get any other way, or delete outright. A correct but
  low-stakes "why" (this is a toolkit stub, this layer is a noop) does not
  justify three sentences of scene-setting — the reader can see it's a stub.
- Test/fixture code gets a **lower** comment bar, not a higher one: "this is a
  minimal/fake X for testing Y" is exactly what the surrounding `describe`
  block, filename, and variable names (`TestToolkit`, `*LayerNoop`,
  `scripted*`) already communicate — restating it in prose adds nothing.
- Never narrate history or the conversation ("previously X, now Y", "as
  requested", "changed to…"). State the current invariant as if it always was.
- Delete a comment that a competent reader gets from the code itself. Prefer a
  clearer name or signature over a comment that compensates for an unclear one.
- End with a period. JSDoc public functions.
- **Before every commit/PR**, audit the comments in your diff:
  `git diff origin/main | grep -nE '^\+\s*(//|\*|/\*)'`. Re-read each added line
  and cut it to its load-bearing clause — or delete it. A verbose comment is the
  autopilot default; conciseness is the deliberate pass. Do not defer to review.
  **A comment that survives your own audit deserves a second look** — try
  deleting it first, and keep only words that don't come back on their own
  from re-reading the code.

```ts
// ✅ why the code can't be the obvious thing, in one clause:
// Seeded across an identity change so the view refreshes in place, not to empty.

// ❌ restates the code / multi-sentence narration / history:
// Set displayItems to initialItems if it has items, otherwise the empty array.
// We used to reset here but that flashed empty, so now we hold the previous page
// and only replace it once the new query delivers its own results, which means…

// ❌ correct but over-explained test scaffolding — the name/context already says this:
// A minimal echo tool: the deterministic developer code the loop invokes when the
// (scripted) model emits a tool call. Its handler runs for real, so a genuine
// tool-call → result → continue cycle is exercised without any live model.
const TestToolkit = Toolkit.make(Tool.make('Echo', { ... }));

// ✅ same fact, one clause, or just delete it and let the name carry it:
// Real handler, so tool-call → result → continue is a genuine cycle, not a mock.
const TestToolkit = Toolkit.make(Tool.make('Echo', { ... }));
```

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

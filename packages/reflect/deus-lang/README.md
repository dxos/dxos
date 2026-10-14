# @dxos/deus-lang

DEUS is a functional language with Lean's syntax, Unison's content-addressed codebase and
user-defined algebraic effects, theorems checked at stated levels of evidence, and IRI-named
types. Its compiler, CLI and codebase manager are written in DEUS.

```text
deus/*.deus  ──compile (the seed runs the compiler)──▶  seed/deus.image  ──run──▶  src/kernel (TypeScript)
```

- `deus/` — the toolchain, in DEUS: lexer, parser, resolver, hasher, codebase store, CLI.
- `seed/deus.image` — the compiled image of the toolchain. Compiling `deus/` with it must
  reproduce it byte for byte (`src/seed.test.ts`).
- `src/kernel/` — the only TypeScript: a CEK machine for [Core](./docs/CORE.md), primitives and
  host IO.

## Use

```bash
node bin/deus.mjs compile deus --main Cli.main -o out.seed   # the compiler compiling itself
node bin/deus.mjs build Cli.main -o deus                     # the CLI as a standalone executable
```

## Examples

- [`examples/sort.deus`](./examples/sort.deus) — insertion sort with a specification and formal
  proofs that it sorts and permutes.
- [`examples/soundness.deus`](./examples/soundness.deus) — claims the prover must refuse.
- [`editors/vscode/`](./editors/vscode) — syntax highlighting for VS Code and TextMate renderers.

## Docs

- [`docs/USER.md`](./docs/USER.md) — the user's requirements, verbatim. The golden standard.
- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — the decision log.
- [`docs/TIMELINE.md`](./docs/TIMELINE.md) — each stage with the wall time it took.
- [`docs/DESIGN.md`](./docs/DESIGN.md) — the language and the toolchain.
- [`docs/CORE.md`](./docs/CORE.md) — the Core IR, object and image formats.
- [`docs/PRIOR-ART.md`](./docs/PRIOR-ART.md) — what was taken from Unison, Lean, Koka, Effect-TS and others.
- [`docs/PROPOSALS.md`](./docs/PROPOSALS.md) — the user's proposals, evaluated against alternatives.
- [`docs/LLM.md`](./docs/LLM.md) — how an agent drives the CLI.

## Changing the compiler

1. Edit `deus/`.
2. `moon run deus-lang:self-build` (or `node bin/deus.mjs compile deus --main Cli.main -o seed/deus.image`).
3. Run it again: the second run must not change `seed/deus.image`.
4. To use new syntax inside `deus/`, first land the compiler change and a rebuilt seed.

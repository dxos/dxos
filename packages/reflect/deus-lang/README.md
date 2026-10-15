# @dxos/deus-lang

DEUS is a functional language with Lean's syntax, Unison's content-addressed codebase and
user-defined algebraic effects, theorems checked at stated levels of evidence, and IRI-named
types. Its compiler, CLI and codebase manager are written in DEUS.

```text
deus/*.deus  ──compile (the seed runs the compiler)──▶  seed/deus.image  ──run──▶  src/kernel (TypeScript)
```

- `deus/` — the toolchain, in DEUS: lexer, parser, resolver, type checker, prover, hasher,
  codebase store, projects, replication, MDL, the wasm compiler and the CLI.
- `seed/deus.image` — the compiled image of the toolchain. Compiling `deus/` with it must
  reproduce it byte for byte (`src/seed.test.ts`).
- `src/kernel/` — the only TypeScript: a CEK machine for [Core](./docs/spec/CORE.md), primitives and
  host IO.

## Use

```bash
node bin/deus.mjs compile deus --main Cli.main -o out.seed   # the compiler compiling itself
node bin/deus.mjs build Cli.main -o deus --native            # the CLI as a 1.6 MB executable
node bin/deus.mjs build Notes.serve -o out --worker          # a web handler as a Cloudflare Worker
node bin/deus.mjs build Notes.serve -o notes --server        # …or as a standalone native server
node bin/deus.mjs build gcd -o gcd.wasm --wasm               # first-order code compiled to wasm
node bin/deus.mjs bindings Geometry -o out                    # a JS module + .d.ts calling those functions
```

A session in a codebase:

```bash
deus init && deus project init https://example.org/app      # a project, named by an IRI
deus lib install std ../std                                  # a pinned release under lib.std
deus add src/ --by agent-x                                   # .deus files and .mdl specs
deus test && deus check && deus mdl                          # tests, theorems, spec blocks
deus remote add origin r2://agent-artifacts/deus/app         # or a directory
deus push && deus pull && deus compact                       # immutable bundles, compacted
deus task new Sort is not stable --link List.sort            # issues attached to definitions
deus update fix.deus --closes 3f2a                           # …closed by the change that fixes them
deus eval 'List.map Workspace.view (Workspace.names "Sort.")'  # script reads and edits in DEUS (D138)
deus artifact App.bundle --out bundle.js                     # an @[artifact] constant, evaluated once (D148)
deus embed page.html --as Site.page                          # a file kept in the codebase, not in git (D150)
deus explore                                                 # browse the codebase on :8080
deus explore --publish origin                                # …or host it beside the bundles
deus export codebase                                         # the codebase as text, for git (D64)
```

New here? [`docs/GETTING_STARTED.md`](./docs/GETTING_STARTED.md) installs the toolchain and walks through
recipes for the language, proofs, HTTP and Cloudflare. `deus help` lists every command;
[`docs/LLM.md`](./docs/LLM.md) is the agent's guide.

## The toolchain's own codebase

[`codebase/`](./codebase) is a text export (D64) of the codebase this toolchain is developed in.
That codebase holds its tasks, history and source. It is pushed to R2, where the explorer shows it:
<https://pub-39066a86073446d7b77b1c157b660bb5.r2.dev/deus/explorer-demo/site/index.html>.

## Examples

- [`examples/tour.deus`](./examples/tour.deus) — a tour of the language: data, records, abilities
  and handlers, checked errors, tests.
- [`examples/sort.deus`](./examples/sort.deus) — insertion sort with a specification and formal
  proofs that it sorts and permutes.
- [`examples/soundness.deus`](./examples/soundness.deus) — claims the prover must refuse.
- [`examples/counter.deus`](./examples/counter.deus) — a Durable Object, tested in
  simulation and served on local workerd (`scripts/worker-test.sh`); the platform's ontology is
  [`platform/web.deus`](./platform/web.deus).
- [`examples/notes.deus`](./examples/notes.deus) — an HTTP notes service, run unchanged in
  simulation, as a native server (`deus serve`) and on Cloudflare.
- [`examples/tally.deus`](./examples/tally.deus) — Durable Objects that call each other by name and
  set alarms, simulated deterministically and served on workerd.
- [`examples/perf.mdl`](./examples/perf.mdl) — performance requirements on the sort, checked by
  the `perf` extension ([`platform/perf.deus`](./platform/perf.deus)) in machine steps.
- [`examples/react/`](./examples/react) — a React todo app written in DEUS and compiled with
  `deus build --js` ([D97](./docs/DECISIONS.md), [JsGen.Spec](./codebase/specs/JsGen.Spec.mdl)); the bindings are
  [`platform/js/js.deus`](./platform/js/js.deus) and [`platform/js/react.deus`](./platform/js/react.deus).
- [`examples/composer/`](./examples/composer) — a Composer plugin written in DEUS ([D106](./docs/DECISIONS.md)): a small
  codebase explorer with ECHO pins and assistant tools, on the bindings in
  [`platform/js/composer.deus`](./platform/js/composer.deus). `build.sh` builds it; Composer loads its `manifest.json` by URL.
- [`editors/vscode/`](./editors/vscode) — syntax highlighting for VS Code and TextMate renderers.

## Docs

- [`docs/USER.md`](./docs/USER.md) — the user's requirements, verbatim. The golden standard.
- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — the decision log.
- [`docs/TIMELINE.md`](./docs/TIMELINE.md) — each stage with the wall time it took.
- [`docs/DESIGN.md`](./docs/DESIGN.md) — the language and the toolchain.
- [`docs/spec/`](./docs/spec/README.md) — one specification per format: the language, Core, images, the codebase
  (store, text export, binary bundles), MDL and the rest.
- [`docs/PRIOR-ART.md`](./docs/PRIOR-ART.md) — what was taken from Unison, Lean, Koka, Effect-TS and others.
- [`docs/PROPOSALS.md`](./docs/PROPOSALS.md) — the user's proposals, evaluated against alternatives.
- [`docs/IMMUTABILITY.md`](./docs/IMMUTABILITY.md) — does immutability make DEUS slow? A sorting case study (D83), and the pure `Array` that compiled code updates in place (spec in the codebase as [`Array.Spec`](./codebase/specs/Array.Spec.mdl), D96).
- [`docs/LLM.md`](./docs/LLM.md) — how an agent drives the CLI.

## Changing the compiler

1. Edit `deus/`, then `node bin/deus.mjs update deus` to bring the change into the codebase.
2. `node bin/deus.mjs image Cli.main -o seed/deus.image` writes the new seed from the codebase in about
   3 s, the same bytes as compiling `deus/` with it.
3. Check the fixpoint once before you commit: `moon run deus-lang:self-build` (or
   `node bin/deus.mjs compile deus --main Cli.main -o seed/deus.image`) must not change `seed/deus.image`.
   `src/seed.test.ts` checks it in CI too.
4. `node bin/deus.mjs export codebase`, so the export in git matches `deus/`.
5. To use new syntax inside `deus/`, first land the compiler change and a rebuilt seed.

## Running the tests in a fresh container

`bash scripts/setup.sh` installs the Rust toolchain that `../deus-kernel/rust-toolchain.toml` pins,
with its wasm targets, and this package's `node_modules`. `src/preflight.test.ts` fails first and
names anything that is still missing, so a native, browser or bindings test does not fail later for
that reason.

`scripts/vitest.config.mjs` runs the package's suite alone, with a worker per core (it is
CPU-bound, and vitest's default leaves one idle):

```sh
npx vitest run --config scripts/vitest.config.mjs                         # 82 s on 4 cores
npx vitest run --config scripts/vitest.config.mjs src/restore.test.ts     # one file
```

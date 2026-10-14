# DEUS format specifications

One file per format DEUS reads or writes. Each says who writes the format, who reads it, and enough for an
independent implementation. Where a spec and the code disagree, the code in [`deus/`](../../deus) and
[`src/kernel/`](../../src/kernel) is right and the spec is a bug.

| Spec                                   | Format                                                                                 |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| [LANGUAGE.md](./LANGUAGE.md)           | `.deus` source: lexical structure, layout, grammar, static and dynamic semantics       |
| [DIALECT-TS.md](./DIALECT-TS.md)       | The TypeScript-like dialect `deus view --dialect ts` and the explorer print            |
| [CORE.md](./CORE.md)                   | Core IR: canonical S-expressions, terms, patterns, objects, hashing                    |
| [IMAGE.md](./IMAGE.md)                 | Images (`seed/deus.image`) and the executables that carry one                          |
| [CODEBASE-STORE.md](./CODEBASE-STORE.md) | The codebase directory (`~/.deus`): objects, metadata, branches, layers, tasks        |
| [CODEBASE-STORE.mdl](./CODEBASE-STORE.mdl) | Checked spec of the store: requirements, APIs and laws, with their evidence     |
| [CODEBASE-TEXT.md](./CODEBASE-TEXT.md) | The text export written by `deus export` and kept in git                               |
| [CODEBASE-TEXT.mdl](./CODEBASE-TEXT.mdl) | Checked spec of the export: restoring gives back the same codebase                |
| [COMPILE.mdl](./COMPILE.mdl)           | Checked spec of the compiler: hashes follow meaning, printing compiles back          |
| [CODEBASE-BINARY.md](./CODEBASE-BINARY.md) | Replication bundles: naming, contents, the `DEUSCOL1` columnar encoding, gzip      |
| [MDL.md](./MDL.md)                     | `.mdl` documents as DEUS reads them: spec blocks and extensions                        |
| [EMBEDDING.md](./EMBEDDING.md)         | The embeddable wasm kernel's ABI and its JSON protocol                                 |
| [BINDINGS.mdl](./BINDINGS.mdl)         | `deus bindings`: requirements, the TypeScript API, the mapping, and theorems           |
| [JS.mdl](./JS.mdl)                     | The JavaScript back end: values, handlers, `Js.import` bindings, source maps     |
| [WASM.md](./WASM.md)                   | Modules emitted by the DEUS wasm compiler                                              |
| [NATIVE.md](./NATIVE.md)               | C emitted by the DEUS C compiler, benchmarks of every back end, and the native roadmap |
| [EXPLORER.md](./EXPLORER.md)           | The explorer's JSON data files and site layout                                         |
| [EXPLORER.mdl](./EXPLORER.mdl)         | Checked spec of the explorer's files                                                   |
| [CLI-JSON.md](./CLI-JSON.md)           | `deus … --json` output and exit codes                                                  |
| [OBSERVABILITY.md](./OBSERVABILITY.md) | Log, trace and metric output: NDJSON and OTLP JSON lines                               |

How they fit together: source ([LANGUAGE](./LANGUAGE.md)) compiles to [Core](./CORE.md); Core objects live
in the [store](./CODEBASE-STORE.md); the store is backed up as [text](./CODEBASE-TEXT.md) and replicated as
[bundles](./CODEBASE-BINARY.md); the closure of one definition is an [image](./IMAGE.md), which a kernel runs.

## Known divergences

Writing the specs against the code found these. Each is also marked with a "Note:" in its spec. Until one
is fixed, the spec describes what the code does.

Bugs:

- Type ascriptions (`(e : T)`, `let x : T := …`) are erased before checking, and a row written on a
  definition with no binders is not checked ([LANGUAGE.md](./LANGUAGE.md#static-semantics)).

Docs that disagree with the code:

- `Codebase.layers` says `results` and `provenance` replicate; bundles carry only objects and metadata.
- D51 and `deus help` say the wasm compiler is first-order `Int`/`Bool`; it handles data since D56.
- D62 lists four explorer JSON kinds; the explorer also writes `change/<causal>.json`.
- D63 says `deus view` keeps lines within 100 columns; only some forms break.
- D31 says spans identify code by hash; only defect traces carry hashes.
- LLM.md says `--json` works on any command; `compile`, `image`, `run`, `serve` and `help` ignore it.
- GETTING_STARTED.md says a `match` must cover every case; nothing checks exhaustiveness, and a missed
  case is a defect at run time.
- The header comments of [`deus/codebase.deus`](../../deus/codebase.deus) (a top-level `tasks` entry) and
  [`deus/image.deus`](../../deus/image.deus) (no nominal lines) are stale.

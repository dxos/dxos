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
| [CHECKING.mdl](./CHECKING.mdl)         | checked ascriptions and rows: requirements, checker rules, and theorems                |
| [JS.mdl](./JS.mdl)                     | The JavaScript back end: values, handlers, `Js.import` bindings, source maps     |
| [WASM-EQUALITY.mdl](./WASM-EQUALITY.mdl) | `==` on data in the wasm back end: requirements, layout of the equality functions, theorems |
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

Bugs: none open.

Docs that disagree with the code: none open.

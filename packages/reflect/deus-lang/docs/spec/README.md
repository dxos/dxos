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
| [Codebase.Spec](../../codebase/specs/Codebase.Spec.mdl) | Checked spec of the store: requirements, APIs and laws, with their evidence     |
| [CODEBASE-TEXT.md](./CODEBASE-TEXT.md) | The text export written by `deus export` and kept in git                               |
| [Export.Spec](../../codebase/specs/Export.Spec.mdl) | Checked spec of the export: restoring gives back the same codebase                |
| [Compile.Spec](../../codebase/specs/Compile.Spec.mdl)           | Checked spec of the compiler: hashes follow meaning, printing compiles back          |
| [CODEBASE-BINARY.md](./CODEBASE-BINARY.md) | Replication bundles: naming, contents, the `DEUSCOL1` columnar encoding, gzip      |
| [MDL.md](./MDL.md)                     | `.mdl` documents as DEUS reads them: spec blocks and extensions                        |
| [EMBEDDING.md](./EMBEDDING.md)         | The embeddable wasm kernel's ABI and its JSON protocol                                 |
| [Bindings.Spec](../../codebase/specs/Bindings.Spec.mdl)         | `deus bindings`: requirements, the TypeScript API, the mapping, and theorems           |
| [Checking.Spec](../../codebase/specs/Checking.Spec.mdl)         | checked ascriptions and rows: requirements, checker rules, and theorems                |
| [JsGen.Spec](../../codebase/specs/JsGen.Spec.mdl)                  | The JavaScript back end: values, handlers, `Js.import` bindings, source maps     |
| [View.Spec](../../codebase/specs/View.Spec.mdl) | What `deus view` prints for theorems and header types |
| [WasmEquality.Spec](../../codebase/specs/WasmEquality.Spec.mdl) | `==` on data in the wasm back end: requirements, layout of the equality functions, theorems |
| [Features.Spec](../../codebase/specs/Features.Spec.mdl) | Feature maps: `feature` blocks, what `deus mdl` checks in them, and the tree `deus features` prints |
| [Toolchain.Features](../../codebase/specs/Toolchain.Features.mdl) | The toolchain's own feature map |
| [Coverage.Spec](../../codebase/specs/Coverage.Spec.mdl) | What `deus mdl --coverage` reports: laws no block cites, public definitions no api names |
| [Replicate.Spec](../../codebase/specs/Replicate.Spec.mdl) | How metadata replicates: per-commit metadata snapshots, applied on fast-forward and merged hash by hash |
| [Testing.Spec](../../codebase/specs/Testing.Spec.mdl) | Tested theorems with custom generators: `by test N using g` |
| [Workspace.Spec](../../codebase/specs/Workspace.Spec.mdl) | The codebase as an ability under `deus eval`: names, view, update, run |
| [Image.Spec](../../codebase/specs/Image.Spec.mdl) | Checked spec of images: the closure of an entry point, its type lines and main line |
| [Tasks.Spec](../../codebase/specs/Tasks.Spec.mdl) | Checked spec of the task model: stored text, fields, ids, order, parents |
| [Parser.Spec](../../codebase/specs/Parser.Spec.mdl) | Checked spec of the lexer and parser: precedence, spellings, literals, comments, layout, error positions |
| [WASM.md](./WASM.md)                   | Modules emitted by the DEUS wasm compiler                                              |
| [NATIVE.md](./NATIVE.md)               | C emitted by the DEUS C compiler, benchmarks of every back end, and the native roadmap |
| [EXPLORER.md](./EXPLORER.md)           | The explorer's JSON data files and site layout                                         |
| [Explorer.Spec](../../codebase/specs/Explorer.Spec.mdl)         | Checked spec of the explorer's files                                                   |
| [CLI-JSON.md](./CLI-JSON.md)           | `deus … --json` output and exit codes                                                  |
| [OBSERVABILITY.md](./OBSERVABILITY.md) | Log, trace and metric output: NDJSON and OTLP JSON lines                               |

The checked specs (`Codebase.Spec`, `Compile.Spec` and the other `*.Spec` rows) live in the codebase, not
in this directory ([D99](../DECISIONS.md)): `deus view Compile.Spec` prints one, `deus mdl Compile.Spec` checks it,
and the links go to the copies `deus export` writes to [`codebase/specs/`](../../codebase/specs).

How they fit together: source ([LANGUAGE](./LANGUAGE.md)) compiles to [Core](./CORE.md); Core objects live
in the [store](./CODEBASE-STORE.md); the store is backed up as [text](./CODEBASE-TEXT.md) and replicated as
[bundles](./CODEBASE-BINARY.md); the closure of one definition is an [image](./IMAGE.md), which a kernel runs.

## Known divergences

Writing the specs against the code found these. Each is also marked with a "Note:" in its spec. Until one
is fixed, the spec describes what the code does.

Bugs: none open.

Docs that disagree with the code: none open.

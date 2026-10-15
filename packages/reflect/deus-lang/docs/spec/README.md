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
| [Codebase.Spec](https://deus.dmytro-a80.workers.dev/#n:Codebase.Spec) | Checked spec of the store: requirements, APIs and laws, with their evidence     |
| [CODEBASE-TEXT.md](./CODEBASE-TEXT.md) | The text export written by `deus export` and kept in git                               |
| [Export.Spec](https://deus.dmytro-a80.workers.dev/#n:Export.Spec) | Checked spec of the export: restoring gives back the same codebase                |
| [Compile.Spec](https://deus.dmytro-a80.workers.dev/#n:Compile.Spec)           | Checked spec of the compiler: hashes follow meaning, printing compiles back          |
| [CODEBASE-BINARY.md](./CODEBASE-BINARY.md) | Replication bundles: naming, contents, the `DEUSCOL1` columnar encoding, gzip      |
| [MDL.md](./MDL.md)                     | `.mdl` documents as DEUS reads them: spec blocks and extensions                        |
| [EMBEDDING.md](./EMBEDDING.md)         | The embeddable wasm kernel's ABI and its JSON protocol                                 |
| [Bindings.Spec](https://deus.dmytro-a80.workers.dev/#n:Bindings.Spec)         | `deus bindings`: requirements, the TypeScript API, the mapping, and theorems           |
| [Checking.Spec](https://deus.dmytro-a80.workers.dev/#n:Checking.Spec)         | checked ascriptions and rows: requirements, checker rules, and theorems                |
| [JsGen.Spec](https://deus.dmytro-a80.workers.dev/#n:JsGen.Spec)                  | The JavaScript back end: values, handlers, `Js.import` bindings, source maps     |
| [View.Spec](https://deus.dmytro-a80.workers.dev/#n:View.Spec) | What `deus view` prints for theorems and header types |
| [WasmEquality.Spec](https://deus.dmytro-a80.workers.dev/#n:WasmEquality.Spec) | `==` on data in the wasm back end: requirements, layout of the equality functions, theorems |
| [Features.Spec](https://deus.dmytro-a80.workers.dev/#n:Features.Spec) | Feature maps: `feature` blocks, what `deus mdl` checks in them, and the tree `deus features` prints |
| [Toolchain.Features](https://deus.dmytro-a80.workers.dev/#n:Toolchain.Features) | The toolchain's own feature map |
| [Coverage.Spec](https://deus.dmytro-a80.workers.dev/#n:Coverage.Spec) | What `deus mdl --coverage` reports: laws no block cites, public definitions no api names |
| [Replicate.Spec](https://deus.dmytro-a80.workers.dev/#n:Replicate.Spec) | How metadata replicates: per-commit metadata snapshots, applied on fast-forward and merged hash by hash |
| [Testing.Spec](https://deus.dmytro-a80.workers.dev/#n:Testing.Spec) | Tested theorems with custom generators: `by test N using g` |
| [Prove.Spec](https://deus.dmytro-a80.workers.dev/#n:Prove.Spec) | Theorems by `decide`, `sorry` and the tactics; arithmetic in the 32-bit Int ring |
| [Workspace.Spec](https://deus.dmytro-a80.workers.dev/#n:Workspace.Spec) | The codebase as an ability under `deus eval`: names, view, update, run |
| [Artifact.Spec](https://deus.dmytro-a80.workers.dev/#n:Artifact.Spec) | `@[artifact]` constants: evaluated once, kept by hash, used by run, image, build and serve; files embedded by hash |
| [Image.Spec](https://deus.dmytro-a80.workers.dev/#n:Image.Spec) | Checked spec of images: the closure of an entry point, its type lines and main line |
| [Tasks.Spec](https://deus.dmytro-a80.workers.dev/#n:Tasks.Spec) | Checked spec of the task model: stored text, fields, ids, order, parents |
| [Parser.Spec](https://deus.dmytro-a80.workers.dev/#n:Parser.Spec) | Checked spec of the lexer and parser: precedence, spellings, literals, comments, layout, error positions |
| [WASM.md](./WASM.md)                   | Modules emitted by the DEUS wasm compiler                                              |
| [NATIVE.md](./NATIVE.md)               | C emitted by the DEUS C compiler, benchmarks of every back end, and the native roadmap |
| [EXPLORER.md](./EXPLORER.md)           | The explorer's JSON data files and site layout                                         |
| [Explorer.Spec](https://deus.dmytro-a80.workers.dev/#n:Explorer.Spec)         | Checked spec of the explorer's files                                                   |
| [CLI-JSON.md](./CLI-JSON.md)           | `deus … --json` output and exit codes                                                  |
| [OBSERVABILITY.md](./OBSERVABILITY.md) | Log, trace and metric output: NDJSON and OTLP JSON lines                               |

The checked specs (`Codebase.Spec`, `Compile.Spec` and the other `*.Spec` rows) live in the codebase, not
in this directory ([D99](../DECISIONS.md)): `deus view Compile.Spec` prints one, `deus mdl Compile.Spec` checks it,
and the links open them in the [explorer](https://deus.dmytro-a80.workers.dev/).

How they fit together: source ([LANGUAGE](./LANGUAGE.md)) compiles to [Core](./CORE.md); Core objects live
in the [store](./CODEBASE-STORE.md); the store is backed up as [text](./CODEBASE-TEXT.md) and replicated as
[bundles](./CODEBASE-BINARY.md); the closure of one definition is an [image](./IMAGE.md), which a kernel runs.

## Known divergences

Writing the specs against the code found these. Each is also marked with a "Note:" in its spec. Until one
is fixed, the spec describes what the code does.

Bugs: none open.

Docs that disagree with the code: none open.

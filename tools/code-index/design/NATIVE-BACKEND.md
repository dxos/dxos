# Native backend: one Rust library for the quad store and the rules

`tools/code-index-native` is the store behind `Store`: oxigraph (RocksDB) for the quads and SPARQL,
and a purpose-built N3 engine that runs against the same indexes, loaded into the Bun or Node
process as a Node-API addon. It is the only backend. A store records the backend that wrote it
beside the ontology version; a store stamped otherwise (the retired `js` backend) or not at all is
emptied by a writer, which reindexes it, and refused by a reader with a request to run
`code-index index`.

## Why

Two costs dominate an indexing pass, and both are structural:

1. **Commit.** Every quad lands in six indexes; doing that from JavaScript one file at a time costs
   more as the store grows. A native store bulk-loads a commit off the event loop.
2. **Reason.** Handing the facts to an external reasoner means serialising the premises to N3 text
   and parsing the derivations back, over **all** facts, even when one file changed.

The fix for (1) is a native store; the fix for (2) is a rule engine that runs _against_ that store
and maintains its conclusions incrementally. Putting both in one library is what removes the
serialisation step: the engine reads the store's indexes directly.

## Survey

| Candidate             | What it gives                                                                                                               | Why it is or is not the answer                                                                                                                                                                                                                                                                |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **oxigraph** (0.5)    | RocksDB quad store with named graphs, six indexes, transactions, a full SPARQL 1.1 engine, RDF parsers incl. JSON-LD and N3 | **Chosen for storage + SPARQL.** Mature, embeddable, the SPARQL the workspace sandbox and LDkit already speak.                                                                                                                                                                                |
| crepe / ascent        | Datalog compiled from a macro                                                                                               | Rules are fixed at compile time. `--rules F` and the shipped `rules/*.n3` are data, so this would mean codegen + rebuild per rule edit. No retraction.                                                                                                                                        |
| datafrog              | Runtime semi-naive joins (the engine under Polonius)                                                                        | Runtime, but static-typed `(K, V)` relations, no negation, no retraction. Would be one join loop inside our engine, not the engine.                                                                                                                                                           |
| differential-dataflow | Incremental everything: recursion, antijoin, retraction                                                                     | The right _algebra_, wrong _lifetime_. Its arrangements live in memory; `code-index index` is a process per pass, so each run would rebuild the whole computation from the store — exactly the cold cost we are removing. It fits the long-running workspace server; recorded as a follow-up. |
| nemo                  | Fast columnar Datalog with stratified negation and string builtins                                                          | Full recomputation only, data imported from files, its own rule syntax. No incremental maintenance.                                                                                                                                                                                           |
| reasonable            | OWL 2 RL on datafrog                                                                                                        | Fixed OWL rules, not user rules.                                                                                                                                                                                                                                                              |
| RDFox                 | Incremental (DRed/FBF) Datalog over RDF — the model we want                                                                 | Proprietary. Its design (materialisation maintained by DRed over the store's indexes) is what we reimplement for our subset.                                                                                                                                                                  |

**Decision:** compose oxigraph (storage, SPARQL, parsing) with a small purpose-built
engine (~1.5 kLoC) that implements semi-naive evaluation and DRed maintenance over
oxigraph's indexes. Nothing off the shelf combines dynamic rules, retraction and a
persistent materialisation; the part we write is the part nobody ships, and it
stays small because the N3 subset in use is small.

## The N3 subset

Every construct in `rules/*.n3` today, and what the engine does with it:

| Construct                                                                                     | Where                                                     | Support                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{ body } => { head }.` with triple patterns, `?vars`, IRIs, prefixed names, `true`, literals | all files                                                 | Datalog rule.                                                                                                                                                                                                                                                                                                       |
| `{ head } <= { body }.`                                                                       | `10`–`41`                                                 | **Backward rule**: never materialised. A body atom whose predicate a backward rule concludes is a _call_, proved on demand against the facts and those rules, as EYE does; the head may name variables only its caller binds (`{ ?name rule:canonical ?name } <= { … }`). Recursion is allowed and cut at depth 64. |
| Ground triples at the top level                                                               | `20-echo`, `30-compute`, `40-composer`, `41-capabilities` | Premises of their own file only, never part of its output (EYE's `derivations` mode drops them too).                                                                                                                                                                                                                |
| Lists `(…)` as builtin arguments and in backward rules' terms (`(?r ?s) rule:resolves ?d`)    | `10`–`41`                                                 | A per-run list term; never stored.                                                                                                                                                                                                                                                                                  |
| Recursion (a head feeding its own body)                                                       | `90-aliases.n3`, `30-compute.n3`                          | Semi-naive fixpoint (maintained strata) or rounds within a dependency group (below).                                                                                                                                                                                                                                |
| `string:matches` / `string:notMatches`                                                        | `50-example`, `70-specs`                                  | Filter; inputs must be bound; Rust `regex` syntax (same as EYE for the patterns used). A pattern read from the data (`?path string:matches ?pattern`) is compiled once per process, and one that does not compile matches nothing.                                                                                  |
| `string:startsWith` / `endsWith` / `contains`, `log:notEqualTo`                               | several                                                   | Filters over two bound terms (the string tests compare lexical forms, `notEqualTo` compares terms).                                                                                                                                                                                                                 |
| `(…) string:concatenation ?c`, `(?text ?re) string:scrape ?c`, `?x log:uri ?text`             | several                                                   | Functions: bind or compare the output once the inputs are bound. A `scrape` pattern may itself be built by the body.                                                                                                                                                                                                |
| `?x list:in (…)`, `?l list:length ?n`, `?l list:first ?x`                                     | several                                                   | Membership (enumerates when `?x` is unbound), length, first member.                                                                                                                                                                                                                                                 |
| `(?t { … } ?l) log:collectAllIn ?scope`                                                       | several                                                   | **Aggregate**: `?l` is the list of `?t` over the formula's distinct solutions. With `?l list:length 0` and no other use of `?l`, it is compiled to negation as failure.                                                                                                                                             |
| `?scope log:notIncludes { … }`                                                                | `41-capabilities`                                         | Negation as failure.                                                                                                                                                                                                                                                                                                |

Anything else — other `log:`/`math:`/`string:`/`list:` builtins, quoted formulas in heads, blank
nodes or lists in a forward head — is rejected at load with the offending rule named. Adding a
builtin is one match arm in `rules.rs` and one in `eval.rs`.

### Strata written in EYE's idiom

A stratum with backward rules or aggregates cannot be maintained by DRed: a premise that changes
inside a proof is invisible to the body that called it. Such a stratum is **recomputed** on every
pass (`incremental: false` in its outcome), the others stay incremental. Three things keep the
recomputation cheap:

- **One snapshot of the premises.** Every base fact with a predicate some rule reads is loaded into
  an in-memory, position-indexed set once per `reasonAll`; joins probe it instead of seeking RocksDB
  and re-interning each result. (A rule that leaves a body predicate unbound falls back to the store.)
  Decoding a quad out of oxigraph costs a RocksDB read per non-inline term — about 10 µs a quad,
  17 s for this repository's 1.4M premises — so the snapshot is decoded on every core, and each
  run keeps it on disk (`premises.bin`, `src/snapshot.rs`): the next run reads it back (≈1 s) and
  applies the journal's net change, which is exactly the base's change since that run. The file is
  trusted only under a token the engine state records once the run commits, so anything that
  resets the engine state (`invalidate`, `clear`, an overflowing journal) also retires the file.
- **Dependency order.** The file's forward rules are grouped into strongly connected components of
  "reads what the other concludes" (through the backward rules each calls), run dependencies first;
  only a cyclic group repeats until nothing is new. This is also what makes an aggregate see the
  complete set it counts.
- **Memoised proofs, the author's join order.** A call's solutions are memoised by its predicate
  and the caller's bound arguments — for the whole evaluation when its proof reads nothing the file
  concludes, else for one round. Bodies are evaluated in the order written (EYE's order, which the
  author tuned against), except that a builtin runs as soon as its inputs are bound and another
  atom goes first only when it has at least 8× fewer solutions under the current binding. A call
  waits for the atoms written before it: a backward rule may aggregate over whatever its caller
  leaves unbound.

Without a stratification check EYE evaluates a negation against whatever has been concluded so far;
these strata do the same within a cyclic group, and DRed-maintained strata keep the strict check.

## Semantics (one change, made deliberately)

- Each rule file is a **stratum**, run in filename order, writing `graph:derived/<name>`.
- Stratum _i_ sees the file graphs plus the derived graphs of strata **before** it, as
  `ONTOLOGY.md` § Reasoning says — never a later stratum's output from a previous pass, which
  would make the result depend on history. Covered by `Reasoner.test.ts` § ordered reasoners.
- A derived graph holds every fact the stratum's rule heads produce (its
  materialisation `M_i`), including a head that restates a premise — a fact of a file
  graph **or of an earlier stratum's graph** (EYE's `derivations` mode would drop those).
  Keeping them makes the stored graph exactly the maintenance state, so no side table is
  needed: `15-types` restates what `10-effect` already concluded (`rdf:type deus:EffectLayer`,
  `deus:providesService`), `90-aliases` restates each alias's own `rdf:type deus:Symbol`.
- The legacy `Store.reason(name, rules)` call keeps its contract (premises = file
  graphs + every other derived graph; returns conclusions; `materialize` replaces
  the graph) and is evaluated natively in full. `Reasoner.run` uses the new
  `reasonAll`, which is the incremental path.

## Storage layout (`<store>/native/`)

- `oxigraph/` — the quads. File graphs are `graph:<path>#<mtime>`; the ledger and its
  `pending_graph` protocol live in SQLite, so the native side only has to make "swap
  this file's graph" atomic, which it does in **one RocksDB transaction**. Derived graphs are
  `graph:derived/<name>`. SPARQL runs with the default graph as the union of all graphs.
- `journal/` — a second, tiny oxigraph store for engine bookkeeping, invisible to every query:
  the journal, the rule-set signature, the overflow flag. (oxigraph's union default graph includes
  the real default graph, so the bookkeeping cannot simply live there — tested.)

### The journal is write-ahead, not transactional

Two RocksDB instances share no transaction, so the journal is designed not to need one. An entry
records a triple's presence in the base **before** a change: `(s, <…:present:p>, o)` or
`(s, <…:absent:p>, o)`. It is written before the swap commits, and only if the triple has no entry
yet — the oldest entry describes the state the derived graphs were computed from. At reasoning
time the entry is compared with the triple's _actual_ presence: equal means the change was undone
or never committed (a crash between journal and swap), and the triple is simply not a delta. So a
journal entry can be wrong in only one direction, and that direction is harmless.

- A signature records the rule set (graph names + texts, FNV-1a) the derived graphs were computed
  with. Missing or mismatched signature, or an overflowed journal (default 250k entries — a
  `--force` reindex), means **full recomputation**. Journalling is off while no signature exists,
  so a cold index pays nothing for it.
- Closing a pass is ordered across the two stores: drop the signature, commit every derived-graph
  change in one transaction, clear the journal, write the new signature. A crash anywhere leaves
  either the previous state with its journal, or no signature — never new derived graphs paired
  with a journal that would be replayed against them. Raw writes into a derived graph, and the
  legacy `reason(…, { materialize })`, drop the signature first for the same reason.

## Incremental reasoning (DRed over the store)

Per stratum, given the net change `ΔE⁺/ΔE⁻` of its visible premises and its stored
materialisation `M`:

1. **Overdelete.** Semi-naive from `ΔE⁻`: bind one body atom to a deleted fact,
   evaluate the rest against the _old_ state (new store state overlaid with the
   journal: `old = new − plus + minus`). Negated patterns flip polarity: a fact
   _added_ to a negated pattern can kill a conclusion.
2. **Rederive.** Each overdeleted fact is kept if it has a one-step derivation
   from the new state minus the overdeleted set.
3. **Insert.** Semi-naive from `ΔE⁺`, the rederived facts and facts _removed_ from
   negated patterns, against the new state.
4. Net `M` changes become part of the next stratum's `ΔE`; all strata's changes are
   written in one transaction at the end (see above).

Correctness is guarded by a property test: random fact
churn, DRed result compared against full recomputation, across all shipped rules.

Joins are index-nested-loop over oxigraph pattern lookups (terms interned to `u32`
per run), with a greedy order: the delta atom first, then the literal with the
most bound positions; builtins and negations as soon as their inputs are bound.
Full recomputation evaluates each rule once against the premises, then saturates
from what that concluded. A delta triple is tried only against the atoms naming its
predicate (an index built per step). When the premises are read from the store rather
than the snapshot (below), a scan with neither subject nor object bound is decoded once
per computation (`facts::Cached`): a rule seeded once per derived fact (one evaluation
per selected glob, each reading every `deus:path`) would otherwise repeat it.

## Binding: napi-rs, in process

- The CLI and the workspace server are both one Bun process that already owns the
  store; Bun and Node both load Node-API addons, so vitest exercises the same
  binary. A sidecar would add process supervision, a second crash-recovery story
  and a serialisation hop on every `match`, for no isolation we need.
- The ledger and commit protocol live in `Store.ts`; only the quad half sits behind
  `internal/graph.ts`, implemented by `internal/native.ts`. `Reasoner.run` calls `reasonAll`,
  the incremental path. LDkit gets a custom `IQueryEngine` that forwards SPARQL to oxigraph, so
  lenses and the sandbox's `rdf.query` work over the same store.
- `putDocuments` passes the workers' N-Triples through; oxigraph bulk-loads a commit's quads off
  the event loop, then removes the stale ones in one transaction.

## Volume (the sibling TypeScript-type-facts workstream)

More quads per node raise commit and store size linearly; nothing in the engine
scans the whole store unless the rule set changed. Two things keep reasoning
proportional to the change rather than the store: predicate-indexed lookups (a rule
only touches the predicates it names) and the journal.
New predicates need no engine change; a rule over them is just another file.

## Building and CI

The addon is built by `moon run code-index-native:cargo-build` (`scripts/build.sh`: a release build
with the `napi` feature, copied to `code-index-native.node`, which `internal/native.ts` loads).
`code-index:test` depends on it, so the TS suite always runs against a current addon, and
`code-index-native:test` runs the crate's own `cargo test` in the `:test` sweep. The toolchain is
pinned by the crate's `rust-toolchain.toml` (kept equal to `rust` in `.prototools`); RocksDB is
compiled from source, which needs a C++ compiler and libclang for its bindgen step.

CI installs both in `.depot/actions/setup`: the pinned toolchain with rustup's minimal profile, and
libclang from apt where it is missing. The cargo registry is cached on `Cargo.lock`. The crate's
`target/` is not: moon's remote cache already restores `code-index-native.node` and skips
`cargo-test` when the crate's inputs are unchanged, so only a job whose crate inputs changed
compiles, and restoring gigabytes of build output into every job would cost more than it saves.

## Benchmarks

Two, both rerunnable, both local-only:

- `moon run code-index-native:cargo-bench` — a synthetic corpus shaped like a real index (exported
  symbols with references, layers over service tags, operations and handlers, plugins adding
  modules through barrels, namespace barrels, test imports), so every shipped rule file has work,
  including the negation. Times cold commit, full reasoning, a journalled one-file and ten-file
  commit with incremental reasoning, and the store size. It asserts incremental equals
  recomputation, so a fast wrong answer fails rather than reports. `CODE_INDEX_BENCH_FILES` scales
  it (default 5000).
- `moon run code-index:bench` (`bun scripts/bench.ts`) — this repository through the CLI: cold
  index into an empty store, then a warm pass after touching one file (content unchanged, mtime
  restored), then the store size. Prints a markdown table.

The `constructs-*.expected.n3` fixtures `tests/engine.rs` checks the engine against are what EYE
derived from `constructs.data.n3` with each rule file; they are golden files, edited by hand
only when a semantic difference above is deliberate.

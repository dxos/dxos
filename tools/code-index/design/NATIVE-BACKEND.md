# Native backend: one Rust library for the quad store and the rules

Status: design + first vertical slice (`tools/code-index-native`). The JS backend
(Quadstore/LevelDB + `eyereasoner`) stays the default until the native one has
run in anger; `CODE_INDEX_BACKEND=native` selects it (`Store.layer(dir, 'native')` in code).

## Why

Two costs dominate an indexing pass on this repo, and both are structural:

1. **Commit** (~369s cold). Quadstore writes every quad into six LevelDB indexes
   from JavaScript, one file at a time, and its cost grows with the store.
2. **Reason**. Every pass serialises the narrowed premises to N3 text, hands the
   string to EYE (Prolog compiled to WASM), parses the derivations back, and
   rewrites each reasoner's graph — over **all** facts, even when one file changed.

The fix for (1) is a native store; the fix for (2) is a rule engine that runs
_against_ that store and maintains its conclusions incrementally. Putting both in
one library is what removes the serialisation step: the engine reads the store's
indexes directly.

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

| Construct                                                                                            | Where             | Support                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `{ body } => { head }.` with triple patterns, `?vars`, IRIs, prefixed names, `true`, string literals | all files         | Datalog rule.                                                                                                                                                                                                            |
| Constant predicate in every head triple                                                              | all files         | Required when the rule file uses negation (stratification check); otherwise a variable predicate is allowed.                                                                                                             |
| Recursion (a head feeding its own body)                                                              | `90-aliases.n3`   | Semi-naive fixpoint within the file.                                                                                                                                                                                     |
| `?x string:matches "re"` / `string:notMatches`                                                       | `50-example.n3`   | Filter; `?x` must be bound; Rust `regex` syntax (same as EYE for the patterns used).                                                                                                                                     |
| `(?a "." ?b) string:concatenation ?c`                                                                | `60-canonical.n3` | Function: binds/compares `?c` once the list members are bound.                                                                                                                                                           |
| `(?x { pattern } ?L) log:collectAllIn ?scope. ?L list:length 0.`                                     | `60-canonical.n3` | **Scoped negation as failure**: "no binding of `pattern` exists". Recognised as an idiom; the pattern may be a conjunction. Its predicates must not be derived by the same file (checked; otherwise "not stratifiable"). |

Anything else — other `log:`/`math:`/`list:` builtins, `log:collectAllIn` whose
list is used for anything but `list:length 0`, quoted formulas in heads, existential
blank nodes in heads, `<=` — is rejected at load with the offending rule named.
Adding a builtin is one match arm in `rules.rs`; none was needed for the shipped files.

## Semantics (one change, made deliberately)

- Each rule file is a **stratum**, run in filename order, writing `graph:derived/<name>`.
- Stratum _i_ sees the file graphs plus the derived graphs of strata **before** it.
  The JS backend fed each reasoner every _other_ derived graph — including later
  ones from the _previous_ pass — so an earlier file could see a later file's stale
  output (`40-composer` saw `90-aliases`' types from the last run). That made the
  result depend on history. The design doc (`ONTOLOGY.md` § Reasoning) already said
  "before it"; the native backend implements what it says.
- A derived graph holds every fact the stratum's rule heads produce (its
  materialisation `M_i`), including the rare head that restates a premise. EYE's
  `derivations` mode drops those. Keeping them makes the stored graph exactly the
  maintenance state, so no side table is needed.
- The legacy `Store.reason(name, rules)` call keeps its contract (premises = file
  graphs + every other derived graph; returns conclusions; `materialize` replaces
  the graph) and is evaluated natively in full. `Reasoner.run` uses the new
  `reasonAll`, which is the incremental path.

## Storage layout (`<store>/native/`)

- `oxigraph/` — the quads. File graphs `graph:<path>#<mtime>` as today; the ledger and its
  `pending_graph` protocol stay in SQLite, unchanged, so the native side only has to make "swap
  this file's graph" atomic, which it does in **one RocksDB transaction**. Derived graphs are
  `graph:derived/<name>`. SPARQL runs with the default graph as the union of all graphs, as
  Quadstore's `unionDefaultGraph` did.
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
Full recomputation uses the same evaluator with every fact as the first delta.

## Binding: napi-rs, in process

- The CLI and the workspace server are both one Bun process that already owns the
  store; Bun and Node both load Node-API addons, so vitest exercises the same
  binary. A sidecar would add process supervision, a second crash-recovery story
  and a serialisation hop on every `match`, for no isolation we need.
- The TS `Store.Api` interface is unchanged apart from one addition, `reasonAll`, which
  `Reasoner.run` now calls (the JS backend implements it as the old loop). The ledger and commit
  protocol moved nowhere; only the quad half sits behind `internal/graph.ts`, implemented by
  `internal/quadstore.ts` (the previous code, moved) and `internal/native.ts`. LDkit gets a custom
  `IQueryEngine` that forwards SPARQL to oxigraph, so lenses and the sandbox's
  `rdf.query` keep working.
- `putDocument` passes the JSON-LD text through; oxigraph parses it natively.

## Volume (the sibling TypeScript-type-facts workstream)

More quads per node raise commit and store size linearly; nothing in the engine
scans the whole store unless the rule set changed. Two things keep reasoning
proportional to the change rather than the store: predicate-indexed lookups (a rule
only touches the predicates it names, as the JS narrowing did) and the journal.
New predicates need no engine change; a rule over them is just another file.

## CI

`.depot/actions/setup` deliberately does not install Rust (1.2 GB). The crate's
`cargo test` and the TS suite over the native backend therefore run locally
(`moon run code-index-native:cargo-test`, `moon run code-index:native-test`) and are not in the
`:test` sweep. Putting them in CI is a decision about the toolchain cost and is
left to the reviewers.

## Benchmarks

Two, both rerunnable, both local-only (no Rust in CI):

- `moon run code-index-native:cargo-bench` — a synthetic corpus shaped like a real index (exported
  symbols with references, layers over service tags, operations and handlers, plugins adding
  modules through barrels, namespace barrels, test imports), so every shipped rule file has work,
  including the negation. Times cold commit, full reasoning, a journalled one-file and ten-file
  commit with incremental reasoning, and the store size. It asserts incremental equals
  recomputation, so a fast wrong answer fails rather than reports. `CODE_INDEX_BENCH_FILES` scales
  it (default 5000).
- `moon run code-index:bench` (`bun scripts/bench.ts`) — this repository through the CLI, per
  backend: cold index into an empty store, then a warm pass after touching one file (content
  unchanged, mtime restored), then the store size. Prints the markdown table the PR carries.

Conclusions were checked against EYE on this repository: every rule file's count matches except
`60-canonical` (files added since the baseline) and `90-aliases`, where 1,310 of 1,373 native
conclusions restate a premise (the documented difference above) and the remaining 63 are EYE's 63.

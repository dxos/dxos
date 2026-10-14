# DEUS design

DEUS is one language for code, specifications and proofs, stored in a content-addressed
codebase that people and agents edit through a CLI. This document describes the language
and the toolchain; [`DECISIONS.md`](./DECISIONS.md) records why each choice was made, and
[`USER.md`](./USER.md) is the requirement it answers to.

## Status

| Area                                                                               | State                                                                                            |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Kernel: Core CEK machine, deep multi-shot handlers, primitives, IO                 | done                                                                                             |
| Lexer, parser (Lean syntax, offside rule), resolver, Unison-style hashing in DEUS  | done                                                                                             |
| Self-hosting: the seed compiles the compiler to itself                             | done (`src/seed.test.ts`)                                                                        |
| Failure tiers: `Throw` errors, `#Defect` defects, kernel panics                    | done; defects carry named stack traces; `Failure` context chains                                 |
| Codebase store: objects, namespaces, history, branches, three-way merge, undo      | done                                                                                             |
| CLI: codebase, history, `run`, `eval`, `test`, `check`, `image`, `build`, `--json` | done                                                                                             |
| Type checker: Hindley–Milner with Koka-style ability rows                          | done ([D28](./DECISIONS.md), [D36](./DECISIONS.md)); row parameters close D29 (D55)              |
| Theorems: `test`, `decide`, `rfl` evidence and tactic proofs                       | done ([D21](./DECISIONS.md))                                                                     |
| Deterministic simulation for tests; `@[integration]` tests                         | done ([D32](./DECISIONS.md))                                                                     |
| Observability: `Log`, `Trace`, `Metrics` abilities; NDJSON and OTLP sinks          | done ([D31](./DECISIONS.md), [D35](./DECISIONS.md))                                              |
| Standalone executables (`deus build`)                                              | done ([D38](./DECISIONS.md))                                                                     |
| `.mdl`: ```deus fences                                                             | done; extensions defined in DEUS (`@[ext]`), `perf` requirements, `deus mdl`                     |
| Rust kernel (native, byte-identical) and wasm kernel (`wasm32-wasip1`)             | done ([D40](./DECISIONS.md), [D41](./DECISIONS.md))                                              |
| Cloudflare Workers / Durable Objects target (`deus build --worker`)                | done ([D45](./DECISIONS.md), [D52](./DECISIONS.md)): actor calls and alarms                      |
| Wasm compiler for first-order code and algebraic data (`deus build --wasm`)        | done ([D51](./DECISIONS.md), [D56](./DECISIONS.md)); closures and effects run on the wasm kernel |
| Projects/subgraphs, external requirements, replication, layers, containers         | done (D47–D50, D53, D54)                                                                         |

## The language

```deus
namespace Shapes

/-- A colour, identified across versions by its IRI. -/
inductive Color @"https://example.org/deus/Color" where
  | red
  | green

structure Point where
  x : Int
  y : Int

ability Throw (e : Type) where
  throw : e -> a

def safeDiv (a : Int) (b : Int) : {Throw Text} Int :=
  if b == 0 then throw "division by zero" else a / b

def sum : List Int -> Int
  | [] => 0
  | x :: xs => x + sum xs

theorem sum_append (xs ys : List Int) : sum (xs ++ ys) = sum xs + sum ys := by test 200

test moves := ({ Point.mk 1 2 with y := 5 }).y == 5

end Shapes
```

- **Lean syntax.** `def`, `theorem`, `inductive`, `structure`, `namespace`/`open`, `fun x =>`,
  `match … with | p => …`, `let x := …` lines, `/-- doc -/`. Layout follows Lean's offside rule
  ([D11](./DECISIONS.md)).
- **Effects in the arrow, direct style.** `a -> {Throw Text, IO} b`. There is no monad and no
  `do`-notation for effects; a call is a call.
- **User-defined effects.** `ability` declares operations; `handle e with | op args -> k => …`
  receives the continuation `k` and may resume it zero, one or many times. Handlers are deep
  ([D7](./DECISIONS.md)).
- **No type classes yet.** `==`, `<` and `compare` are structural ([D10](./DECISIONS.md)).

### Types and abilities

Types are inferred (Hindley–Milner) and every arrow carries an ability row, inferred as well:

```text
List.map     : (a -> {e} b) -> List a -> {e} List b
Parser.parse : Text -> {Throw Text} List Decl
try          : (Unit -> {Throw e | r} a) -> {r} Result e a
```

- A signature's written row is a contract: `{IO}` means IO and nothing else. `{Throw Text | r}`
  names the rest, so callbacks can share it (Koka's idiom). An arrow written without braces
  constrains nothing.
- A handler removes its ability from the row of its body; a `throw` that no handler removes
  reaches the signature and is reported: `leak: unhandled ability Throw Text`.
- A call needs the callee's abilities to be contained in the caller's (subsumption), and a lambda
  passed to a known function is checked against the expected type (bidirectional).
- Inferred types are stored as metadata and shown by `view` (`-- : (a -> {e} b) -> …`).
- A function kept in data keeps its effects ([D55](./DECISIONS.md)). Field arrows are closed, so
  one written without braces is pure. A type parameter used as a row is a row parameter, passed
  in braces:

  ```deus
  structure Box (r : Effect) where
    run : Unit -> {r} Int

  def runBox (b : Box {r}) : {r} Int := b.run ()
  ```

### Failure has three tiers ([D14](./DECISIONS.md))

| Tier   | Meaning                        | Mechanism                                                                            | Who handles it                                                     |
| ------ | ------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Error  | expected, part of the contract | `Throw e` in the effect row                                                          | the caller, with `try`/`catch`/any handler                         |
| Defect | the program is wrong           | failed match, division by zero, `defect "…"`; raised by the kernel as `Defect.raise` | a boundary (test runner, REPL) may observe it; it is never resumed |
| Panic  | the kernel is broken           | a kernel invariant failed                                                            | nobody; the process exits 71                                       |

### Identity

Every definition is named by the SHA-256 of its [Core](./CORE.md) form, with dependencies by
hash and locals as de Bruijn indices. Names are entries in a namespace, so renaming is free
and two people can never mean different things by the same hash. Types and abilities are
identified by IRI ([D6](./DECISIONS.md)); their hash also covers their constructor shapes, so an
IRI names a type's lineage and a hash names one version of it.

## The toolchain

```text
               seed/deus.image (Core image of Cli.main)
                         │ runs on
                         ▼
  src/kernel ── CEK machine · primitives · IO host · Code.load/run
                         ▲
                         │ produces images, objects
  deus/  lexer → parser → resolver → hasher → codebase → CLI
```

The kernel is the only TypeScript. It evaluates Core with an explicit frame stack, so tail
calls and deep recursion use no JS stack and a captured continuation is a copied stack segment
([D8](./DECISIONS.md)). `Code.load` and `Code.run` let the DEUS CLI load definitions it compiled
into the same machine and run them under its own handlers.

### Bootstrapping

A TypeScript front-end (stage0) compiled the DEUS sources once. The result (seed₀) compiled
them again into seed₁, and seed₁ compiled them into seed₂ = seed₁: the fixpoint. Stage0 was then
deleted ([D17](./DECISIONS.md)). Every change to `deus/` is now compiled by the previous seed.

### The codebase ([`deus/codebase.deus`](../deus/codebase.deus))

A `.deus` directory, after Unison's UCM:

- `objects/` holds every hashed object: definitions, namespace snapshots, history nodes.
- A **branch** points at a **causal** node: a snapshot plus its parents. Every `add` or `update`
  makes a new node, so `log` and `undo` are free.
- **Merge** is three-way over names: a name changed on one side takes that side; a name
  changed differently on both is a conflict and nothing is written.
- `update` propagates: dependents of a replaced hash are rewritten and re-hashed.
- Test and proof results are cached by the hash of what was checked, so they are never rerun
  for unchanged code.

### For agents

Agents use the same CLI as people. Every command takes `--json`; `view` prints a definition
as source with current names, and `update` takes the edited source back. See
[`LLM.md`](./LLM.md).

## Specifications

`.mdl` documents carry DEUS code in ``deus fences; the CLI reads them like `.deus` files, with
error positions pointing into the document. Typed ``mdl blocks are checked by `deus mdl`
(D46):

- **The document as data.** `Mdl.parse` (`deus/mdl.deus`) reads the frontmatter, the Extensions
  table (term → URI) and each block (`<type> [<id>][: <title>]`, then `key: value` lines) into
  `Doc` and `Block` values. `Mdl.validate` applies the core rules: every block type is declared,
  and block ids are unique.
- **Extensions are DEUS definitions.** An extension is a function `Block -> {MdlHost} List Text`
  published with `@[ext "<uri>"]`; it returns the block's problems, none when it holds.
  `deus mdl` finds the definition whose `ext` attribute matches the URI the Extensions table
  gives the block's term, and reports a block whose extension the codebase lacks as unchecked.
- **The host is an ability.** `MdlHost.cost` and `MdlHost.holds` evaluate DEUS source against
  the codebase (compiled as `eval` compiles it), so an extension asks questions about code without
  depending on the CLI.
- **Performance requirements.** The `perf` extension (`platform/perf.deus`) takes `run:`, an
  optional `budget:` in steps and, with `sizes:`, an `order:` (`1`, `log n`, `n`, `n log n`,
  `n^2`) that bounds how cost grows between sizes. Cost is `Code.cost`: the machine steps a
  thunk takes, with the JIT off. Steps are deterministic and equal on both kernels, so a bound is
  a test with a verdict, not a benchmark. `examples/perf.mdl` states the sorting example's.

```mdl
perf P-1: insertion sort is quadratic on reversed input
  run: fun n => Sort.isort (List.reverse (List.range 0 n))
  sizes: 20 | 40 | 80
  order: n^2
  budget: 100000
```

## Performance

Iteration speed is what the toolchain is tuned for. As of D51, on a 4-core container:

| Workload                              | TypeScript kernel with JIT (D37) | Rust kernel (D40) |
| ------------------------------------- | -------------------------------- | ----------------- |
| self-compile (`compile deus`)         | 4.1 s                            | 11.6 s            |
| `deus add deus` (type-checked, store) | 4.4 s                            | —                 |
| `deus test` (32 tests, simulated)     | 1.8 s                            | —                 |

To find where time goes:

- `node --cpu-prof bin/deus.mjs …`. Each JIT-compiled function is named
  `deus_<hash prefix>` after its definition, and `deus names '#<hash>'` names it.
- `DEUS_PROFILE=1` counts entries per definition, with the JIT off.
- For the Rust kernel, `valgrind --tool=callgrind` gives deterministic instruction counts.
  About a quarter of them are allocation, which a faster allocator did not reduce (mimalloc was
  slower).
- For code, `Code.cost` and `perf` blocks state budgets in machine steps.

## The web

A web handler is a function `Request -> {Storage, Http, Actors, Alarm} Response`
([`platform/web.deus`](../platform/web.deus), D57). The same definition runs three ways:

```bash
deus test Notes                              # Web.simulateMany: in memory, deterministic
deus serve Notes.serve --port 8080           # a native server, storage under ./deus-data
deus build Notes.serve -o out --worker       # a Cloudflare Worker with Durable Objects
```

`?actor=<name>` picks the object, which is a Durable Object on Cloudflare and a storage
directory locally. [`examples/notes.deus`](../examples/notes.deus) is a notes service, and
[`examples/tally.deus`](../examples/tally.deus) shows objects calling each other and alarms.

## Projects

A codebase is one project, named by an IRI (`deus project init https://dxos.org/deus/std`).
Dependencies are releases of other projects, pinned by causal hash and mounted under
`lib.<name>` (`deus lib install std ../std`). Names resolve by suffix, so `area` finds
`lib.std.area`. The project's subgraph is inferred (D49), and a type IRI under a library's IRI
can only come from that library.

## Replication

`deus remote add origin r2://agent-artifacts/deus/std` (or a directory), then `deus push`,
`deus pull` and `deus compact` (D50). Each push writes one immutable bundle, named by its hash,
and nothing is overwritten. A pull imports new bundles and sets `origin.<branch>` to the
remote's heads, which are merged as local branches are. Compaction is deterministic, so two
clients compacting the same history write the same bundles. `deus compact --keep n` collects
garbage: n generations from each head survive, and older history becomes shallow (D54).

## The outside world

Code that needs something outside the codebase says so in its effect row (D47):

- `Fetch` resolves a `Requirement`, which names a package in a `Registry` (npm, crates, GitHub
  releases, a URL) and the SHA-256 its bytes must have. Under `deus run` it is downloaded once,
  verified, and cached by hash in the codebase's `cache/fetch`. `External.tool` fetches and runs
  one.
- `Containers` starts and stops a `Container`, an image pinned by digest. Under `deus run` the
  host's `docker` runs it.
- Tests use `External.simulateFetch` and `External.simulateContainers`, which never touch the
  network.
- In `.mdl`, `requirement` and `container` blocks lower to the same data, and `deus mdl` refuses
  floating versions, bad hashes and images without a digest.

## Proofs

A `theorem` states a proposition over typed binders (`P -> Q` for hypotheses) and names its
evidence:

| Evidence       | Meaning                                                                                 |
| -------------- | --------------------------------------------------------------------------------------- |
| `sorry`        | stated, not checked                                                                     |
| `by test n`    | `n` generated cases passed (property-based; deterministic seed from the theorem's hash) |
| `by decide`    | every case of finite binder types checked                                               |
| `by rfl`       | closed proposition, evaluated to `true`                                                 |
| `by <tactics>` | a formal proof: `induction x`, `cases x`, `simp [lemmas]`, `split`, `auto`, `trace`     |

```deus
theorem insertSorted (x : Int) (xs : List Int) : sorted xs = true -> sorted (insert x xs) = true := by
  induction xs; auto

theorem isortSorted (xs : List Int) : sorted (isort xs) = true := by
  induction xs; simp [insertSorted]
```

The prover ([`deus/prove.deus`](../deus/prove.deus)) evaluates Core symbolically. Its trusted
base is written at the top of that file. A definition is unfolded only if it is pure and
structurally recursive, so every equation it uses holds for all inputs. A `match` on an unknown
value blocks evaluation rather than guessing. Induction is structural, and case splits are on
`Bool` conditions. `Int` is treated as a ring modulo 2³², and `<=` as a total order. Lemmas
are used in their written direction, as Lean's `simp` uses them. A proof that relies on a
lemma that is only tested is reported as "proof assuming tested lemmas".

Lemma names in a proof are resolved to hashes when the theorem is compiled, so changing a
lemma changes the theorem's hash and invalidates its cached verdict.
[`examples/soundness.deus`](../examples/soundness.deus) lists claims the prover must refuse;
the test suite checks them.

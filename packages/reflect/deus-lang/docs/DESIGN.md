# DEUS design

DEUS is one language for code, specifications and proofs, stored in a content-addressed
codebase that people and agents edit through a CLI. This document describes the language
and the toolchain; [`DECISIONS.md`](./DECISIONS.md) records why each choice was made, and
[`USER.md`](./USER.md) is the requirement it answers to.

## Status

| Area                                                                                         | State                                                            |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Kernel: Core CEK machine, deep multi-shot handlers, primitives, IO                           | done                                                             |
| Lexer, parser (Lean syntax, offside rule), resolver, Unison-style hashing — in DEUS          | done                                                             |
| Self-hosting: the seed compiles the compiler to itself                                       | done (`src/seed.test.ts`)                                        |
| Failure tiers: `Throw` errors, `#Defect` defects, kernel panics                              | done (runtime); type checking pending                            |
| Codebase store: objects, namespaces, history, branches, merge                                | in progress                                                      |
| CLI: `add`, `update`, `view`, `ls`, `find`, `branch`, `merge`, `log`, `run`, `test`, `check` | in progress                                                      |
| Type checker: Hindley–Milner with ability rows                                               | planned                                                          |
| Theorems: `rfl`, `decide`, `test` evidence levels                                            | planned                                                          |
| `.mdl`: ```deus fences                                                                       | done; extensions defined in DEUS and `perf` requirements planned |
| wasm backend; standalone binaries                                                            | planned                                                          |

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
               seed/deus.seed (Core image of Cli.main)
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

`.mdl` documents carry DEUS code in ```deus fences; the CLI reads them like `.deus` files, with
error positions pointing into the document. Two extensions are in progress:

- **MDL extensions defined in DEUS.** An MDL block kind is declared by a DEUS definition that
  parses and checks its fields and turns them into obligations (theorems, tests).
- **Performance requirements.** A `perf` block bounds the cost of an operation as a function of
  its input size, measured in kernel steps (`Code.steps`), which are deterministic, so a bound
  can be tested like a property.

## Proofs

A `theorem` states a proposition over typed binders and names its evidence:

| Evidence    | Meaning                                                                                 |
| ----------- | --------------------------------------------------------------------------------------- |
| `sorry`     | stated, not checked                                                                     |
| `by test n` | `n` generated cases passed (property-based; deterministic seed from the theorem's hash) |
| `by decide` | every case of finite binder types checked                                               |
| `by rfl`    | closed proposition, evaluated to `true`                                                 |

The ladder is honest: the CLI reports the level each theorem reached. Induction and rewriting
are the next rung.

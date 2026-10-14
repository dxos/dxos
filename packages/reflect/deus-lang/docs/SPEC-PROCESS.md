# The spec process: spec, then APIs and laws, then code, proofs and tests

From Dmytro: "the general process should be mdl spec > apis + theorems > impls and proofs and tests.
maybe backfill this for existing code and keep using this process as you go, eval it." This page says
how the process works in DEUS, what the backfill covered, and what it found and cost (D92).

## How to write a spec

A spec is an `.mdl` document in `docs/spec/`, next to the prose `.md` that explains the subsystem.
Write it in this order:

1. **Requirements.** One `req` block per promise, in a sentence a reviewer can check. Each names its
   evidence in `by:`; until the evidence exists, `gap:` names the task that adds it.
2. **APIs.** One `api` block per group of entry points, `Name : Type` per line, the type as
   `deus view` shows it.
3. **Laws.** One `law` block per property that must hold for all inputs, naming its theorem, with
   `statement:` when the exact claim matters and `evidence: proof` when testing is not enough.
4. **Evidence.** Theorems and tests in a ` ```deus ` fence at the end of the same document, in the
   namespace `<Subsystem>.Spec`. `deus add docs/spec` compiles them next to the code.
5. **Code.** Then write or change the implementation until `deus mdl docs/spec` reports no failure.

`deus mdl docs/spec` checks every block: names exist with the stated types, every test and theorem
named passes (checked now or from the cached verdict), and each law's theorem states what the spec
says. A requirement with only a `gap:` is reported but does not fail. CI runs it in the toolchain
self-test (`src/cli.test.ts`). The block types are in [MDL.md](spec/MDL.md#the-req-api-and-law-extensions);
[CODEBASE-STORE.mdl](spec/CODEBASE-STORE.mdl) is the reference example.

Laws about pure functions are theorems over generated values. Laws about the store, the CLI or the
explorer run inside `Codebase.Spec.inStore`, a fresh codebase in the deterministic simulation, so a
theorem can still state them (`inStore (fun dir => …) = true`) and `by test n` still generates inputs.

## Before and after

| Measure                                  | Before                   | After                                                            |
| ---------------------------------------- | ------------------------ | ---------------------------------------------------------------- |
| Toolchain subsystems with a checked spec | 0                        | 5 (store, compile, export, explorer; bindings by its own thread) |
| Requirements with checked evidence links | 0                        | 29, plus 4 known gaps                                            |
| API signatures checked against the code  | 0                        | 26                                                               |
| Theorems about the toolchain             | 7, all about the prelude | 28 (11 from these specs, 10 from BINDINGS.mdl)                   |
| Toolchain tests                          | 35                       | 62 (27 added by these specs)                                     |
| `deus mdl docs/spec`, cold / cached      | n/a                      | 14 s / 7 s                                                       |

## What it caught

- **Prose specs had drifted from the code.** CODEBASE-TEXT.md's "What does not round-trip" listed
  attributes, doc comments, ordinary comments, spec blocks and control-character escapes. All five
  now round-trip (`Export.Spec.restoresMetadata`, `restoresSpecs`, `restoresTheSnapshot`), so four of
  its six bullets were wrong. EXPLORER.md said `"` is escaped in source HTML; it is not, and need not
  be. Both prose files are corrected. Nothing checked prose, so nobody noticed.
- **A wrong law of my own.** I first wrote that an undeclared ability is refused. LANGUAGE.md says an
  arrow without braces has a fresh row and constrains nothing; only a written row is closed. The
  failing test sent me to the rule, and the law now states it. LANGUAGE.md's note that a row on a
  definition with no binders is not checked became tracked gap R-9 instead of a sentence.
- **Display bugs, found by writing APIs and statements.** `deus view` prints a theorem's `P -> Q` as
  `prim "implies" (P) (Q)`, and the type display names `Task` as `task:Task`, its IRI's tail. Both
  are filed (`4f7f9e40`, `f6a2c2ff`).
- **The bindings thread** (D87) found a real naming bug on its first `deus check`.
- **No code bug in the store, compiler or export.** Those subsystems were already exercised end to
  end by `src/cli.test.ts`; the new laws confirm what the code does and pin it down at the level a
  regression would break first (a namespace node splitting past 64 items, merge cases, the order of
  definitions in a batch, metadata surviving an export).

## What it cost

About 10 to 15 minutes per subsystem for a spec of 5 to 12 requirements, most of it reading the
prose spec and the code to find the promises worth stating. The bindings thread reported the same,
about 10 minutes. The checker itself (`platform/spec.deus`, 130 lines, and the `describe` host
operation) took about 20 minutes. Checking adds 7 to 14 seconds to the self-test.

## What is awkward in `.mdl` today

Each is a codebase task (ids in brackets):

- A `req` can only name DEUS tests and theorems; the strongest evidence for some promises is a
  vitest (the toolchain-wide view round trip), which shows up as a gap (`a2da28e2`).
- An extension does not know its document's name, so a test cannot point back at the requirement it
  verifies (`@[req "Codebase.Spec.R-3"]`) and nothing can list tests no requirement names
  (`6a3b0ebe`, `908495a0`).
- `statement:` is compared as printed text with full names. Comparing compiled propositions would
  accept any spelling (`0d7b0142`).
- `by test n` draws from a fixed alphabet, so a law about collisions or dotted names needs a
  hand-written generator (`Codebase.Spec.dotted`, `Bindings.Spec.crowded`; `1cbfdd30`).
- Store laws need boilerplate: `inStore (fun dir => …) = true`, since a theorem's proposition
  cannot perform IO, and a proposition cannot contain `let`.
- Values cannot contain `#` (it starts a comment), and `|` separates list items, so an effect row
  `{IO | r}` cannot appear in a `by:` list (signatures are one per line for that reason).
- Extensions had only ok and fail; `gap` was added for requirements whose evidence does not exist yet.

## Next

New work follows the process: a spec change comes first in the same commit as the code. The rest of
the toolchain (lexer and parser, types, prover, tasks, replication, update, image, the wasm and C back
ends) gets checked specs as it is touched (`1ab6c044`), and BINDINGS.mdl's requirements table becomes
`req` blocks (`b4d7a440`).

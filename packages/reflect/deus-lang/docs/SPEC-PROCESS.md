# The spec process: spec, then APIs and laws, then code, proofs and tests

From Dmytro: "the general process should be mdl spec > apis + theorems > impls and proofs and tests.
maybe backfill this for existing code and keep using this process as you go, eval it." This page says
how the process works in DEUS, what the backfill covered, and what it found and cost (D92).

## How to write a spec

A spec is a document in the codebase, named `<Subsystem>.Spec` (D99). Dmytro: "I want agents to
record specs in codebase, not in github. and overall, most development at this point should be
happening via-codebase". Nothing under `docs/spec/` holds a checked spec any more; the copies in
[`codebase/specs/`](../codebase/specs) are the export, written by `deus export codebase`.

Write it in this order:

1. **Requirements.** One `req` block per promise, in a sentence a reviewer can check. Each names its
   evidence in `by:`; until the evidence exists, `gap:` names the task that adds it.
2. **APIs.** One `api` block per group of entry points, `Name : Type` per line, the type as
   `deus view` shows it. A name declared without a body (D94) is reported as a known gap.
3. **Laws.** One `law` block per property that must hold for all inputs, naming its theorem, with
   `statement:` when the exact claim matters and `evidence: proof` when testing is not enough.
4. **Evidence.** Theorems and tests in the namespace `<Subsystem>.Spec`.
5. **Code.** Then write or change the implementation until `deus mdl <Subsystem>.Spec` reports no
   failure.

The codebase is the primary version control and git is its backup (D100). Dmytro: "threads MUST
use the codebase as primary VCS, and git as backup". Start every task from the remote, not from the
git export:

```sh
export DEUS_CODEBASE=$(mktemp -d)/tc                  # a fresh codebase per task
deus init --empty
deus project init https://dxos.org/deus/toolchain    # origin is now the shared remote (D109)
deus pull origin && deus merge origin.main           # the latest codebase
```

Only `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` are needed: for the toolchain project, `origin`
defaults to `r2://agent-artifacts/deus/toolchain` and the endpoint to the DXOS account's R2
(`$DEUS_R2_ENDPOINT` and `deus remote add origin …` still override them). A 403 on push while
pulls work means the environment's network policy does not allow writes to
`950816f3f59b079880a1ae33fb0ec320.r2.cloudflarestorage.com`; it must be in Allowed domains.

Make every change with the CLI (`deus update … --by <agent>`, `deus task …`), run `deus push origin`
when a change lands, and only then `deus export codebase` and commit the export to git. If the
remote is behind the git export (a change that was committed without a push), catch it up once
after the pull: `deus update codebase/code codebase/specs --by <agent>`,
`deus task import codebase/tasks.sexp`, `deus history import codebase/history.sexp`, then push.

The steps, for a new spec or a change to one:

````sh
deus view Compile.Spec > /tmp/compile.mdl   # the document as stored (skip for a new one)
$EDITOR /tmp/compile.mdl                    # blocks and prose; a ```deus fence holds new laws
deus update /tmp/compile.mdl                # stores the blocks, their prose, and the fence's code
deus mdl Compile.Spec                       # checks it from the codebase
deus push origin                            # the change lands in the primary
deus export codebase                        # the git backup: codebase/specs/Compile.Spec.mdl
````

A ```deus fence in the edited file compiles into the codebase like any source; the stored document
keeps a line saying where its laws are, and `deus view Compile.Spec.someLaw` prints one. To change an
existing law, edit it from `deus view` into a `.deus` file and `deus update` that. A block deleted
from the file stays in the codebase until `deus rm Compile.Spec.R-3`.

`deus mdl` checks every block of every document: names exist with the stated types, every test and
theorem named passes (checked now or from the cached verdict), and each law's theorem states what the
spec says. A requirement with only a `gap:` is reported but does not fail. CI restores the export and
runs `deus mdl` on it (`src/cli.test.ts`), and fails when the export no longer matches `deus/`. The
block types are in [MDL.md](spec/MDL.md#the-req-api-and-law-extensions);
[Codebase.Spec](../codebase/specs/Codebase.Spec.mdl) is the reference example.

Laws about pure functions are theorems over generated values. Laws about the store, the CLI or the
explorer run inside `Codebase.Spec.inStore`, a fresh codebase in the deterministic simulation, so a
theorem can still state them (`inStore (fun dir => …) = true`) and `by test n` still generates inputs.

## Feature maps

A spec says what one subsystem promises; a feature map says what the product is made of (D118). Dmytro:
"we need feature-maps in codebase in addition to tasks". [`Toolchain.Features`](../codebase/specs/Toolchain.Features.mdl)
maps the toolchain: each `feature` block has a status and links its spec documents, definitions and
tasks. Edit it like a spec (`deus view Toolchain.Features > f.mdl`, `deus update f.mdl`), and when a task
starts or ends, keep the feature that owns it current. `deus features` prints the tree with open tasks,
and `deus mdl` fails a shipped feature with open work.

## Before and after

| Measure                                  | Before                   | After                                                            |
| ---------------------------------------- | ------------------------ | ---------------------------------------------------------------- |
| Toolchain subsystems with a checked spec | 0                        | 5 (store, compile, export, explorer; bindings by its own thread) |
| Requirements with checked evidence links | 0                        | 29, plus 4 known gaps                                            |
| API signatures checked against the code  | 0                        | 26                                                               |
| Theorems about the toolchain             | 7, all about the prelude | 28 (11 from these specs, 10 from Bindings.Spec)                  |
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
- **Backfilling the explorer's writing and console** (D82, D84, D93) added an API block of six signatures, five requirements and two laws to [Explorer.Spec](../codebase/specs/Explorer.Spec.mdl): comments reach
  `comments.json`, the inbox opens a member's task with its labels and refuses anyone else, the
  console snapshot leaves out local state, and `meta.json` names the console. To state R-10 as a
  test, the snapshot's file list became its own function (`Explorer.snapshotFiles`). No new bug; the
  API blocks hit the IRI-tail display again (`task:Comment`, `replicate:Remote`), already filed as
  `f6a2c2ff`. The Worker half stays in vitest, since `by:` names DEUS tests only.

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
ends) gets checked specs as it is touched (`1ab6c044`), and Bindings.Spec's requirements table became `req`
blocks with the move into the codebase (D99).

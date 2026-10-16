# Getting started with DEUS

DEUS is a functional language whose code lives in a database, not in files. You write `.deus`
files, and `deus add` compiles them into a codebase. There each definition is stored by the hash
of its content and given a name. Tests, proofs, specifications, tasks and build artifacts sit in
the same store, next to the code they are about.

This guide installs the toolchain, walks through the language, and ends with five recipes:

1. [A tour of the language](#recipe-1-a-tour-of-the-language): types, pattern matching, abilities, errors, tests.
2. [Proofs](#recipe-2-proving-a-sort-correct): proving that a sort sorts.
3. [An HTTP service](#recipe-3-an-http-service-as-a-native-binary), built as a native binary.
4. [The same service on Cloudflare](#recipe-4-the-same-service-on-cloudflare), with Durable Objects.
5. [Tasks and the explorer](#recipe-5-tasks-and-the-explorer): issues attached to code, and a browsable site.

## Install

You need Node 24 or newer. Rust (`cargo`) is optional; you need it only for native binaries and
for serving HTTP natively.

```bash
git clone https://github.com/dxos/dxos && cd dxos/packages/reflect/deus-lang
alias deus="node $PWD/bin/deus.mjs"      # the CLI runs from source; there is no build step
deus help
```

Every command works on one codebase per user, `~/.deus`, unless `$DEUS_CODEBASE` or
`--codebase <dir>` names another. Create it; it starts with the builtins and the prelude
(`deus init --empty` leaves it bare):

```bash
deus init
```

To get a standalone `deus` executable of about 1.6 MB, add the toolchain's own sources and build it.
The toolchain is written in DEUS. Paths name files on disk, relative to the current directory, so
`deus` here is the `deus/` directory of sources next to `bin/`, and `add` takes every `.deus` file
in it:

```bash
deus add deus
deus build Cli.main -o ~/.local/bin/deus --native      # needs cargo
```

The native `deus` finds the toolchain's sources (for `--worker`, `serve` and `explore`) in the
checkout it was built from, so keep the checkout where it is.

Editor support for VS Code is in [`editors/vscode/`](../editors/vscode).

## The language in five minutes

The syntax is close to Lean's. A file is a sequence of declarations inside namespaces:

```lean
namespace Geometry

/-- A doc comment. `def` names a value or a function; types are inferred but usually written. -/
def double (n : Int) : Int := n + n

/-- Functions over lists are recursive definitions by cases. -/
def sum : List Int -> Int
  | [] => 0
  | x :: rest => x + sum rest

end Geometry
```

These are the parts to know:

| Construct    | Example                                                                   | Note                                                                |
| ------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Data types   | `inductive Shape where \| circle (r : Int) \| rect (w : Int) (h : Int)`   | Constructors are `Shape.circle`, `Shape.rect`.                      |
| Records      | `structure Line where`, then one `field : Type` per line                  | Built with `Line.mk "tea" 2`, read with `line.item`.                |
| Matching     | `match s with \| Shape.circle r => … \| Shape.rect w h => …`              | A value no case matches is a defect at run time; nothing checks it. |
| Lambdas      | `fun x => x + 1`                                                          | `List.map (fun x => x + 1) xs`                                      |
| Local values | `let total := a + b`                                                      | One per line, then the result.                                      |
| Abilities    | `ability Prices where priceOf : Text -> Int`                              | Effects a function may perform, listed in its type: `{Prices} Int`. |
| Handlers     | `handle body () with \| Prices.priceOf item -> resume => resume 3`        | Give an ability its meaning.                                        |
| Errors       | `throw "bad input"` has type `{Throw Text} a`                             | `try` turns them into `Result.ok` or `Result.err`.                  |
| Tests        | `test areas := area (Shape.rect 3 4) == 12`                               | Run by `deus test`.                                                 |
| Theorems     | `theorem t (xs : List Int) : len xs >= 0 = true := by induction xs; auto` | Checked by `deus check`.                                            |

Two ideas set DEUS apart from most languages:

- **Effects are in the type.** A function that reads files has `{IO}` in its type. A function
  that can fail has `{Throw Text}`. When a signature names its abilities, the type checker
  rejects any call that needs another one, unless a handler inside provides it. `IO` is the
  ability `main` gets from the runtime.
- **Code is stored by hash.** `deus update` replaces a definition. Every definition that depends on
  it is rehashed and updated in the same step, so the codebase never holds a broken build.
  Renaming (`deus mv`) never changes a hash, so it cannot break a caller. `deus undo` steps back
  one change.

## Recipe 1: A tour of the language

[`examples/tour.deus`](../examples/tour.deus) defines a shape type, a record, an ability with a
handler, and a checked error, with a test for each:

```bash
deus add examples/tour.deus
deus test Tour
```

```text
  ✓ Tour.areas
  ✓ Tour.errors
  ✓ Tour.totals
3 passed, 0 failed
```

`total` asks for prices through the `Prices` ability, and `fromTable` answers from a map:

```lean
ability Prices where
  priceOf : Text -> Int

def total (lines : List Line) : {Prices} Int :=
  List.foldl (fun sum line => sum + Prices.priceOf line.item * line.quantity) 0 lines

def fromTable (table : Map Text Int) (body : Unit -> {Prices | r} a) : {r} a :=
  handle body () with
  | Prices.priceOf item -> resume => resume (Option.getOr (Map.lookup item table) 0)
```

`{Prices | r}` means "`Prices` plus whatever else the body does". The handler removes `Prices`
and passes the rest (`r`) through. Call `total` with no handler, and the type checker refuses the
definition:

```lean
def oops (u : Unit) : {IO} Unit := println (Int.toText (Tour.total []))
```

```text
deus: oops: unhandled ability Prices (calling Tour.total)
```

Run the program. `main` gets the command-line arguments from `IO.args`:

```bash
deus run Tour.main 12 -3 tea
```

```text
12 cups of tea cost 36
error: negative quantity -3
error: not a number: tea
```

Then look around the codebase:

```bash
deus ls Tour                 # the names under Tour
deus view Tour.total         # the source, printed back from the stored definition
deus view Tour.total --dialect ts   # the same definition in TypeScript-like syntax
deus dependents Tour.total   # what would be rehashed if it changed
deus log                     # the history of changes
```

## Recipe 2: Proving a sort correct

[`examples/sort.deus`](../examples/sort.deus) specifies insertion sort with two properties: the
output is sorted, and it is a permutation of the input. It then proves both by induction:

```lean
theorem insertSorted (x : Int) (xs : List Int) : sorted xs = true -> sorted (insert x xs) = true := by
  induction xs; auto

theorem isortSorted (xs : List Int) : sorted (isort xs) = true := by
  induction xs; simp [insertSorted]
```

```bash
deus add examples/sort.deus
deus check Sort
```

```text
  ✓ Sort.agreesWithMergeSort  tested, 200 cases
  ✓ Sort.insertCount  proved (proof)
  ✓ Sort.isortSorted  proved (proof)
  …
  ✗ Sort.wrongClaim  8 goal(s) left; first:
      h0 : if x <= xs0 then false else true
      ⊢ xs0 :: x :: [] == x :: xs0 :: []
7 passed, 1 failed
```

`wrongClaim` is false on purpose, and the prover shows the goal it could not close. The tactics
are `induction`, `simp [lemmas]`, `auto` and `decide`. `by test n` checks a claim on n generated
inputs instead of proving it, and the report says which kind of evidence each theorem has.
`by test n using g` draws each input as `g` applied to a random `Int`, for laws whose interesting
inputs random values rarely hit (D135).
[`examples/soundness.deus`](../examples/soundness.deus) lists claims the prover must refuse,
such as `x < x + 1`, which is false because `Int` wraps.

Verdicts are cached by hash. Re-running `deus check` after an unrelated change checks nothing
again. A verdict is keyed by the theorem alone, so after upgrading `deus`, `deus check --fresh`
checks every selected theorem again and replaces its kept verdict.

## Recipe 3: An HTTP service as a native binary

A web handler is a function from `Request` to `Response`. It names the abilities it uses:
`Storage` for its own key-value store, `Http` for outbound requests, `Actors` to call other
objects, and `Alarm` to wake later. [`examples/notes.deus`](../examples/notes.deus) is a notes
service with one notebook per object:

```lean
def serve (request : Request) : {Storage} Response :=
  let path := request.url
  if path == "/" then page ()
  else if path == "/notes" then Web.ok (Text.join "\n" (keys ()))
  …
```

The tests run it in memory, deterministically, with `Web.simulateMany`:

```bash
deus add platform/web.deus examples/notes.deus
deus test Notes
```

`deus serve` builds the handler into a native server and runs it. The server is the Rust kernel
with the program appended, so it starts in milliseconds and needs no Node:

```bash
deus serve Notes.serve --port 8080
```

```bash
curl -X PUT --data 'buy milk' 'localhost:8080/notes/todo?actor=alice'   # stored todo
curl 'localhost:8080/notes/todo?actor=alice'                            # buy milk
curl 'localhost:8080/notes?actor=bob'                                   # (empty: bob is another notebook)
```

`?actor=` names the object. Locally each object's storage is a directory under `./deus-data`.
To ship the server, build it as a file: `deus build Notes.serve -o notes --server`, then run
`PORT=8080 ./notes`.

## Recipe 4: The same service on Cloudflare

The same definition runs as a Cloudflare Worker. Each `?actor=` name is a Durable Object, and
`Storage` is the object's transactional storage:

```bash
deus build Notes.serve -o notes-worker --worker
cd notes-worker
npx wrangler dev          # serves it locally on workerd
npx wrangler deploy       # publishes it to your Cloudflare account
```

The output directory holds the kernel compiled to WebAssembly, the program image, a small
JavaScript Durable Object around them, and `wrangler.toml`. Nothing in `notes.deus` changes
between the three runtimes.

[`examples/tally.deus`](../examples/tally.deus) goes further: objects call each other with
`Actors.call`, and alarms deliver a request later. [`scripts/worker-test.sh`](../scripts/worker-test.sh)
runs all three examples on local workerd.

## Recipe 5: Tasks and the explorer

Issues live in the codebase. Open one about a definition:

```bash
deus task new Circle area uses 3 for pi --priority high --labels bug --link Tour.area
deus task                                   # open tasks, most urgent first
```

```text
5f9c0d63  todo     high   Circle area uses 3 for pi  [bug]
```

Use the id it printed; a prefix is enough. Take the task, then fix the definition and close the
task in the same command:

```bash
deus task set 5f9c --state doing --assignee me
cat > fix.deus <<'EOF'
namespace Tour
def area (shape : Shape) : Int :=
  match shape with
  | Shape.circle r => 314 * r * r / 100
  | Shape.rect w h => w * h
end Tour
EOF
deus update fix.deus --closes 5f9c
deus task show 5f9c
```

```text
5f9c0d63  Circle area uses 3 for pi
done · high · @me · bug

Links
  Tour.area  #411be8683d  (now #f983c61214)
    #5780348390  update fix.deus
    #6f8527d8f3  add deus/builtins.deus deus/prelude.deus examples/tour.deus
  change #5780348390  update fix.deus

History
  #bf30310f77  close 5f9c0d63 by #5780348390
  #18f0024f6f  task: set 5f9c0d63 state assignee
  #b273545861  task: open 5f9c0d63 Circle area uses 3 for pi
```

The task remembers the hash `Tour.area` had when it was linked. It also shows the changes to it
since then, and links the change that closed it.

Tasks branch and merge with the code: a task closed on a fix branch is closed when the branch
merges.

`deus explore` opens the codebase in a browser. The sidebar has the namespace tree and a search
over names and tasks. Each definition or task you open becomes a card in one workspace, so several
can be read side by side, and the open cards stay in the URL. A definition card shows its
signature and highlighted source, where each reference opens the definition it names. It also
lists the definition's dependencies, dependents and tasks. The Tasks view is a board with a
column per state.

```bash
deus explore                        # serves it on http://127.0.0.1:8080
deus explore --out site             # or writes the files
deus explore --publish origin       # or uploads them beside a remote's bundles
```

A remote can be a directory, the DEUS Worker (`deus remote add origin https://<host>/v1/<project>`), or
an R2 bucket (`deus remote add origin r2://bucket/prefix`). The Worker in
[`platform/worker/`](../platform/worker) draws each project's explorer itself from what was pushed, at
`https://<host>/@owner/project/`, so a `deus push` is all it needs. For the other remotes, `--publish`
uploads the explorer beside the remote's bundles, a republish uploads only the files that changed, and
every later `deus push` refreshes it. The toolchain's own codebase, with its tasks, is at
<https://deus.dmytro-a80.workers.dev/@dxos/toolchain/>.

`deus link` prints a definition's or a namespace's page on the remote's Worker, to paste into a task or
a review:

```bash
deus link List.map Cli              # https://<host>/@owner/project/List.map, …/Cli
```

## Where to go next

- `deus help` lists every command.
- [`docs/LLM.md`](./LLM.md) is the guide for coding agents, who use the same CLI with `--json`.
- [`docs/DESIGN.md`](./DESIGN.md) explains how the pieces fit, and
  [`docs/DECISIONS.md`](./DECISIONS.md) records why each one is the way it is.
- [`deus/`](../deus) is the compiler, type checker, prover and CLI, all written in DEUS.

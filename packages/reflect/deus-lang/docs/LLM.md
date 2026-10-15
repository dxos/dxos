# Driving DEUS from an agent

Agents use the same `deus` CLI as people. There is no separate API: read definitions with
`view`, change them by writing source and running `update`, and check the result with `test`
and `check`. Add `--json` to a command for one machine-readable JSON document on stdout
([CLI-JSON.md](./spec/CLI-JSON.md)); `compile`, `image`, `run`, `serve` and `help` ignore it. Errors go to
stderr with a non-zero exit code.

```bash
deus() { node packages/reflect/deus-lang/bin/deus.mjs "$@"; }
export DEUS_CODEBASE=$PWD/.deus     # default ~/.deus; or pass --codebase <dir>
```

## The loop

1. **Find** what to change.

   ```bash
   deus find sort --json            # [{"name":"List.sort","kind":"term","hash":"…"}]
   deus dependents List.sort --json # who will be rehashed if it changes
   ```

2. **Read** it as source. `view` prints the definition with current names for its dependencies and
   the author's names for its locals, so the text can be edited and added back as it is.

   ```bash
   deus view List.sort --json       # [{"name":…,"hash":…,"source":"def List.sort …"}]
   ```

3. **Patch** by writing the new definition to a file and running `update`. Only the definitions in
   the file change. Everything that depends on them is rewritten to the new hashes and rehashed;
   the result lists them under `propagated`.

   ```bash
   cat > /tmp/patch.deus <<'EOF'
   def List.sort (xs : List a) : List a := List.sortBy compare xs
   EOF
   deus update /tmp/patch.deus --message "sort: delegate to sortBy" --json
   ```

   Pass `--by <agent>` (and `--prompt <file>`) so the change records who made it; `deus log`
   shows it.

   `add` refuses to replace an existing name; that is how an agent avoids clobbering a definition
   it did not mean to touch.

4. **Check.** Results are cached by hash, so only what changed is re-run.

   ```bash
   deus test --json                 # tests: pass/fail and the defect message on failure
   deus check --json                # theorems: evidence level and any counterexample
   deus mdl docs/ --json            # spec blocks (e.g. perf budgets) through their extensions
   deus eval 'Code.cost (fun _ => f x)'   # the steps an expression takes, to set a budget
   deus project --json              # the project's IRI, libraries and owned subgraph
   deus layers --json               # objects per layer (spec, code, tests, proofs, results, …)
   ```

   A defect, in a test or under `deus run` (exit 70), names the definitions it passed through,
   innermost first; a tail call leaves no line:

   ```text
   ✗ Oops.fails  defect: division by zero
       at Oops.inner
       at Oops.middle
       at Oops.fails
   ```

   `DEUS_MAX_STEPS=<n>` turns a runaway program into a defect, so a hang shows a trace too.

   Code that logs, traces or counts (`Log.info`, `Trace.span`, `Metrics.counter`) has those
   abilities in its type. `deus run` prints them as JSON lines on stderr; with
   `DEUS_OTLP=<dir>` it writes OpenTelemetry JSON there instead. A test can assert on them with
   `Observe.collect`, which returns the events in order.

5. **Undo** if the change was wrong: `deus undo` steps the branch back one change; the old
   definitions are still in the store.

## Working on a branch

```bash
deus branch try-merge-sort      # create and switch
… patch, test …
deus switch main && deus merge try-merge-sort --json
```

A merge that changed the same name differently on both sides returns `"result":"conflicts"` with
the names, and writes nothing.

## Working through the codebase

The codebase is the primary version control (D101); github.com/dxos/deus-mirror backs it up every
hour, and git holds only what is not in the codebase yet (D177). Start each task with
`deus pull origin` and `deus merge origin.main` from the shared remote, and push each change when it
lands. In a codebase whose project is `https://dxos.org/deus/toolchain`,
`origin` defaults to `https://deus.dmytro-a80.workers.dev/v1/toolchain`, the DEUS Worker (D164): pulls
need nothing, and pushes need an API key in `$DEUS_API_KEY` (see SPEC-PROCESS.md for where it is).

Make changes in the codebase, not only in files: `deus update <file> --by <agent>` records who
made them, and the task they close goes in with `--closes <id>`. File what you notice while
working as tasks (`deus task new … --labels dogfood`). `deus push origin` sends the change to the
remote and refreshes its explorer; when the remote moved, it pulls, merges and pushes again. A
merge re-applies our edited definitions over theirs, so two sessions changing one recursive group
(the whole CLI is one) do not conflict unless they edited the same definition. A change to the
toolchain's own definitions also goes to git, through `python3 scripts/sync-deus.py <names…>`
(SPEC-PROCESS.md).

## Deciding without waiting

An agent working on DEUS does not wait on its user. When a design forks, it picks the option it
would recommend, records it in [`DECISIONS.md`](./DECISIONS.md) with the alternatives it
rejected, builds it, and names the choice in its next report so the user can overturn it. A
proposal in [`PROPOSALS.md`](./PROPOSALS.md) is never left "waiting on a choice". Only steps
nobody can undo (a production deploy, deleting data, a message outside the project) wait for
the user's word.

## Tasks

Issues live in the codebase beside the code (D59), so they branch and merge with it:

```bash
deus task --json                                  # open tasks, most urgent first
deus task list --about List.sort --json           # tasks attached to a definition
deus task new Sort is not stable --priority high --labels bug --link List.sort --by agent-x
deus task set 3f2a --state doing --assignee agent-x
deus task comment 3f2a "Delegating to sortBy keeps equal keys in order." --by agent-x
deus update /tmp/patch.deus --closes 3f2a --by agent-x   # done, linked to this change
deus task show 3f2a --json                        # links (and how they changed since), history
```

An id prefix is enough. A merge combines a task's fields; a field changed differently on both
sides is a conflict named `task:<id>.<field>`.

## Things that are different from files

- A definition's identity is its hash. Renaming (`mv`) never changes a hash and never breaks a
  caller.
- There is no "save then build": `update` compiles, hashes, stores, propagates and records history
  in one step.
- Two names can point at one hash (`alias`); `names #hash` lists them.

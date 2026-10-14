# Driving DEUS from an agent

Agents use the same `deus` CLI as people. There is no separate API: read definitions with
`view`, change them by writing source and running `update`, and check the result with `test`
and `check`. Add `--json` to any command for one machine-readable JSON document on stdout;
errors go to stderr with a non-zero exit code.

```bash
deus() { node packages/reflect/deus-lang/bin/deus.mjs "$@"; }
export DEUS_CODEBASE=$PWD/.deus     # or pass --codebase <dir>
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

   `add` refuses to replace an existing name; that is how an agent avoids clobbering a definition
   it did not mean to touch.

4. **Check.** Results are cached by hash, so only what changed is re-run.

   ```bash
   deus test --json                 # tests: pass/fail and the defect message on failure
   deus check --json                # theorems: evidence level and any counterexample
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

## Things that are different from files

- A definition's identity is its hash. Renaming (`mv`) never changes a hash and never breaks a
  caller.
- There is no "save then build": `update` compiles, hashes, stores, propagates and records history
  in one step.
- Two names can point at one hash (`alias`); `names #hash` lists them.

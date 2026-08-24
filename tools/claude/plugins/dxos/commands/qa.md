---
description: QA flows — list, show, and run `flow` blocks from .mdl specs against a live app
argument-hint: '[list|show|run|help] [<plugin> <flowId>] [--stage=before|test|after]'
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, Skill
---

Arguments: `$ARGUMENTS`

Run and inspect `flow QA-n` blocks — the executable test plans declared in a `## QA` section of a
`PLUGIN.mdl`, or in an `APP.mdl` for journeys that cross plugins. The dialect is defined in
`packages/reflect/deus/lang/qa.mdl`; **executing a flow is the `running-qa-flows` skill's job, and
this command does not restate it** — invoke the skill and follow it.

Enumerate flows with the plugin's own script rather than grepping:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/list-flows.mjs" [<plugin> <flowId> | filter] [--json]
```

Two positionals resolve **exactly** — `markdown QA-1` and `chess QA-1` are different flows, so a
flow id on its own is ambiguous. One positional is a loose substring match over path, id and title.

It scans every `.mdl` under the repo root (skipping dialect definitions, whose example flows are
illustrations rather than plans) and prints a numbered table: id, status, step count, title, and
the document it lives in. **The numbering is this command's addressing scheme** — a bare number in
a later message refers to that row, exactly as `/dxos:project list` works.

## Verbs

- **(bare)** — the numbered table of every flow, with `status:` per flow. Follow it with the one
  action that matters: which flow to run.
- **`list [filter]`** — the same table, narrowed by a substring matched against the document path,
  flow id, or title. `list markdown` and `list QA-1` both work.
- **`show <plugin> <flowId>`** — print one flow's block verbatim, so its `given` and its
  `before` / `test` / `after` stages can be read before committing to a run. A row number from the last table also works.
- **`run <plugin> <flowId> [--stage=…]`** — execute it, e.g. `run markdown QA-2`. A row number
  works too. Resolve with the script and **stop if it returns anything other than exactly one
  flow** — show the candidates and ask rather than guessing which was meant.
- **`help`** — this table of verbs.

## Running

`run` invokes the **`running-qa-flows`** skill and follows it — including its consent rule (name
the flow and what it will change, then wait), its `given` check, and its report format. Do not
improvise an execution path here; the skill exists because improvising one is what produced its
first three rounds of defects.

A flow has three stages — `before` (fixture), `test`, `after` (teardown) — run in that
order. **`--stage=before|test|after`** runs just one; omitted, all three run. It is a run option,
never a property of the flow: `--stage=before` stands a fixture up to inspect, `--stage=after`
tears one down, `--stage=test` re-tests against a fixture already standing.

Whenever a stage is skipped:

1. Say so beside the result, not buried after it.
2. List exactly what remains, by name.
3. Give the command that removes it later — `--stage=after`.

The next full run's `given` will refuse to start until those artifacts are gone — deliberately, so
a flow never asserts against its own residue.

## After a run

A flow that was wrong about the app is a finding, not a failure to hide. When a run contradicts the
spec, update the flow to the verified form and set its `status:`. Record anything that outlived the
run in the active project's ledger via `/dxos:project track`.

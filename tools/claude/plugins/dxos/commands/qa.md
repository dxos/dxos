---
description: Composer QA — list, show and run the `test` and `suite` blocks of .mdl specs against a live app; snapshot it
argument-hint: '[list|suites|show|run|snapshot|help] [<plugin> <testId> | <plugin> | --suite <name> | --tag <tag>] [--stage=before|steps|after]'
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, Skill
---

Arguments: `$ARGUMENTS`

Run and inspect the executable QA declared in `.mdl` specs — `test QA-n` blocks in the `## QA`
section of a `PLUGIN.mdl` or of `packages/apps/composer-app/spec/APP.mdl`, and the `suite` blocks
that group them. The dialect is `packages/reflect/deus/lang/qa.mdl`; **executing anything is the
`composer-qa` skill's job, and this command does not restate it** — invoke the skill and follow it.

Enumerate with the plugin's own script rather than grepping:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/list-tests.mjs" [<plugin> <testId> | <filter>] [--suites] [--tag <tag>] [--suite <name>] [--json]
```

Two positionals resolve **exactly** — `markdown QA-1` and `chess QA-1` are different tests, so an
id on its own is ambiguous; `app` is the short name of `APP.mdl`. One positional is a loose
substring match over path, id and title. The script prints a numbered table: `plugin:id`, status,
step counts per stage, title, and the document. **The numbering is this command's addressing
scheme** — a bare number in a later message refers to that row, exactly as `/dxos:project list`
works.

## Verbs

- **(bare)** / **`list [filter]`** — the numbered table of every test, with `status:` per test,
  narrowed by a substring matched against the document path, id, or title.
- **`suites [filter]`** — the numbered table of every `suite`, with its tags and test count.
- **`show <plugin> <testId>`** — print one test's block verbatim, so its `given` and its
  `before` / `steps` / `after` stages can be read before committing to a run. A row number from
  the last table also works.
- **`run <plugin> <testId> [--stage=…]`** — execute one test. Resolve with the script and **stop
  if it returns anything other than exactly one test** — show the candidates and ask.
- **`run <plugin>`** — every test of that document, as its implicit suite.
- **`run --suite <name>`** / **`run --tag <tag>`** — the tests of one suite, or of every suite
  carrying the tag, as one run with one report.
- **`snapshot [<since-ms>]`** — print the running QA page's `org.dxos.operation.debug.snapshot`
  as JSON (`composer-qa` §8). Needs a server and a mounted page; changes nothing.
- **`help`** — this table of verbs.

## Running

`run` invokes the **`composer-qa`** skill and follows it — its consent rule (a disposable server
you start is the approval; any other origin needs an explicit yes), its `given` check, one
operation per step through the invoker, a snapshot after every step, and its report format. Do
not improvise an execution path here; the skill exists because improvising one is what produced
its first rounds of defects.

A test has three stages — `before` (fixture), `steps`, `after` (teardown) — run in that order.
**`--stage=before|steps|after`** runs just one; omitted, all three run. It is a run option, never
a property of the test: `--stage=before` stands a fixture up to inspect, `--stage=after` tears one
down, `--stage=steps` re-tests against a fixture already standing.

Whenever a stage is skipped:

1. Say so beside the result, not buried after it.
2. List exactly what remains, by name.
3. Give the command that removes it later — `--stage=after`.

The next full run's `given` will refuse to start until those artifacts are gone — deliberately, so
a test never asserts against its own residue.

A suite run continues past a failed test; each test owns its fixture and teardown, so the next
test's `given` guards it. Tests not reached are listed as `not run`.

## After a run

A test that was wrong about the app is a finding, not a failure to hide. When a run contradicts
the spec, update the test to the verified form and set its `status:` with the date. Record anything
that outlived the run in the active project's ledger via `/dxos:project track`.

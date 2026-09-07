# Composer QA scripts

Manual testing scripts that an agent runs against a Composer dev server through the agent debug
port, and that a human follows in the browser from the same text. The `qa` skill
(`.agents/skills/qa/SKILL.md`) is the runbook: it starts the server, opens the port, runs a script
chapter by chapter, watches for errors, and writes a report. `/qa` lists the scripts here and runs
the one you pick.

Scripts complement, rather than replace, the `flow QA-n` blocks in a plugin's `PLUGIN.mdl`. A flow
is a per-plugin contract executed by `running-qa-flows` (`/dxos:qa`); a script here is an app-level
journey across plugins, written in plain markdown so anyone can add a chapter without learning the
`.mdl` dialect.

## Scripts

| Script                 | Chapters               | Last run          |
| ---------------------- | ---------------------- | ----------------- |
| [basics.md](basics.md) | 1 Spaces and documents; 2 Rename, undo and a second space; 3 Comments; 4 The assistant edits the document | see `../reports/` |

## Anatomy of a script

Each script is one markdown file. Its `## Chapter N: <title>` sections are independent: a chapter
declares what it needs (`Given`), numbered steps, and its own `Teardown`, so a run can start at any
chapter and a new chapter can be appended without touching the ones before it.

A step has three parts:

- **Do** — the human gesture, in the browser.
- **Agent** — the operation calls that perform the same step, in the notation below. No page
  scripting: an agent step is an operation the app itself exposes, so what it exercises is what the
  UI dispatches.
- **Expect** — what both actors judge. The agent judges from a `snapshot` or a query operation,
  never from an invocation's return value: a successful invocation routinely did less than the step
  intended.

Artifacts a chapter creates carry the `QA:` prefix in their name and the run id, so the teardown
and the next run's `Given` can tell them from a user's objects. **Never delete anything the current
run did not create.** A name match is not evidence of ownership; abort and say what is in the way.

## Agent notation

| Notation                             | Meaning                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `invoke <key> <input>`               | Invoke the operation with that input.                                   |
| `invoke <key> <input> in <spaceId>`  | The same, resolved against that space (database-backed operations).     |
| `snapshot [<input>]`                 | `org.dxos.operation.debug.snapshot` — the live UI state, see below.     |
| `object <uri>`                       | The live object at an `echo://<spaceId>/<objectId>` URI.                |
| `ref <uri>`                          | A reference to that object, for operations whose input is a `Ref`.      |
| `space <spaceId>`                    | The live space, for operations that take a `space`.                     |
| → capture `field` as `<name>`        | Keep a field of the result for later steps' placeholders.               |

Every line runs through the loopback port as one snippet:

```bash
node .agents/skills/composer-forensics/scripts/composer-recovery.js --session <uuid> '<snippet>'
```

and the translation is mechanical. The body runs inside `async () => { … }` with `composer` and
`dxos` in scope, so `return` is required:

| Notation                    | Snippet                                                                  |
| --------------------------- | ------------------------------------------------------------------------ |
| `invoke K I`                | `return composer.invoke('K', I)`                                         |
| `invoke K I in S`           | `return composer.invoke('K', I, { spaceId: 'S' })`                       |
| `snapshot I`                | `return composer.snapshot(I)`                                            |
| `object echo://S/O`         | `dxos.spaces('S').db.getObjectById('O')`                                 |
| `ref echo://S/O`            | `dxos.Ref.make(dxos.spaces('S').db.getObjectById('O'))`                  |
| `space S` (inside an input) | `dxos.spaces('S')`                                                       |

`composer.invoke` validates the input against the operation's schema and forwards the space id;
results come back as JSON, with ECHO objects reduced to plain data. A step whose result must be
captured is written so that the captured value is a string (an id, a DXN, a path) — a live object
cannot cross the port, which is why `create` operations return URIs and a later step names the
object by that URI.

### The snapshot

`org.dxos.operation.debug.snapshot` (plugin-debug; `composer.snapshot()` in the console) is the
agent's eyes. One call returns:

- `layout` — mode, sidebars, `workspace`, and `active` (the graph paths of the open planks, which
  `appToolkit.open` and `switchWorkspace` accept).
- `planks` — each open plank with its resolved `label`, `subject` (`dxn`, `typename`, `name`), the
  graph `actions` the UI offers for it, with their operation keys, and the `comments` threads
  anchored to its subject (id, anchor, status, messages).
- `spaces` — id, name, `SpaceState` name, and which is the default.
- `toasts` — what is on screen: title, description and button labels.
- `errors` — error-level log entries since `since` (a timestamp; default the last minute). Uncaught
  errors and unhandled rejections are forwarded into the log by the debug plugin, so a render crash
  shows up here too. Pass the run's start time as `since` and every snapshot reports the run's
  errors so far.
- `surfaces`, `attention`, `plugins`.

When a script needs something the snapshot does not report, extend the snapshot
(`packages/plugins/plugin-debug/src/operations/snapshot.ts`) rather than scripting the page.

## The page

The port lives in a page. Open it with the headless helper rather than a pane tab: a hidden tab
boots slowly or not at all, and a headless page mounts in seconds on a fresh profile.

```bash
node packages/apps/composer-app/testing/scripts/bin/qa-browser.mjs http://localhost:5182/ &
```

## Reports

Each run writes `../reports/<YYYY-MM-DD-HHMM>-<script>.md` from
[`../reports/TEMPLATE.md`](../reports/TEMPLATE.md): one row per step with pass / fail and the
observed value, the snapshot `errors` after each step, and a findings section. Reports are
gitignored so a run leaves no diff; commit one deliberately when it documents a defect worth keeping.

## Extending

1. Append a `## Chapter N` to an existing script when the journey continues from it, or add a new
   `<name>.md` and a row to the table above for a new journey.
2. Give the chapter its own `Given` and `Teardown`. Assume nothing from earlier chapters.
3. Write **Do** for the human, **Agent** in the notation above, and an **Expect** both can judge.
   `composer.operations()` on the port lists every operation the running app exposes with its
   input fields; prefer an operation the UI dispatches over one that exists only for agents.
4. Run it once through `/qa` and fix the script where the app contradicted it before committing.
   The script is the artifact; the run is how it earns its accuracy.

# Projects

## Overview

A **project** is a work-stream — one coherent effort with its own goals, task ledger, and design
record — stored as objects in a DXOS ECHO space: a project object, an owned task set, an outline
(the scratch checklist), and design documents filed as artifacts. The space is the durable,
shared source of truth: state survives context resets and new sessions, is visible live in
Composer, and is shared with other agents and humans working the same stream.

**The space is the only store.** Durable project state never goes into local files, scratch
notes, or commit messages — everything that should outlive this session goes through the tools
below.

Project tracking is distinct from any in-session todo list you keep: session todos are ephemeral
scratch for the current turn; the project is the persistent record. Use judgment about when work
warrants a project — err toward creating one.

A follow-up discovered while working a project is a task on that project (`taskCreate`) — do not
spin it off into a separate untracked thread.

## Space binding — read this before any other call

The repo pins the space its projects live in in a committed config file,
`.agents/projects/space.yml`:

```yaml
spaceId: <id>
```

1. Read the file. If it is missing, or `spaceId` is null/empty, **stop and offer setup** (below)
   — do not guess a space, and do not fall back to the session's default space (omitting
   `spaceId` targets whatever the session defaults to, which is not the same thing and must not
   be used as a silent substitute).
2. Call `whoami {}` and confirm the pinned `spaceId` appears in the session's spaces. If it does
   not, **stop and say so** — this session isn't scoped to the repo's project space.
3. Only then proceed, passing that `spaceId` on every call below.

This is a hard gate, not a suggestion: no partial writes, no fallback space. A project system
split across spaces is worse than an agent that refuses and asks the user to fix the binding.

### `/codeProject setup` — binding this repo to a space

An unbound repo is a setup prompt, not a dead end. Run this on `/codeProject setup`, and offer it
whenever the binding is missing and the user wants project work. The space is the user's choice,
so it is always a question — never an inference.

1. Call `listSpaces {}`. It returns every space the identity owns with its `spaceId` and `name`;
   that is where a space id comes from.
2. Present them as a **numbered list, by name**, and ask which number this repo's projects belong
   in:

   ```
   Which space should this repo's projects live in?
     1. Acme Product  (3 members)
     2. My Space
     3. Scratch
   ```

   `/codeProject setup <name-or-id>` skips the question when the argument unambiguously names one
   space; anything ambiguous falls back to the list.

3. Bind only on an explicit pick. Never infer from a name resembling the repo, and **"only one
   space exists" is not consent** — still ask.
4. Cross-check the pick against `whoami {}`, whose space list is the narrower one this session can
   actually write to. A space that `listSpaces` shows but `whoami` omits cannot be written; say so
   and stop rather than binding to it.
5. Write `.agents/projects/space.yml`, creating `.agents/projects/` if needed:

   ```yaml
   # The ECHO space this repo's projects live in.
   spaceId: <the id of the chosen space>
   ```

6. Confirm what happened: name the space, say the file is a repo file that wants committing, and
   that it binds every future session in this repo.

Two things setup does **not** do. It never creates a space — bind an existing one, and if the user
wants a new one they create it in Composer and re-run setup. And it never writes into the space; a
fresh binding is only a pointer, so the first `projectCreate` is what puts anything there.

## Ref envelopes

Every object reference passed into a tool is an envelope wrapping an **`echo:` URI**, not a bare
string and not a bare object id: `{"/": "echo:///<objectId>"}`. `projectGet`'s `project`,
`taskCreate`'s `taskSet`, `taskUpdate`'s `task`, `taskCreate`'s `parent` etc. all take this shape.

The URI forms, exactly:

| Form                          | Means                      |
| ----------------------------- | -------------------------- |
| `echo:///<objectId>`          | an object (three slashes)  |
| `echo://<spaceId>/<objectId>` | the same object, qualified |
| `echo://<spaceId>`            | a **space**, not an object |

The three-slash local form is canonical for objects; write that one. What is never accepted is a
bare id with no `echo:` scheme, which is the single most common way these calls fail.

**Prefer echoing back what you were given.** Tool results carry refs already in envelope form —
pass that value straight through instead of rebuilding it. Only construct an envelope when all
you hold is a bare object id, and then write the full URI: `{"/": "echo:///" + id}`.

## The shape of a project

- **Project object** — `name`; `status` (`active`|`paused`|`blocked`|`ended`); `description`
  (the one-line summary); `goals` (what done means, each `open`|`met`|`dropped`).
- **Task set** — the ledger. Phases are parent tasks (`taskCreate` with no `parent`); individual
  work items are sub-tasks (`taskCreate` with `parent: {"/": "echo:///<phase-task-id>"}`). Task `status`
  is `todo`|`in-progress`|`done`|`failed`|`cancelled`. Projects made by `projectCreate` always
  own a task set; if `projectGet` shows none (a project created some other way), bootstrap one
  before recording tasks: `createObject { typename: 'org.dxos.type.taskSet', properties: { name:
'Tasks' }, spaceId }`, then attach it with `updateObject { id: <project-id>, properties: {
taskSet: {"/": "echo:///<task-set-id>"} } }`. If the bootstrap fails, say so — do **not** claim a task
  was recorded.
- **Outline** — the free-text scratch surface (`outlineGet`/`outlineUpdate`). Keep a line
  starting `Resume:` holding the single next action, and a `Design: {"/": "echo:///<doc-id>"}` line
  pointing at the design document.
- **Design document** — the durable _why_: decisions, findings, spec. Create the text object,
  then a document whose `content` references it (`createObject` typenames `org.dxos.type.text`
  and `org.dxos.type.document`).

## When to use

- Work spans **3+ distinct steps**, multiple files, or phases.
- The work will likely outlive one session (you'll resume it later).
- The user asks for a plan, roadmap, or to track progress.
- The user uses **`/codeProject track <text>`** — always record it as a task.
- You are resuming work — call `projectGet` + `taskList` first to reload state.

**When NOT to use:**

- Throwaway one-offs (a single edit, a quick answer) — just do them.
- Chores with no single home — keep those in session scratch.
- Duplicating a session todo list — pick one; don't mirror the same list in both.

## Verbs

- **`/codeProject setup [space]`** — bind this repo to a space; see "`/codeProject setup`" above. The one
  verb that works without a binding — every other verb requires one.
- **`/codeProject` (bare)** — `projectList` (spaceId from the binding). Summarize: name, status,
  open/total task counts. If more than one project is `active`, list them numbered and ask
  which, rather than guessing.
- **`/codeProject new <name>`** — `projectCreate { name, spaceId }`, then
  `projectUpdate { project: {"/": "echo:///<id>"}, status: 'active', description: '<one-line summary>',
spaceId }`. Report the new project id.
- **`/codeProject tasks`** — `taskList { project: {"/": "echo:///<id>"}, includeSubtasks: true, spaceId }` for
  the active project; render phases (parent tasks) with their sub-tasks and statuses.
- **`/codeProject track <text>`** — `taskCreate` on the active project's task set (`taskSet` ref
  from `projectGet`; bootstrap one first if missing — see "The shape of a project"). If the text
  names a phase, create it under that phase's parent task; otherwise ask which phase if the
  project has several — never guess silently.
- **`/codeProject hydrate`** — checkpoint before stopping or handing off:
  1. Reconcile task statuses: `taskUpdate`/`taskComplete` every task whose real state has
     moved; leave a short `description` note on anything left `in-progress` (what's blocked,
     what's next).
  2. Refresh the resume pointer: `outlineUpdate` the `Resume:` line to the single next action.
  3. Update `projectUpdate.goals` if goals were met/dropped/added, and `status` if the
     work-stream's state changed.
  4. Push durable _why_ (decisions, findings) into the design document, not the outline — the
     outline is scratch, the document is the record.
  5. Confirm the checkpoint in one short block (done / in-progress / next).
- **`/codeProject end`** — close out a work-stream: run the hydrate checkpoint first, then
  `projectUpdate { project: {"/": "echo:///<id>"}, status: 'ended', spaceId }`. Ended projects stay
  queryable; nothing is deleted.
- **`/codeProject resume`** — reload at the start of a session:
  1. `projectList { spaceId }` to discover projects. If one was named, match it; otherwise pick
     the single `active` project, or ask which when several are `active` — never guess.
  2. `projectGet { project: {"/": "echo:///<id>"}, spaceId }`, then
     `taskList { project: {"/": "echo:///<id>"}, includeSubtasks: true, spaceId }`; read the outline's
     `Resume:` line.
  3. Report a concise state: done / in-progress / **next action**. Continue with the next
     action, or wait for direction if the user gave any.

## Workflow discipline

1. **At task start** — `projectList { spaceId }`, then `projectGet` + `taskList` (project ref
   and `spaceId` on both) to reload state; create the project if none exists for this stream.
2. **As you work** — update task status in the **same turn** the work completes. Never leave
   statuses stale, and never batch-update everything at the end.
3. **When parking a task** — leave a one-line note in its `description` (what's blocked, what's
   next) so it's resumable.
4. **Before claiming done** — reconcile the ledger against reality: every `done` task is
   actually complete, and no completed work is still `todo`.

## Common mistakes

| Mistake                                                            | Fix                                                                                          |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Calling a tool without checking `space.yml` / `whoami` first       | Read the binding and confirm it's in the session's spaces before any project/task call.      |
| Falling back to the session's default space when the binding fails | Stop and report the failure; never substitute an unpinned space.                             |
| Binding a space the user did not name (even the only one listed)   | Offer setup, list spaces by name, and bind only on an explicit answer.                       |
| Passing a bare id, or `echo://<id>`, where a ref is expected       | Refs wrap an `echo:` URI: `{"/": "echo:///<id>"}`. Two slashes means a space, not an object. |
| Recording project state in local files                             | The space is the only store; files don't survive across repos, sessions, or collaborators.   |
| Flat task list with no phase grouping                              | Create one parent task per phase; individual tasks are sub-tasks with `parent` set.          |
| Leaving task status stale after work lands                         | `taskUpdate`/`taskComplete` in the same turn the work completes, not batched at the end.     |
| Losing the resume pointer                                          | `outlineUpdate` the `Resume:` line at every checkpoint, not just at the very end.            |
| Writing design decisions to the outline instead of the document    | Outline = scratch/checklist; the document object is the durable design record.               |
| Duplicating a session todo list and the task set                   | Task set = durable/cross-session; session todos = in-turn scratch. Don't mirror both.        |
| Creating a new project when one for this work already exists       | `projectList` first; resume/extend the existing one instead of forking state.                |

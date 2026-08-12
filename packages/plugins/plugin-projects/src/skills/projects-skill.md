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

1. Read the file. If it is missing, or `spaceId` is null/empty, **stop and say so** — do not
   guess a space, and do not fall back to the session's default space (omitting `spaceId`
   targets whatever the session defaults to, which is not the same thing and must not be used
   as a silent substitute).
2. Call `whoami {}` and confirm the pinned `spaceId` appears in the session's spaces. If it does
   not, **stop and say so** — this session isn't scoped to the repo's project space.
3. Only then proceed, passing that `spaceId` on every call below.

This is a hard gate, not a suggestion: no partial writes, no fallback space. A project system
split across spaces is worse than an agent that refuses and asks the user to fix the binding.

## Ref envelopes

Every object reference passed into a tool is a DXN envelope, not a bare string:
`{"/": "<id>"}`. `projectGet`'s `project`, `taskCreate`'s `taskSet`, `taskUpdate`'s `task`, etc.
all take this shape. Tools return objects with `id` fields; wrap them yourself when passing them
onward — never pass a bare id where a ref is expected.

## The shape of a project

- **Project object** — `name`; `status` (`active`|`paused`|`blocked`|`ended`); `description`
  (the one-line summary); `goals` (what done means, each `open`|`met`|`dropped`).
- **Task set** — the ledger. Phases are parent tasks (`taskCreate` with no `parent`); individual
  work items are sub-tasks (`taskCreate` with `parent: {"/": "<phase-task-id>"}`). Task `status`
  is `todo`|`in-progress`|`done`|`failed`|`cancelled`.
- **Outline** — the free-text scratch surface (`outlineGet`/`outlineUpdate`). Keep a line
  starting `Resume:` holding the single next action, and a `Design: {"/": "<doc-id>"}` line
  pointing at the design document.
- **Design document** — the durable *why*: decisions, findings, spec. Create the text object,
  then a document whose `content` references it (`createObject` typenames `org.dxos.type.text`
  and `org.dxos.type.document`).

## When to use

- Work spans **3+ distinct steps**, multiple files, or phases.
- The work will likely outlive one session (you'll resume it later).
- The user asks for a plan, roadmap, or to track progress.
- The user uses **`/project track <text>`** — always record it as a task.
- You are resuming work — call `projectGet` + `taskList` first to reload state.

**When NOT to use:**

- Throwaway one-offs (a single edit, a quick answer) — just do them.
- Chores with no single home — keep those in session scratch.
- Duplicating a session todo list — pick one; don't mirror the same list in both.

## Verbs

- **`/project` (bare)** — `projectList` (spaceId from the binding). Summarize: name, status,
  open/total task counts. If more than one project is `active`, list them numbered and ask
  which, rather than guessing.
- **`/project new <name>`** — `projectCreate { name, spaceId }`, then
  `projectUpdate { project, status: 'active', description: <one-line summary> }`. Report the new
  project id.
- **`/project tasks`** — `taskList { project: {"/": id}, includeSubtasks: true, spaceId }` for
  the active project; render phases (parent tasks) with their sub-tasks and statuses.
- **`/project track <text>`** — `taskCreate` on the active project's task set (`taskSet` ref
  from `projectGet`). If the text names a phase, create it under that phase's parent task;
  otherwise ask which phase if the project has several — never guess silently.
- **`/project hydrate`** — checkpoint before stopping or handing off:
  1. Reconcile task statuses: `taskUpdate`/`taskComplete` every task whose real state has
     moved; leave a short `description` note on anything left `in-progress` (what's blocked,
     what's next).
  2. Refresh the resume pointer: `outlineUpdate` the `Resume:` line to the single next action.
  3. Update `projectUpdate.goals` if goals were met/dropped/added, and `status` if the
     work-stream's state changed.
  4. Push durable *why* (decisions, findings) into the design document, not the outline — the
     outline is scratch, the document is the record.
  5. Confirm the checkpoint in one short block (done / in-progress / next).
- **`/project resume`** — reload at the start of a session:
  1. `projectGet` the target project (ask which if more than one `active` project matches and
     none was named).
  2. `taskList { project, includeSubtasks: true }`; read the outline's `Resume:` line.
  3. Report a concise state: done / in-progress / **next action**. Continue with the next
     action, or wait for direction if the user gave any.

## Workflow discipline

1. **At task start** — `projectGet` + `taskList` to reload state; create the project if none
   exists for this stream.
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
| Passing a bare id where a ref envelope is expected                 | Wrap every object reference as `{"/": "<id>"}`.                                              |
| Recording project state in local files                             | The space is the only store; files don't survive across repos, sessions, or collaborators.   |
| Flat task list with no phase grouping                              | Create one parent task per phase; individual tasks are sub-tasks with `parent` set.          |
| Leaving task status stale after work lands                         | `taskUpdate`/`taskComplete` in the same turn the work completes, not batched at the end.     |
| Losing the resume pointer                                          | `outlineUpdate` the `Resume:` line at every checkpoint, not just at the very end.            |
| Writing design decisions to the outline instead of the document    | Outline = scratch/checklist; the document object is the durable design record.               |
| Duplicating a session todo list and the task set                   | Task set = durable/cross-session; session todos = in-turn scratch. Don't mirror both.        |
| Creating a new project when one for this work already exists       | `projectList` first; resume/extend the existing one instead of forking state.                |

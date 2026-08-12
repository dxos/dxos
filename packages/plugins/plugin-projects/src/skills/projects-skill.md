# Project

## Overview

A **project** is a work-stream — one coherent effort, usually one branch/worktree —
tracked as objects in a DXOS ECHO space: a project object, an owned task set, an
ad hoc outline (scratch checklist), and design documents filed as artifacts. This
replaces the old file-based system (`.agents/projects/registry.yml`,
per-project `TASKS.md`/`DESIGN.md`, git commits as the durability mechanism).
**The space is the only store.** Do not create or edit any local file to record
project state — no registry file, no TASKS.md, no DESIGN.md. Everything durable
goes through the MCP tools below.

It is distinct from in-session `TodoWrite`: `TodoWrite` is ephemeral scratch for
the current turn; the space is the persistent source of truth, visible across
sessions, repos, and to other agents/humans live in Composer. Use judgment about
when a project/task warrants tracking — err toward creating it.

**Never spawn a background task chip for a follow-up on work you're doing** —
that follow-up is a task (`taskCreate`) in the current project, not spun-off work.

## Space binding — read this before any other call

The repo pins the space its projects live in in a committed config file,
`.agents/projects/space.yml`:

```yaml
spaceId: <id>
```

1. Read the file. If it is missing, or `spaceId` is null/empty, **stop and say
   so** — do not guess a space, do not fall back to "no spaceId" (omitting
   `spaceId` targets whatever space the session defaults to, which is not the
   same thing and must not be used as a silent substitute).
2. Call `whoami {}` and confirm the pinned `spaceId` appears in the session's
   spaces. If it does not, **stop and say so** — the agent's session isn't
   scoped to this repo's project space.
3. Only then proceed, passing that `spaceId` on every call below.

This is a hard gate, not a suggestion: no partial writes, no fallback space, no
"I'll just use the default space for now." A project system split across spaces
is worse than an agent that refuses and asks the user to fix the binding.

## Ref envelopes

Every object reference passed into a tool is a DXN envelope, not a bare string:
`{"/": "<id>"}`. `projectGet`, `taskCreate`'s `taskSet`, `taskUpdate`'s `task`,
etc. all take this shape. Values returned from `projectCreate`/`projectList`
already come back with `id` fields you wrap yourself when passing them onward —
don't pass a bare id where a ref is expected.

## Object model (what replaces what)

| Old (file-based)                    | New (space-based)                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| `registry.yml` entry                 | a project object (`projectCreate`/`projectList`/`projectGet`)                        |
| registry `status`                    | the project `status` field: `active`\|`paused`\|`blocked`\|`ended` (`projectUpdate`)  |
| registry `summary`                   | the project `description`                                                            |
| `TASKS.md` phase (`## Phase N`)      | a parent task (`taskCreate` with no `parent`)                                        |
| `TASKS.md` individual task           | a sub-task (`taskCreate` with `parent: {"/": "<phase-task-id>"}`)                     |
| checkbox state (`- [ ]` / `- [x]`)   | task `status`: `todo`\|`in-progress`\|`done`\|`failed`\|`cancelled`                    |
| `DESIGN.md`                          | a document object (`createObject` typename `org.dxos.type.document`, plus its `org.dxos.type.text` content) filed as a project artifact |
| resume pointer (italic line)         | a line starting `Resume:` in the project's outline (`outlineUpdate`)                 |
| ad hoc scratch notes                 | the project outline generally — the free-text checklist surface (`outlineGet`/`outlineUpdate`) |

For design docs: create the text object, then the document object whose
`content` references it, via `createObject`. Record the document's id as a line
in the project outline (e.g. `Design: {"/": "<doc-id>"}`) so resume can find it
even before it shows up in `projectGet`'s artifacts list.

## When to use

- Work spans **3+ distinct steps**, multiple files, or phases.
- The task will likely outlive one session (you'll resume it later).
- The user asks for a plan, roadmap, or to track progress.
- The user uses **`/project track <text>`** — always record it as a task, never
  a task chip.
- You are resuming work — call `projectGet` + `taskList` first to reload state.

**When NOT to use:**

- Throwaway one-offs (a single edit, a quick answer) — just do them.
- Cross-project chores with no single home — keep those in `TodoWrite`.
- Duplicating `TodoWrite` — pick one; don't mirror the same list in both.

## Verbs

- **`/project` (bare)** — `projectList` (spaceId from the binding). Summarize:
  name, status, open/total task counts. If more than one project is `active`,
  list them numbered and ask which, rather than guessing.
- **`/project new <name>`** — `projectCreate { name, spaceId }`, then
  `projectUpdate { project, status: 'active', description: <one-line summary> }`.
  Report the new project id.
- **`/project tasks`** — `taskList { project: {"/": id}, includeSubtasks: true, spaceId }`
  for the resumed/active project; render phases (parent tasks) with their
  sub-tasks and statuses.
- **`/project track <text>`** — `taskCreate` on the active project's task set
  (`taskSet` ref from `projectGet`). If the text names a phase, create it under
  that phase's parent task; otherwise create it as a top-level task (or ask
  which phase if ambiguous — never guess silently for a multi-phase project).
- **`/project hydrate`** — checkpoint before stopping or opening a PR:
  1. Reconcile task statuses: `taskUpdate`/`taskComplete` every task whose real
     state has moved; leave a short `description` note on anything left
     `in-progress` (what's blocked, what's next).
  2. Refresh the resume pointer: `outlineUpdate` the `Resume:` line to the
     single next action.
  3. Update `projectUpdate.goals` if goals were met/dropped/added.
  4. Push durable *why* (decisions, findings) into the design document, not the
     outline — the outline is the scratch surface, the document is the record.
  5. Confirm the checkpoint in one short block (done / in-progress / next).
- **`/project resume`** — reload at the start of a session:
  1. `projectGet` the target project (ask which if more than one `active`
     project matches and none was named).
  2. `taskList { project, includeSubtasks: true }` — read the outline's
     `Resume:` line.
  3. Report a concise state: done / in-progress / **next action**. Continue with
     the next action, or wait for direction if the user gave any.

## Common mistakes

| Mistake                                                        | Fix                                                                                       |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Calling a tool without checking `space.yml` / `whoami` first      | Read the binding and confirm it's in the session's spaces before any project/task call.    |
| Falling back to the session's default space when the binding fails | Stop and report the failure; never substitute an unpinned space.                            |
| Passing a bare id where a ref envelope is expected                | Wrap every object reference as `{"/": "<id>"}`.                                            |
| Patching `description` when only the status changed              | `status` is its own field on `projectUpdate`; leave the summary alone.                      |
| Flat task list with no phase grouping                            | Create one parent task per phase; individual tasks are sub-tasks with `parent` set.         |
| Leaving task status stale after work lands                       | `taskUpdate`/`taskComplete` in the same turn the work completes, not batched at the end.    |
| Spawning a task chip for an in-scope follow-up                   | `taskCreate` it on the current project; chips are only for genuinely separate spin-off work. |
| Losing the resume pointer                                        | `outlineUpdate` the `Resume:` line every `/project hydrate`, not just at the very end.       |
| Writing design decisions to the outline instead of the document  | Outline = scratch/checklist; the document object is the durable design record.              |
| Duplicating `TodoWrite` and the task set                         | Task set = durable/cross-session; `TodoWrite` = in-session scratch. Don't mirror both.       |
| Creating a new project when one for this work already exists     | `projectList` first; resume/extend the existing one instead of forking state.                |

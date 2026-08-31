# Projects

## Overview

A **project** is a work-stream — one coherent effort with its own milestones, task ledger, and
design record — stored as objects in a DXOS ECHO space: a project object, an owned task set, an outline
(the scratch checklist), and design documents filed as artifacts. The space is the durable,
shared source of truth: state survives context resets and new sessions, is visible live in
Composer, and is shared with other agents and humans working the same stream.

**The space is the only store.** Durable project state never goes into local files, scratch
notes, or commit messages — everything that should outlive this session goes through the tools
below.

Project tracking is distinct from any in-session todo list you keep: session todos are ephemeral
scratch for the current turn; the project is the persistent record. Use judgment about when work
warrants a project — err toward creating one.

A follow-up discovered while working a project is a task on that project (`tasks-create`) — do not
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

### `/project setup` — binding this repo to a space

An unbound repo is a setup prompt, not a dead end. Run this on `/project setup`, and offer it
whenever the binding is missing and the user wants project work. The space is the user's choice,
so it is always a question — never an inference.

1. Call `whoami {}`. Its `spaces` array is every space this session can operate on, each with its
   `spaceId` and `name`; that is where a space id comes from.
2. Present them as a **numbered list, by name**, and ask which number this repo's projects belong
   in:

   ```
   Which space should this repo's projects live in?
     1. Acme Product  (3 members)
     2. My Space
     3. Scratch
   ```

   `/project setup <name-or-id>` skips the question when the argument unambiguously names one
   space; anything ambiguous falls back to the list.

3. Bind only on an explicit pick. Never infer from a name resembling the repo, and **"only one
   space exists" is not consent** — still ask.
4. Write `.agents/projects/space.yml`, creating `.agents/projects/` if needed:

   ```yaml
   # The ECHO space this repo's projects live in.
   spaceId: <the id of the chosen space>
   ```

5. Confirm what happened: name the space, say the file is a repo file that wants committing, and
   that it binds every future session in this repo.

Two things setup does **not** do. It never creates a space — bind an existing one, and if the user
wants a new one they create it in Composer and re-run setup. And it never writes into the space; a
fresh binding is only a pointer, so the first `projects-create` is what puts anything there.

## Ref envelopes

Every object reference passed into a tool is an envelope wrapping an **`echo:` URI**, not a bare
string and not a bare object id: `{"/": "echo:///<objectId>"}`. `projects-get`'s `project`,
`tasks-create`'s `taskSet`, `tasks-update`'s `task`, `tasks-create`'s `milestone` etc. all take this shape.

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
  (the one-line summary).
- **Milestones** — what done means, one ordered span of work per phase of the effort, in the task set
  (`tasks-create-milestone` / `tasks-move-milestone` / `tasks-delete-milestone` / `tasks-list-milestone`;
  patch a milestone's fields with `space-update-object`).
  A milestone carries `name`, `description` (what done means for it), and an optional `targetDate`;
  it stores **no status** — `tasks-list-milestone` derives `done`/`total` from the tasks filed under it, so
  progress can never disagree with the work.
- **Task set** — the ledger. Milestone membership is the task's `milestone` (`tasks-create` with
  `milestone: {"/": "echo:///<milestone-id>"}`; omit it for the backlog); sub-tasks use `parentTask`.
  Task `status` is `todo`|`in-progress`|`done`|`failed`|`cancelled`. Every project owns a task set
  from creation, so `projects-get` showing none means something is wrong — say so rather than
  recording tasks somewhere else, and do **not** claim a task was recorded.
- **Outline** — the free-text scratch surface (`tasks-get-outline`/`tasks-update-outline`). Keep a line
  starting `Resume:` holding the single next action, and a `Design: {"/": "echo:///<doc-id>"}` line
  pointing at the design document.
- **Design document** — the durable _why_: decisions, findings, spec. Create the text object,
  then a document whose `content` references it (`space-add-object` typenames `org.dxos.type.text`
  and `org.dxos.type.document`).

## Artifacts — the project's work products

A project owns a collection of **artifacts**: the durable objects the work produced (documents,
outlines, sheets, contacts, …), distinct from its tasks and its outline.

- After creating an object the user asked for while working in a project's context, file it with
  `projects-add-artifact { project, object }` so the project owns it and it appears in the project's list.
  Filing the same object twice is a no-op.
- Before searching the whole space for something the project should already hold, call
  `projects-list-artifact { project }` — it returns a DXN, type and label per artifact, and you load the
  content of the one you want.
- Design decisions and findings belong in a design **document** filed as an artifact, not in the
  outline; the outline is scratch.

In a project-scoped chat the project's reference is already bound into the context, so these two
verbs work without the space binding the slash verbs below require.

## When to use

- Work spans **3+ distinct steps**, multiple files, or phases.
- The work will likely outlive one session (you'll resume it later).
- The user asks for a plan, roadmap, or to track progress.
- The user uses **`/project track <text>`** — always record it as a task.
- You are resuming work — call `projects-get` + `tasks-list` first to reload state.

**When NOT to use:**

- Throwaway one-offs (a single edit, a quick answer) — just do them.
- Chores with no single home — keep those in session scratch.
- Duplicating a session todo list — pick one; don't mirror the same list in both.

## Verbs

- **`/project setup [space]`** — bind this repo to a space; see "`/project setup`" above. The one
  verb that works without a binding — every other verb requires one.
- **`/project` (bare)** — `space-query-objects { typename: 'org.dxos.type.project' }` (spaceId from the binding). Summarize: name, status,
  open/total task counts. If more than one project is `active`, list them numbered and ask
  which, rather than guessing.
- **`/project new <name>`** — `projects-create { name, spaceId }`, then
  `space-update-object { object: {"/": "echo:///<id>"}, properties: { status: 'active', description: '<one-line summary>' },
spaceId }`. Report the new project id.
- **`/project tasks`** — `tasks-list-milestone { project: {"/": "echo:///<id>"}, spaceId }` plus
  `tasks-list { project: {"/": "echo:///<id>"}, includeSubtasks: true, spaceId }` for the active
  project; render each milestone with its derived done/total and the tasks filed under it.
- **`/project track <text>`** — `tasks-create` on the active project's task set (`taskSet` ref
  from `projects-get`; if it is missing, stop and say so — see "The shape of a project"). If the text
  names a milestone, pass that milestone's ref; otherwise ask which milestone if the project has
  several — never guess silently.
- **`/project hydrate`** — checkpoint before stopping or handing off:
  1. Reconcile task statuses: `tasks-update { status }` every task whose real state has
     moved; leave a short `description` note on anything left `in-progress` (what's blocked,
     what's next).
  2. Refresh the resume pointer: `tasks-update-outline` the `Resume:` line to the single next action.
  3. Reconcile the milestone sequence: `tasks-create-milestone` anything newly scoped, `space-update-object`
     a description or target date that moved, `tasks-delete-milestone` what was dropped (its tasks fall
     back to the backlog). A milestone has no status to set — completing its tasks is what closes
     it. Patch the project's `status` with `space-update-object` if the work-stream's state changed.
  4. Push durable _why_ (decisions, findings) into the design document, not the outline — the
     outline is scratch, the document is the record.
  5. Confirm the checkpoint in one short block (done / in-progress / next).
- **`/project end`** — close out a work-stream: run the hydrate checkpoint first, then
  `space-update-object { object: {"/": "echo:///<id>"}, properties: { status: 'ended' }, spaceId }`. Ended projects stay
  queryable; nothing is deleted.
- **`/project resume`** — reload at the start of a session:
  1. `space-query-objects { typename: 'org.dxos.type.project' }` to discover projects. If one was named, match it; otherwise pick
     the single `active` project, or ask which when several are `active` — never guess.
  2. `projects-get { project: {"/": "echo:///<id>"}, spaceId }`, then `tasks-list-milestone` and
     `tasks-list { project: {"/": "echo:///<id>"}, includeSubtasks: true, spaceId }`; read the outline's
     `Resume:` line.
  3. Report a concise state: done / in-progress / **next action**. Continue with the next
     action, or wait for direction if the user gave any.

  A project records no branch or worktree, deliberately: each session runs in a fresh
  harness-assigned worktree and a project's original branch is usually already merged, so there is
  nothing stable to match. Never warn about a worktree/branch "mismatch" on resume — a fresh
  worktree is the expected state — and never leave the assigned worktree to chase the project's old
  one. If unmerged prior work lives elsewhere, report where it is and ask.

- **`/project spawn <N...>`** — hand numbered open tasks off to background sessions. Read the
  open tasks exactly as `/project tasks` does and number them in the **same order** — the user
  is quoting a row they just saw. With no argument, render the numbered list and ask which; never
  guess. For each selected row call this session's task-chip tool once, with a prompt that **stands
  alone**: the receiving agent has none of this conversation, so include the project name, the task
  headline and its notes verbatim, any file paths or PR numbers it references, and the project and
  task-set ids. Do **not** start the work yourself and do **not** complete the task — a chip is a
  handoff, and the task stays open until the spawned session finishes it. If this session has no
  task-chip tool, say so and stop; a subagent is not a substitute, since it would run the work now
  instead of handing it off.
- **`/project help`** — render the verbs as a markdown table (command | description), in the
  order they appear above, and nothing else: no preamble, no numbered options, no next-action
  suggestion.
- **`/project history`** — the PRs a project produced, newest first. **Not available against the
  space store yet:** `Project` has no field recording them, so there is nothing to read. Say so and
  stop rather than enumerating the branch's commits or the repo's open PRs — those include work this
  project never claimed, which is exactly the wrong answer.

## Workflow discipline

1. **At task start** — `space-query-objects { typename: 'org.dxos.type.project' }`, then `projects-get` + `tasks-list` (project ref
   and `spaceId` on both) to reload state; create the project if none exists for this stream.
2. **As you work** — update task status in the **same turn** the work completes. Never leave
   statuses stale, and never batch-update everything at the end.
3. **When parking a task** — leave a one-line note in its `description` (what's blocked, what's
   next) so it's resumable.
4. **Before claiming done** — reconcile the ledger against reality: every `done` task is
   actually complete, and no completed work is still `todo`.
5. **A follow-up you discover mid-task is a task, never a chip** — record it with `tasks-create`
   (`/project track`). `spawn` is the one sanctioned use of a chip, and it only ever acts on a
   task already recorded in the ledger.

## Common mistakes

| Mistake                                                            | Fix                                                                                          |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Calling a tool without checking `space.yml` / `whoami` first       | Read the binding and confirm it's in the session's spaces before any project/task call.      |
| Falling back to the session's default space when the binding fails | Stop and report the failure; never substitute an unpinned space.                             |
| Binding a space the user did not name (even the only one listed)   | Offer setup, list spaces by name, and bind only on an explicit answer.                       |
| Passing a bare id, or `echo://<id>`, where a ref is expected       | Refs wrap an `echo:` URI: `{"/": "echo:///<id>"}`. Two slashes means a space, not an object. |
| Recording project state in local files                             | The space is the only store; files don't survive across repos, sessions, or collaborators.   |
| Flat task list with no milestone grouping                          | Create one milestone per phase; file each task under it with `tasks-create`'s `milestone`.   |
| Leaving task status stale after work lands                         | `tasks-update { status }` in the same turn the work completes, not batched at the end.       |
| Losing the resume pointer                                          | `tasks-update-outline` the `Resume:` line at every checkpoint, not just at the very end.     |
| Writing design decisions to the outline instead of the document    | Outline = scratch/checklist; the document object is the durable design record.               |
| Duplicating a session todo list and the task set                   | Task set = durable/cross-session; session todos = in-turn scratch. Don't mirror both.        |
| Creating a new project when one for this work already exists       | Query for projects first; resume/extend the existing one instead of forking state.           |
| Spawning a task chip for a follow-up you just discovered           | Record it with `tasks-create`; `spawn` only hands off a task already in the ledger.          |
| A `spawn` prompt that assumes this conversation                    | The receiving session has none of it — restate project, task, ids and paths verbatim.        |
| Renumbering between `tasks` and `spawn`                            | Same order, same numbers; the user is quoting a row they just saw.                           |

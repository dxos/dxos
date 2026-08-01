# Task-list plugin — reconciliation and MCP verb design

Date: 2026-08-01 · Status: draft (overnight; for review) · Owner: burdon
Project: `mcp` (milestone 3, task 4). Companion to
[task-planning ⇄ Composer sync](./2026-08-01-task-planning-composer-sync-design.md).

## Problem

Three partial notions of "project/task" exist:

| Where                     | Project                                              | Task                                                | Character                                     |
| ------------------------- | ---------------------------------------------------- | --------------------------------------------------- | --------------------------------------------- |
| plugin-outliner (+#12423) | `ExternalProject` (lazily created container)         | `Task` objects converted from outline items         | document-first; tasks are promoted text lines |
| plugin-projects           | `Project` (routines, artifacts, instructions)        | none — artifacts/routines instead                   | agentic process container, not a task list    |
| @dxos/types               | `ExternalProject` ("mirrored from a remote service") | `Task` (title/status/priority/assignee/project ref) | schema only; no owning plugin                 |

Nothing owns the **task list as a first-class managed collection** (ordering, filtering,
status board, agent access). `ExternalProject`'s name also now lies — the outliner uses it for
native projects (rename tracked in `mcp` TASKS).

## Proposal (for review — not implemented)

### A new `plugin-tasks`

- Owns `Task` (and the renamed project container — see Naming) end-to-end: creation UX, a
  TaskList container (ordered, grouped by status/project), cards, app-graph nodes.
- The outliner keeps its document-first flow and **feeds** plugin-tasks: convert-to-task keeps
  creating `Task`s; plugin-tasks renders/manages them. No outliner behavior change.
- plugin-projects is orthogonal (process/agent container) and untouched; a `Project` MAY reference
  a task list, but `Task.project` continues to point at the lightweight container type.

### Naming

`ExternalProject` → `Project` collides with plugin-projects' `Project`. Options, in preference
order: (1) rename plugin-projects' type to `Workspace`/`Studio` and free `Project` for the task
container; (2) rename `ExternalProject` → `TaskProject`; (3) leave names, document the split.
Decision needed from the user; the rename is tracked separately.

### Dedicated MCP verbs vs generic object verbs

Recommendation: **keep the generic object verbs as the substrate; add a thin task verb set** —
not because the generic verbs can't express tasks, but because model ergonomics and safety differ:

- `listTasks(spaceId?, projectId?, status?)` — filtered projection (generic query can't join
  project ref + status without the model composing filters).
- `createTask(title, projectId?, status?)` — enforces defaults (status=todo) and the
  project ref envelope, the two things models get wrong with raw `createObject`.
- `updateTask(id, {title?, status?, priority?, assignee?})` — schema-checked field patch;
  no arbitrary property bag.
- `completeTask(id)` — the 90% action as one verb.

Implementation cost is small: each is a curated projection over `database.*` exactly like the
object toolkit (edge mcp-space-service pattern), plus optionally an operation set in the new
plugin so Composer agents get the same verbs. The generic verbs remain for everything else;
discovery (`listTypes`/`listOperations`) already advertises both layers.

### Relationship to the skill-sync design

The checklist-document model (companion spec) is the _ledger_ view; plugin-tasks is the
_object_ view. The outliner's convert-to-task is the promotion path between them. A later
`syncChecklist` operation could reconcile a checklist document with Task objects, but that is
explicitly out of scope until both ends are in use.

## Open questions

1. Naming decision (above) — blocks the rename task.
2. Does plugin-tasks subsume the kanban plugin's task usage, or stay independent?
3. Should task verbs live only in mcp-space-service, or as a proper operation set in the plugin
   (so Composer-side agents share them)? Leaning: plugin operation set, projected by MCP —
   same pattern as markdown/database ops.

# Task-list plugin — reconciliation and MCP verb design

Date: 2026-08-01 · Status: **RESOLVED by `claude/competent-curie-20057f`** (kept as option record) · Owner: burdon

> **Resolution (2026-08-01, user's branch):** the ontology landed differently from the proposal
> below — see the branch as source of truth:
>
> - `ExternalProject` → **`TaskSet`** (`org.dxos.type.taskSet@0.2.0`, stays in `@dxos/types`) —
>   pure container with NO task array; **membership is the ECHO parent edge** (TaskSet parents
>   root tasks, a task parents its sub-tasks; `Task.taskSet` is the backref). Sync provenance via
>   `Obj.getMeta` foreign keys.
> - `Task@0.2.0`: `project` ref removed (parent-edge containment); `assigned: Ref<Person>` →
>   `assignee: Actor.Actor` (DID / Person ref / email / name — humans AND agents); status gains
>   `failed`/`cancelled`.
> - `Outline`/`Journal` move to `@dxos/types` (`Outline@0.2.0`: `project` → `taskSet` ref;
>   typename unchanged). **plugin-outliner is subsumed by `plugin-tasks`** (new `react-ui-task`
>   package; TaskSetArticle).
> - Verbs: `TaskOperation` (`taskCreate`/`taskUpdate`/`taskComplete`/`taskAssign`, keys
>   `<plugin-tasks>.operation.*`) + `OutlineOperation` (`createOutline`/`convertToTask`/
>   `quickEntry`) in plugin-tasks; `ProjectOperation` (`create`/`createChat`/`createRoutine`) in
>   plugin-projects. Full v1 verb table incl. list/get + pagination:
>   `plugin-projects/MILESTONE-5.md` §7.2; placement §7.3 (edge mcp-space-service projects the
>   operations; `McpToolAnnotation` planned for phase 4; identity-through-the-call is the edge
>   prerequisite for assignee-bearing writes).

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

## Proposal (SUPERSEDED — historical option record)

> Everything below this line predates the resolution above and describes a `TaskList` model that
> was **not** adopted. It is kept only to show which alternatives were weighed. For the shipped
> schema, verb names, and operation keys, read the resolution block and
> `plugin-projects/MILESTONE-5.md` §7.2–7.3 — not this section.

### Unified ontology (user direction 2026-08-01)

`ExternalProject` becomes **`TaskList`** — a pure container; "external" was never a kind of
project, it is a _sync capability_ of a task list:

- **`Task`** — unchanged fields; `Task.project: Ref<ExternalProject>` → `Task.taskList:
Ref<TaskList>` (breaking; migration required).
- **`TaskList`** — `{ name?, tasks: Ref<Task>[] }`. Owns ordering (the array), the thing neither
  backrefs nor queries express. Carries optional **sync bindings** for external systems
  (Linear, GitHub): source identifier + cursor on the TaskList, per-task foreign keys in
  `@meta.keys` — the same shape plugin-connector/plugin-linear already use, so an external
  list is a TaskList with a binding, not a distinct type.
- **`Outline`** — `{ content: Ref<Text>, taskList: Ref<TaskList> }` (today's `project` ref
  renamed/retyped). The markdown checklist is the _ad hoc_ task ledger; convert-to-task promotes
  a text line into a `Task` appended to `outline.taskList`. Unconverted lines exist only as text.
- **`Project`** (plugin-projects, unchanged character: process/agent container) — gains an
  optional `outline: Ref<Outline>`, giving every Project a task ledger + promotable task list
  transitively. (Open: reference the Outline, the TaskList directly, or both.)

Ownership: `plugin-tasks` owns `Task` + `TaskList` (types move out of @dxos/types or stay with
new names — migration either way); plugin-outliner keeps `Outline` and the promotion flow;
plugin-projects consumes via the `outline` ref. Sync engines (Linear/GitHub) plug in against
`TaskList` only.

### Dedicated MCP verbs vs generic object verbs

> **Superseded:** the verb names below (`listTasks`/`createTask`/…) were the pre-decision sketch.
> The shipped verbs are `taskCreate`/`taskUpdate`/`taskComplete`/`taskAssign`/`taskList`, projected
> from the `org.dxos.plugin.tasks.operation.*` keys — see the resolution block above.

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

## Open questions — resolved

1. Naming: `ExternalProject` → `TaskSet` (stays in `@dxos/types`).
2. Kanban: still open; plugin-tasks owns the durable task surface, kanban's usage is unreconciled.
3. Placement: resolved as leaned — the verbs are a plugin operation set (plugin-tasks), projected
   by mcp-space-service, the same pattern as the markdown/database ops.

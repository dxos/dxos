# Milestone 5 — Project model unification: Tasks, Plan, Milestones, and the MCP surface

Date: 2026-08-01 · Status: v3 — Phase 0 DECIDED; ready for Phase 1 · Owner: burdon
Project: `plugin-projects` (registry). Companion to
[`USE-CASES.md`](./USE-CASES.md) (§2.7 operation channels) and the `mcp` project's
[task-plugin reconciliation](../../../agents/superpowers/specs/2026-08-01-task-plugin-reconciliation-design.md)
and [task-planning ⇄ Composer sync](../../../agents/superpowers/specs/2026-08-01-task-planning-composer-sync-design.md)
specs, which this milestone subsumes on the dxos side.
The full type inventory (current → target, by package) is tabulated in
[`DESIGN.md` § Types](./DESIGN.md#types).

Phase 0 DECIDED (user, 2026-08-01): **`ExternalProject` → `TaskSet`** — a lightweight collection
of tasks, possibly synced externally; `Project` owns one via a `tasks` property (§2). The task
plugin is a **takeover of plugin-outliner** (§4). **Milestones deferred**, leaning
`Ref<Milestone>` object over label (§5). Actor stays DID-based for agents (§3.2). Kanban adopts
the task surface; `taskList` paginates Linear-style from day one (§7).

## 1. Goal

`Project` becomes the single user-facing container for a work-stream, optionally composing:
**Goals** (what done means), **Milestones** (phasing — deferred, §5), an **Outline** (ad hoc
notes/checklist), a **TaskSet** (durable, assignable Tasks — possibly mirrored from
GitHub/Linear), and a **Plan** (an agent conversation's working set). Agent and human tasks are
the same objects, assignment is Actor-based (DID/email/ref/name), and the whole surface is
drivable over MCP with Linear-shaped verbs layered on the generic object API.

**Stage objective (dogfood): drive this milestone itself through MCP** — the loop
`Claude ⇔ mcp-space-service ⇔ EDGE ⇔ Composer` verified by the `mcp` project's milestone 1.
Each phase's acceptance is demonstrated by Claude (task-planning skill / Claude Desktop)
manipulating the real objects while Composer shows them live.

## 2. Naming: DECIDED — `TaskSet`

`ExternalProject` → **`TaskSet`** (`org.dxos.type.externalProject` → `org.dxos.type.taskSet`,
`0.1.0 → 0.2.0` with a typename migration). `Project` keeps its name and its DXN untouched.

- **TaskSet is the lightweight task container**: name/description/image, nothing agentic. A
  **native** TaskSet (created by the outliner or a project template) and a **synced** TaskSet
  (mirroring a GitHub repo's issues or a Linear project) are the same type — sync provenance is
  carried by `Obj.getMeta` foreign keys exactly as plugin-github/plugin-linear `sync.ts` already
  mark objects, not by the type name.
- **`Project.tasks?: Ref<TaskSet>`** — the umbrella owns (at most) one TaskSet, parented like
  `instructions`/`artifacts`. A synced TaskSet can be adopted by a Project (linking an existing
  mirror rather than scaffolding a native one), which is how "routines over a repo's issues"
  composes without the Project itself being the sync target.
- Resolves the earlier variants without their costs: no merge of agentic and mirror semantics
  into one type (v2 variant A), no renaming of `Project` or its plugin (v2 variant B), and the
  name says exactly what the type is.

## 3. Schema changes

### 3.1 `TaskSet` (rename of `ExternalProject`, `0.1.0 → 0.2.0`)

```ts
TaskSet {
  name?: string
  description?: string
  image?: URL                    // mirrors carry avatars
}
```

- **Membership stays the backref**: `Task.taskSet: Ref<TaskSet>` (§3.2), the pattern #12423
  established — sync-friendly (a mirror upserts Tasks without rewriting a membership array) and
  churn-free. Ordering, if the TaskList UI needs it beyond status/priority grouping, comes later
  as an explicit order field — not a ref array on TaskSet.
- Typename migration plus call sites: `@dxos/types` (`Task.project`), plugin-outliner
  (`Outline.project`, convert-to-task), plugin-github + plugin-linear (`sync.ts`,
  `materialize-target.ts`), plugin-space, plugin-onboarding exemplar, translations.

### 3.2 `Task` (`0.1.0 → 0.2.0`)

```ts
Task {
  title, description?, priority?               // unchanged
  status: 'todo' | 'in-progress' | 'done' | 'failed' | 'cancelled'   // +failed +cancelled (Plan parity)
  assignee?: Actor                             // WAS assigned: Ref<Person>
  estimate?: number                            // unchanged
  taskSet?: Ref<TaskSet>                       // WAS project: Ref<ExternalProject>
  // milestone — DEFERRED, see §5
}
```

- **`assignee: Actor`** (rename from `assigned`, Linear-normative). `Actor`
  (`@dxos/types/Actor`, the `Message.sender` shape) already carries
  `role / contact: Ref<Person> / identityDid / email / name` — so a task can be assigned to a
  HALO identity (DID), a bare email, a Person record, a display name, or an agent
  (`role: 'assistant'` + `identityDid`/`name`). Human and agent assignment are the same field.
  DECIDED (Phase 0): no `Ref<Agent>` variant — DID identifies an agent; `Agent` carries the DID
  once populated (ties into DESIGN.md "Agent ↔ Project convergence").
  Migration wraps the old ref: `assigned: ref` → `assignee: { contact: ref }`.
- The tri-state `todo/in-progress/done` stays the human-visible core; `failed`/`cancelled` exist
  so a delegated agent task and a human task share one status vocabulary (see §6).

### 3.3 `Project` (`0.2.0 → 0.3.0`) — all new fields optional

```ts
Project {
  name?, description?, instructions?, routines, artifacts?   // unchanged
  goals?: Goal[]                 // lightweight inline structs
  outline?: Ref<Outline>         // ad hoc notes/checklist (surface: plugin-tasks)
  tasks?: Ref<TaskSet>           // owned (or adopted synced) task container
  plan?: Ref<Plan>               // standing project plan (distinct from per-chat Chat.plan, §6)
  // milestones — DEFERRED, see §5
}

Goal = Schema.Struct({ id: string, text: string, status?: 'open' | 'met' | 'dropped' })
```

- **Goals as inline structs, not a document**: goals want per-item status and MCP
  addressability, but no body/artifacts — a full ECHO type would be ceremony. Promote later only
  if goals grow content. (Same reasoning applied to milestones pointed the other way — §5.)
- **Type placement RESOLVED by TaskSet**: publishable plugins (plugin-tasks, github/linear sync)
  reference `TaskSet`/`Task`/`Outline` — all in `@dxos/types` — and never `Project` itself, so
  `Project` **stays in `@dxos/compute`** with its `Instructions`/`Routine` refs fully typed
  (compute already depends on types, so `Ref<TaskSet>` types cleanly). The old deferred item
  "move Project out of compute" stays deferred on its own merits.
- **`Outline` moves to `@dxos/types`** (it is `{name, content: Ref<Text>}` with no plugin
  logic), making the plugin-tasks takeover surface-only over shared types. `Outline.project`
  is renamed `Outline.taskSet` in the same sweep.

## 4. Plugin: take over plugin-outliner (DECIDED)

No new plugin. **plugin-outliner is renamed `plugin-tasks`** and becomes the owner of the task
surface — it already holds the adjacent UX (outline editing, convert-to-task, the task Form
article, link-label sync from #12423) and, once `Outline` moves to `@dxos/types`, owns no data
types, so the rename is a surface refactor rather than a data migration.

- **Keeps**: the outline article and editor extensions, convert-to-task (now filing into a
  `TaskSet`), the schema-driven task Form.
- **Gains**: TaskList container (ordered, grouped by status — by milestone when §5 lands),
  Actor-aware assignee chips (resolve `contact` ref → Person, else DID/email/name),
  task cards (CardContent surface like `RoutineCard`), task operations
  (`TaskOperation.Create/Update/Complete/Assign`), app-graph nodes for tasks under a project.
- **plugin-projects** stays the agentic/process plugin and composes: ProjectArticle gains Goals
  and Tasks sections (the Tasks section embeds plugin-tasks' TaskList over `project.tasks` via
  surface), outline link, and its templates can scaffold or adopt a TaskSet.
- **Kanban (DECIDED)**: the kanban plugin adopts plugin-tasks' Task/TaskList model for its task
  boards rather than keeping a parallel notion.
- Boundary rule: plugin-tasks owns task/outline surfaces and operations; plugin-projects owns
  project lifecycle, agentic wiring, and composition. Neither imports the other's components —
  composition is via surfaces/operations only.

## 5. Milestones: DEFERRED (Phase 0)

Not in this milestone's schema changes. Direction when it lands (user, 2026-08-01): milestones
will likely need their own metadata (target date, status, description, external ids — GitHub
milestones and Linear projectMilestones both carry more than a name), so prefer a **`Milestone`
ECHO type with `Task.milestone?: Ref<Milestone>`** over the label-style id considered in v1 of
this doc. Revisit after studying the external systems' field sets against native needs; nothing
in §3 blocks adding the type and ref later (`Task` bumps again or ships the optional ref in a
minor revision). A natural home would be `Milestone.taskSet: Ref<TaskSet>` (definitions belong
to the container, as in both external systems).

## 6. Plan ⇄ Task reconciliation (and the planning skill)

Model statement: **`Task` is the durable work item — human or agent. `Plan` is a conversation's
working set over work**, feed-persisted with the chat, cheap to churn. Ad hoc work lives in
either an Outline (document-first) or a Plan (conversation-first); both have the same
**promotion path** to Task objects — the outliner's convert-to-task (#12423) is that path for
documents, and this milestone adds the equivalent for plans.

Changes:

1. **`Plan.Task` gains `taskRef?: Ref<Task>`** — a plan entry promoted to (or seeded from) a
   durable Task. When present, status reads/writes go through the ref (the Task is the source of
   truth); unpromoted entries behave exactly as today. `delegated`/`agentPid` stay plan-side:
   they are execution state of the supervisor loop, not task semantics. Agent assignment on the
   durable side is `Task.assignee` (`role: 'assistant'`).
2. **Status parity**: Task adopts `failed`/`cancelled` (§3.2) so promotion never lossy-maps.
3. **Planning-skill operations grow the promotion verbs**: `promote-task` (plan entry → Task in
   the project's TaskSet, sets `taskRef`) and `adopt-tasks` (seed plan entries from a task
   query, e.g. "my open tasks in this set"). In project scope (chat parented to a Project with
   `tasks` set), `update-tasks` on a promoted entry writes through.
4. **`Project.plan`** is the standing, cross-conversation plan (e.g. the milestone plan);
   `Chat.plan` remains per-conversation scratch. The supervisor/reconcile loop is unchanged — it
   operates on whatever Plan it is handed.
5. **task-planning skill (repo-side)**: per the sync spec, `TASKS.md` documents can live as
   Composer documents (`tasksDxn`). With Tasks as objects, the skill's checklist lines and
   Task objects meet through the same promotion path; a `syncChecklist` reconciler stays out of
   scope until both ends are in daily use (as the reconciliation spec concluded).

## 7. MCP surface

### 7.1 Layering — yes, three layers (extending USE-CASES.md §2.7)

§2.7 gives plugin operations three channels _inside_ the app (skills / runnable routines /
hybrid). MCP is the **fourth channel: the same operations projected to external agents**
(Claude Desktop, `dx` CLI, task-planning skill). The API layers as:

1. **Generic object layer** (exists, edge #785): `createObject / getObject / updateObject /
deleteObject / queryObjects` + discovery (`listPlugins / listTypes / listOperations`),
   `whoami / listSpaces`. Substrate; can express everything, ergonomic for nothing.
2. **Domain verb layer** (this milestone): project/task verbs defined **as operation sets in the
   plugins** (`ProjectOperation.*` in plugin-projects, `TaskOperation.*` in plugin-tasks) and
   **projected as MCP tools** by mcp-space-service — one definition serves Composer agents
   (channels 1–3) and MCP (channel 4). Verbs enforce what models get wrong with raw
   `createObject`: defaults (`status: 'todo'`), the ref envelope, schema-checked patches,
   filtered projections.
3. **Aspect grouping**: tools are namespaced by domain and the projection is **opt-in per
   operation** via an `McpToolAnnotation` on the operation definition (name, tool description,
   safety class) so `listOperations` discovery and the projected tool list stay one source of
   truth. Start with a hand-curated projection table in mcp-space-service (the existing
   pattern); move to annotation-driven once the operation registry carries schemas end-to-end.
   If tool-count bloat bites clients, aspects become server-side toolset filters
   (`/mcp?toolsets=tasks,projects`) — defer until needed.

### 7.2 Verb set (Linear-shaped; camelCase per the existing tool surface)

Naming follows the deployed `createObject`-style camelCase (review finding 2026-08-01), grouped
by domain prefix:

| Verb                     | Shape (cf. Linear MCP)                                                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `projectList`            | `list_projects` — id/name/status summary rows                                                                                          |
| `projectGet`             | `get_project` — full: goals, task summary, artifact list                                                                               |
| `projectCreate`          | `save_project` — template-driven (`ProjectOperation.Create` exists)                                                                    |
| `projectUpdate`          | goals/description patch                                                                                                                |
| `taskList`               | `list_issues` — filters: `taskSetId? / projectId? / status? / assignee?`; paginated (`after`/`limit`, Linear-style — DECIDED, day one) |
| `taskCreate`             | `save_issue` — defaults status, resolves taskSet ref, optional assignee                                                                |
| `taskUpdate`             | schema-checked field patch (title/status/priority/assignee/estimate)                                                                   |
| `taskComplete`           | the 90% action as one verb                                                                                                             |
| `planGet` / `planUpdate` | read/write a Project's standing plan (promotion verbs ride along)                                                                      |

Milestone verbs follow §5 when it lands. Deliberately not in v1: comments (no comment model on
Task yet), cycles (no sprint concept), external side-effects (`send`/sync-push — per §2.7's
side-effect policy gap, external writes need a per-project allowance first). Sync remains
**pull-based mirroring** by plugin-github/plugin-linear; MCP writes touch native objects only
until that policy exists.

**Prerequisite carried from the mcp-space-service review (2026-08-01)**: `invokeOperation`
receives no caller identity today, and legacy grants bypass the space-context check — tolerable
for anonymous object CRUD in dev, but `taskUpdate`/`taskComplete` with an `assignee` model is
only meaningful when the caller identity is trustworthy. Identity-through-the-call lands with
(or before) the verb layer on the edge side.

### 7.3 Placement

- dxos: operation sets + handlers in plugin-projects (project/plan verbs) and plugin-tasks
  (task verbs); registered like `markdown.update`.
- edge: mcp-space-service projection (new tool defs calling operation-service `invoke`), PR to
  dxos/edge; activates on the next `@dxos/*` pin bump — same rhythm as #12423/#785.

## 8. Implementation plan

Phasing note: each phase lands independently (one PR each, own tests); the MCP dogfood
(Phase 5) starts as soon as Phase 1 gives it real objects, not at the end.

- **Phase 0 — decisions**: DECIDED 2026-08-01 — `TaskSet` (Project.tasks owns it); plugin-outliner
  takeover as plugin-tasks; milestones deferred (Ref-to-object lean); DID-based agent
  assignment; Project stays in `@dxos/compute` (TaskSet dissolved the placement question);
  kanban adopts the task surface; taskList paginates from day one.
- **Phase 1 — schema + migrations** (`@dxos/types`, `@dxos/compute`): ExternalProject → TaskSet
  typename migration; Task 0.2.0 (`assignee: Actor`, `taskSet` rename, status additions) +
  migration (`assigned` → `{contact}` wrap); Project 0.3.0 (`goals/outline/tasks/plan`);
  Outline → `@dxos/types` (+ `taskSet` rename); call-site sweep (outliner, github/linear sync,
  space, onboarding, translations). Unit + migration tests.
  _Acceptance_: existing UC stories green; outliner convert-to-task files into a `TaskSet`.
- **Phase 2 — plugin-outliner → plugin-tasks takeover**: rename + the surface additions of §4;
  ProjectArticle Goals/Tasks sections in plugin-projects; templates scaffold/adopt a TaskSet.
  _Acceptance_: create project → add tasks → assign (person + agent) → status grouping, all in
  Composer; play tests in `stories-projects`.
- **Phase 3 — Plan reconciliation**: `Plan.Task.taskRef`, write-through status, planning-skill
  `promote-task`/`adopt-tasks` operations, `Project.plan`. _Acceptance_: eval — agent plans in a
  project chat, promotes two entries, human flips one to done in the TaskList, agent's
  reconcile sees it.
- **Phase 4 — MCP verbs**: operation sets (§7.2) + `McpToolAnnotation`; edge PR projecting
  them (with the identity prerequisite from §7.2); TESTING.md runbook extension. _Acceptance_:
  `dx mcp` / mcp-smoke drives `projectCreate → taskCreate → taskComplete` and Composer shows
  each step live.
- **Phase 5 — MCP-first dogfood (runs alongside 2–4)**: recreate THIS milestone as a Project in
  the shared space (per mcp TASKS "shared composer space to track projects and tasks"): goals =
  §1, tasks = this plan in the project's TaskSet, assignees = burdon + agent Actors;
  task-planning skill points its registry entry at it (`tasksDxn` when the sync spec lands).
  Every phase demo'd over the tunnel from Claude Desktop. _Acceptance_: this file's checklist
  state is readable from both Composer and MCP without divergence.

## 9. Open questions

All Phase 0 questions are resolved (§8 Phase 0). Remaining, non-blocking:

1. TaskSet ordering: does the TaskList UI need explicit ordering beyond status/priority
   grouping, and if so an order field on Task vs an order array on TaskSet (§3.1 leans field).
2. Kanban adoption mechanics — same-PR as Phase 2 or a follow-up once TaskList settles.
3. Comment model on Task (needed before `commentCreate`-style verbs; Linear parity).

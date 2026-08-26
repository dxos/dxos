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
of tasks, possibly synced externally; `Project` owns one via `taskSet` (§2). The task
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
- **`Project.taskSet?: Ref<TaskSet>`** — the umbrella owns (at most) one TaskSet (briefly an array on 2026-08-01; reverted to a single ref 2026-08-02, user), parented like
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

- **Membership is the ECHO parent edge** (REVISED 2026-08-01 from the `Task.taskSet` backref):
  a TaskSet parents its root tasks (`Query.children()`), still sync-friendly (a mirror upserts
  Tasks and sets the parent, no membership array to rewrite) and churn-free, plus structural
  deletion cascade. Ordering, if the TaskList UI needs it beyond status/priority grouping,
  comes later as an explicit order field — not a ref array on TaskSet.
- Typename migration plus call sites: `@dxos/types` (`Task.project`), plugin-outliner
  (`Outline.project`, convert-to-task), plugin-github + plugin-linear (`sync.ts`,
  `materialize-target.ts`), plugin-space, plugin-onboarding exemplar, translations.

### 3.2 `Task` (`0.1.0 → 0.2.0`)

```ts
Task {
  title, description?, priority?               // unchanged
  status: 'todo' | 'started' | 'done' | 'failed' | 'cancelled'   // +failed +cancelled (agent parity)
  assignee?: Actor                             // WAS assigned: Ref<Person>
  estimate?: number                            // unchanged
  // NO taskSet field (REVISED 2026-08-01): containment is the ECHO parent edge —
  // a TaskSet parents its root tasks; a task parents its sub-tasks (hierarchy).
  // One tree: TaskSet → Task → sub-Task; sub-task set membership is transitive.
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
- The tri-state `todo/started/done` stays the human-visible core; `failed`/`cancelled` exist
  so a delegated agent task and a human task share one status vocabulary (see §6).

### 3.3 `Project` (`0.2.0 → 0.3.0`) — all new fields optional

```ts
Project {
  name?, description?, instructions?, routines, artifacts?   // unchanged
  goals?: Goal[]                 // lightweight inline structs
  outline?: Ref<Outline>         // ad hoc markdown checklist — the scratch surface (§6)
  taskSet?: Ref<TaskSet>         // owned (or adopted synced) task container
  // NO plan field (REVISED 2026-08-01): Plan is removed — see §6
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

## 6. Two forms of work: Plan is REMOVED (REVISED 2026-08-01)

Model statement (canonical writeup: DESIGN.md § "Product model"): **markdown checklists are the
cheap, fluid form of work; ECHO `Task` objects in a `TaskSet` are the durable, assignable form;
promotion links the two.** The earlier v3 design (`Plan.Task.taskRef` bridge) is superseded —
`Plan` was a parallel task model that existed only because durable tasks weren't cheap enough to
churn; with parent-edge containment they are, and the scratch form is markdown, not structs.

Changes:

1. **`Plan` is deleted** (`org.dxos.type.plan`, `Chat.plan`, `Project.plan`, the `Plan.Task`
   struct, TaskList/PlanArticle data source). A conversation's working set is its **outline**
   (markdown checklist) plus the open Tasks it has promoted.
2. **Chat scratch surface**: a standalone chat lazily owns an `Outline`
   (`Chat.outline?: Ref<Outline>`); a project chat resolves and writes the **project's**
   outline (`Obj.getParent(chat)` → `Project.outline`, created lazily).
3. **Promotion** is the outliner's convert-to-task (#12423): the markdown line carries the
   `echo://` link back, label-synced. The same path serves users (editor toolbar) and agents
   (planning-skill operation).
4. **Delegation requires a durable Task** — delegating is the moment scratch becomes real. The
   supervisor reconcile loop operates on Task objects (children of the working TaskSet);
   `assignee` (`role: 'assistant'` + DID) records who; the process ↔ task mapping lives
   process-side (a Process annotation carrying the task ref), never as a pid stamped on the
   task.
5. **Planning skill retargets**: `update-tasks` edits the chat's outline markdown
   (checkbox lines); `plan-reminder` reads unchecked outline items + open promoted Tasks;
   promotion verb added. The project skill stays the filing/context skill (artifacts). The
   boundary: planning = task work, project = filing; both over shared types.
6. **task-planning skill (repo-side)**: unchanged conclusion — `TASKS.md` checklist lines and
   Task objects meet through the same promotion path; a `syncChecklist` reconciler stays out of
   scope until both ends are in daily use.

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
   operation** via an `McpToolAnnotation` on the operation definition (§7.4) so `listOperations`
   discovery and the projected tool list stay one source of truth. If tool-count bloat bites
   clients, aspects become server-side toolset filters (`/mcp?toolsets=tasks,projects`) — defer
   until needed.

### 7.2 Verb set (Linear-shaped; camelCase per the existing tool surface)

Naming follows the deployed `createObject`-style camelCase (review finding 2026-08-01), grouped
by domain prefix:

Status as of 2026-08-02 — "app" = defined in a plugin here, "edge" = projected as an MCP tool:

| Verb                           | Shape (cf. Linear MCP)                                                                                                  | app | edge                               |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | --- | ---------------------------------- |
| `projectList`                  | `list_projects` — id/name/description + task-set and goal counts                                                        | ✓   | ✗ (pending)                        |
| `projectGet`                   | `get_project` — goals, per-task-set open/total, outline markdown, artifact list                                         | ✓   | ✗ (pending)                        |
| `projectCreate`                | `save_project` — template-driven; **NOT projectable**: resolves `Capability.Service` (app-only)                         | ✓   | n/a                                |
| `projectUpdate`                | name/description/goals patch (goals replaced wholesale)                                                                 | ✓   | ✗ (pending)                        |
| `taskList`                     | `list_issues` — filters `taskSet`/`project`/`status`/`assignee`/`includeSubtasks`; paginated (opaque `after` + `limit`) | ✓   | ✓ (edge to switch to the app verb) |
| `taskCreate`                   | `save_issue` — defaults status, resolves taskSet ref, optional assignee                                                 | ✓   | ✓                                  |
| `taskUpdate`                   | schema-checked field patch (title/status/priority/assignee/estimate)                                                    | ✓   | ✓                                  |
| `taskComplete`                 | the 90% action as one verb                                                                                              | ✓   | ✓                                  |
| `taskAssign`                   | set the `Actor` (person ref/email/name, or agent by DID)                                                                | ✓   | ✓                                  |
| `outlineGet` / `outlineUpdate` | read/write the checklist markdown; update upserts items by title (preserving prose) or replaces wholesale               | ✓   | ✗ (pending)                        |

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

### 7.3 Placement — who owns what (RATIFIED 2026-08-02)

**dxos defines, edge projects.** Every MCP tool in §7.2 is an operation defined in a plugin
(plugin-projects, plugin-tasks) and annotated for projection; mcp-space-service turns annotated
operations into tools and never hand-rolls a verb of its own. A tool that exists only edge-side
is a defect in this contract, not a shortcut — it drifts the moment the app-side model changes.

- **dxos** (this repo): operation definitions + handlers + `McpToolAnnotation`; registered like
  `markdown.update`.
- **edge**: reads the annotation off the operation registry and projects; owns transport, auth,
  identity, and the tunnel. Activates on the next `@dxos/*` pin bump — same rhythm as
  #12423/#785.
- **Known exception — app side now closed (2026-08-02)**: `taskList` shipped edge-side first,
  with no app-side definition. It now exists here (`TaskOperation.ListTasks`) with the §7.2
  filters and pagination; edge switches to the projected verb and deletes its local one.
- **Not everything is projectable, and that is fine**: `projectCreate`/`createChat`/
  `createRoutine` resolve `Capability.Service` (templates, plugin registry) which exists only
  inside the app. They stay app-only; the projected surface is reads plus field patches. If
  remote project creation is wanted later it needs a capability-free creation path, not a
  projection of these.

### 7.4 `McpToolAnnotation` — the projection contract

Follows the existing operation-annotation pattern (`VisibleAnnotation` / `IdempotentAnnotation`
in `@dxos/compute/Operation`): an `Annotation.make` id + schema, a pipeable combinator applied at
the definition site, and a reader. Critically, `Operation.serialize` already carries
`meta.annotations` into the `PersistentOperation` record, so the edge reads the marker off the
operation registry — no shared build, no curated table.

```ts
// @dxos/compute/Operation
export const McpToolAnnotation = Annotation.make({
  id: 'org.dxos.operation.mcp-tool',
  schema: Schema.Struct({
    /** Tool name as exposed to MCP clients; camelCase, domain-prefixed (e.g. `taskCreate`). */
    name: Schema.String,
    /** Model-facing description; when absent the operation's own description is used. */
    description: Schema.optional(Schema.String),
    /**
     * Safety class, mapped by the server to MCP tool hints:
     * `read` → readOnlyHint; `write` → mutates space data; `destructive` → deletes/irreversible.
     */
    safety: Schema.Literal('read', 'write', 'destructive'),
    /** Aspect/toolset for future server-side filtering (`/mcp?toolsets=tasks`). */
    aspect: Schema.optional(Schema.String),
  }),
});

export const mcpTool = (props: McpTool) => annotate(McpToolAnnotation, props);
export const getMcpTool = (op: PersistentOperation): McpTool | undefined => …;
```

Applied at the definition site:

```ts
export const CompleteTask = Operation.make({ … }).pipe(
  Operation.mcpTool({ name: 'taskComplete', safety: 'write', aspect: 'tasks' }),
);
```

**Rules a projected operation must satisfy** (all three learned the hard way in the 2026-08-02
edge smoke — see the mcp project ledger):

1. **Refs in, JSON out.** Inputs take `Ref.Ref(T)`, never a live ECHO object (a ref envelope
   cannot decode into one); outputs return `Entity.toJSON` snapshots, never live proxies (the RPC
   layer returns handler output raw, so a proxy arrives as `{}`). Same contract as
   `database.objectCreate`.
2. **Serializable schemas.** Input/output schemas must survive `Operation.serialize`'s
   json-schema contract — a `serialize.test.ts` regression test per operation set is mandatory,
   because a single unserializable annotation breaks _every_ space-scoped invocation on a
   registry that contains the operation, not just its own listing.
3. **Worker-safe handlers.** Anything the edge registers runs in workerd: handler modules must
   import only effect/compute/echo/types — no React, no `.pcss`, no app-toolkit UI. Plugins that
   are registered whole need a `*.workerd.ts` entry (see `TasksPlugin.workerd.ts`); handlers that
   cannot be made worker-safe are registered as an explicit handler set, schema-only.

**Identity prerequisite (unchanged)**: `invokeOperation` carries no caller identity and legacy
grants bypass the space-context check. `taskAssign`/`taskUpdate` are only _meaningful_ once the
caller is trustworthy; identity-through-the-call lands with (or before) the write verbs on the
edge side.

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
- **Phase 3 — Plan removal + retarget** (REVISED 2026-08-01, folded into the Phase 1 branch):
  delete `Plan`/`Chat.plan`/`Project.plan`; `Chat.outline` scratch surface (project chats write
  the project outline); planning skill retargets to outline markdown + promotion; delegation
  operates on durable Tasks (process-side task ref, no `agentPid`); TaskList/PlanArticle
  retarget. _Acceptance_: eval — agent brainstorms in the outline, promotes two items, human
  flips one to done in the TaskList, agent's reconcile sees it.
- **Phase 4 — MCP verbs** (IN PROGRESS 2026-08-02; ownership split ratified in §7.3 — dxos
  defines, edge projects):
  - _dxos (this repo)_: `McpToolAnnotation` per §7.4; the missing read-side verbs —
    `taskList` (closing the §7.3 exception), `projectList`/`projectGet`/`projectUpdate`,
    `outlineGet`/`outlineUpdate`; annotate the already-shipped write verbs; per-operation-set
    `serialize.test.ts`; workerd-safety audit of every projected handler (plugin-projects needs
    the `*.workerd.ts` check that plugin-tasks already has).
  - _edge_: switch projection from the hand-curated table to the annotation, delete its local
    `taskList`, land identity-through-`invokeOperation`; TESTING.md runbook extension.
  - _Acceptance_: `dx mcp` / mcp-smoke drives `projectCreate → taskCreate → taskComplete` and
    Composer shows each step live (task half already verified 2026-08-02 over OAuth); every
    §7.2 row reads ✓/✓.
- **Phase 5 — MCP-first dogfood (runs alongside 2–4)**: our own build process IS the primary
  use case (user, 2026-08-01) — the repo-side planning artifacts map one-to-one onto product
  objects and migrate into Composer as soon as the loop is live:

  | Repo-side (today)                        | Product object (target)                          |
  | ---------------------------------------- | ------------------------------------------------ |
  | `.agents/projects/registry.yml` entry    | `Project` "plugin-projects" in the shared space  |
  | `TASKS.md` (the ledger being edited now) | `Project.outline` — THE Outline document         |
  | checked/unchecked ledger items           | promoted `Task` objects (parent: the TaskSet)    |
  | `DESIGN.md`, `MILESTONE-5.md`            | `Project.artifacts` documents                    |
  | `$track` sentinel                        | `taskCreate` / outline append (MCP verb)         |
  | `$hydrate` / `$resume` handoff           | `outlineGet`/`taskList` reads — no handoff file  |
  | this Claude session                      | an MCP client of mcp-space-service (peer agent's |
  |                                          | server work supports exactly this interaction)   |

  Goals = §1, assignees = burdon + agent Actors; the task-planning skill points its registry
  entry at the Project (`tasksDxn` when the sync spec lands). Every phase demo'd over the
  tunnel from Claude Desktop. _Acceptance_: this file's checklist state is readable from both
  Composer and MCP without divergence — at which point TASKS.md is promoted into Composer and
  the repo copy becomes the mirror, not the source.

## 9. Open questions

All Phase 0 questions are resolved (§8 Phase 0). Remaining, non-blocking:

1. TaskSet ordering: does the TaskList UI need explicit ordering beyond status/priority
   grouping, and if so an order field on Task vs an order array on TaskSet (§3.1 leans field).
2. Kanban adoption mechanics — same-PR as Phase 2 or a follow-up once TaskList settles.
3. Comment model on Task (needed before `commentCreate`-style verbs; Linear parity).

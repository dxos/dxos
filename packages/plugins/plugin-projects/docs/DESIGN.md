# plugin-projects — Design

Tracker: `./TASKS.md`

## Concept

`Project` is a user-facing container for interactive, long-running work, loosely
modeled on Claude Desktop projects: instructions (with skills and sentinel
commands), routines, artifacts, and AI chat sessions that run in project context.

plugin-projects is a **seminal core plugin**: it unifies subject-matter grouping,
automation scoping, and project-scoped assistance, and other plugins are expected
to extend it (via artifacts, templates) or use projects directly. It is intended
to be one of the core aspects of Composer.

## Product model: two forms of work (decided 2026-08-01)

> **Markdown checklists are the cheap, fluid form of work; ECHO `Task` objects in a
> `TaskSet` are the durable, assignable form; promotion links the two.**

- **Ad hoc**: a markdown checklist (an `Outline` in a project; a chat-owned outline in a
  standalone chat) is where work is brainstormed — cheap to write, reorder, and discard,
  and equally editable by humans and agents as plain text. This is the in-product form of
  the repo's own `TASKS.md` workflow.
- **Durable**: when an item becomes real it is **promoted** to an ECHO `Task` (the
  outliner's convert-to-task pattern, #12423): the markdown line carries the `echo://`
  link back and its label follows renames. Tasks are assignable (`assignee: Actor` —
  human by Person ref, agent by DID), syncable (GitHub/Linear mirrors), and queryable.
- **Structure is uni-directional refs; the parent edge is lifecycle bookkeeping only**
  (REVISED 2026-08-14 — see [Cleanup project data model](#cleanup-project-data-model-decided-2026-08-14-implemented-2026-08-15)):
  a `TaskSet` enumerates ALL its tasks (flat) and its milestones in ordered ref arrays;
  hierarchy (`task.parentTask`) and milestone assignment (`task.milestone`) are
  many-to-one refs on the task, Linear-shaped. Parent edges are still set — but only
  for deletion cascade, never as the queryable data model. This is the task-model slice
  of a broader `Project` slimming — see that section for the full scope.
- **Delegation is the promotion moment for agents**: only a durable `Task` can be
  delegated to a sub-agent — delegating is exactly when scratch becomes real. There is
  no separate `Plan` type; the conversation's working set IS its outline plus the open
  tasks it has promoted.
- **A project tracks both forms**: `Project.outline` (scratch surface) and
  `Project.taskSet` (the durable container). Project chats write the project's outline;
  standalone chats own theirs.

**Status (2026-08-03).** The loop is proven in CI by two play stories in
`stories-assistant/Chat.stories.tsx`: `WithPlanningScripted` (the planning skill's
title-keyed upsert rewrites checklist items in place rather than duplicating them) and
`WithSubAgentsTest2` (delegation adds an unchecked item; the supervisor's `onComplete`
checks it off). **Open gap:** promotion is still delegation-only — there is no
`promote-task` verb, so an agent cannot turn a checklist line into a durable `Task`
except by delegating it. Human convert-to-task is the only other path. (Verb specced
2026-08-14 — see "Promotion and the outline-first rule" below; tracked as M6 Phase 3.)

## Cleanup project data model (decided 2026-08-14, implemented 2026-08-15)

Slims `Project` down to the refs it actually owns and orders, and reshapes the task
model underneath it so structure is stated once, as uni-directional refs in the
schema, rather than through the ECHO parent edge. Decided in design session
(josiah × claude), session branch `claude/projects-task-sets-modeling-b5rk70`.

The through-line: **a container should state its contents in its schema, and state
them once.** Everything below follows from applying that to `Project` and then to
the task graph it points at. The parent edge is demoted to what it really is —
deletion cascade — and is no longer the membership or hierarchy mechanism.

### `Project` (`@dxos/compute`) — the slimming

Today (`org.dxos.type.project@0.3.0`): `name?`, `description?`, `status?`, `goals?`
(embedded structs), `instructions?: Ref(Instructions)` (owned), `routines: Ref[]`,
`artifacts?: Ref(Collection)`, `outline?: Ref(Outline)`, `taskSet?: Ref(TaskSet)`.

Target (`0.4.0`):

```text
name?: string
description?: string
status?: active | paused | blocked | ended
instructions?: Ref(Instructions)     // owned (Obj.setParent), cascade-delete/clone
artifacts: Ref(Obj.Unknown)[]        // INLINE ordered ref array — Collection dropped
outline?: Ref(Outline)               // shared scratch checklist (all project chats write here)
taskSet?: Ref(TaskSet)               // owned, or adopted synced mirror
```

Three fields change:

- **`artifacts` inlines.** The `Collection` indirection was never load-bearing:
  `ObjectGallery` already renders plain ref arrays (the routines gallery proved it),
  and `Instructions.objects` is precedent for an inline heterogeneous ref array.
  `ProjectSkill.artifact-add/-list` retarget to the field.
- **`goals` is REMOVED.** A milestone with a description and derived progress _is_ a
  goal with the tasks that get it done attached, so the embedded `Goal` struct was a
  second, weaker "what done means" surface. One "what done means" surface instead of
  two — see "The task model underneath" for what replaces it. The `Goal` struct and
  the read-only GoalList section go; the milestone sequence renders in their place.
- **`routines` is REMOVED.** The array duplicated what already exists: routines
  connect to their project via `instructions.objects` (seeded at creation), and
  `connectedRoutinesQuery` / `RoutineCompanion` discover them through the structural
  reverse-ref index — same as for any other object. The field and the routine→project
  parent edge were a project-shaped special case over the canonical model. The
  ProjectArticle routines gallery goes with it; routines surface in the project's
  companion only. **Sequencing (2026-08-14):** the removal lands FIRST, without
  waiting for the deletion-guard/staleness machinery below — those are planned
  follow-ups tracked separately, and the interim (deleting a project silently strands
  its routines, discoverable only via the companion of a deleted object or the
  routines list) is accepted; preferring the canonical routine model over a
  project-shaped special case is worth the window.
  **Reversed 2026-08-24 — see "Routine ownership" below.**

What's left is the line worth keeping: **refs for what the project owns and orders**
(instructions, artifacts, routines, outline, taskSet); **queries for what accumulates
around it** (chats by parent edge, agents via their chats). Chats stay parent-edge
attached — numerous, append-only, naturally time-ordered, so a ref array would be a
CRDT hot spot with no ordering benefit; this is the recorded justification for the one
deviation from schema-visible structure.

The type lives in `@dxos/compute` (next to Instructions, Skill, Trigger) so
brain/inbox/EDGE-side code can reference it without a plugin dependency.

### The task model underneath (subset of the above)

Applying the same rule one level down, to `TaskSet` — whose membership was
previously the parent edge, not reactive, not schema-visible, traversable only
child→parent, so enumerating a set meant a tree walk and `Query.children()` never
re-emitted on a member's property change. Third revision of task containment
(backref plan → parent edge in M5 → this), so the rationale is recorded in full.

### Principle

**Every structural relationship is stored exactly once, as a uni-directional ref in the
schema.** Enumeration/ownership edges point down (container → ordered ref array);
classification edges point up (many-to-one ref on the child). The ECHO parent edge is
NOT part of the data model: `setParent` means "co-loaded, cascade-deletes with" — it is
not reactive, not schema-visible, and traversable only child→parent. Operations still
set it, as lifecycle bookkeeping alongside the refs (the `Instructions.make` pattern:
ref for structure, parent for cascade).

### Schema

```text
TaskSet (org.dxos.type.taskSet)
   name?, description?, image?         meta.keys: [linear team/project | github repo]
   milestones: Array<Ref<Milestone>>   ordered — the milestone sequence
   tasks:      Array<Ref<Task>>        ordered — EVERY task in the set, flat (incl. sub-tasks)

Milestone (org.dxos.type.milestone — NEW)   meta.keys: [linear/github milestone]
   name, description?                  description carries "what done means" (absorbs Goal)
   targetDate?
   (no status — progress is % complete, computed from its tasks; Linear-shaped)

Task (org.dxos.type.task)
   title, priority?, status?, assignee?, estimate?, description?
   milestone?:  Ref<Milestone>         unset ⇒ backlog (sub-tasks: inherit nearest ancestor's)
   parentTask?: Ref<Task>              unset ⇒ root task; recursion unbounded
```

Parent-edge bookkeeping (cascade only): tasks and milestones parent to their TaskSet;
sub-tasks parent to their parent task. Consequences: deleting a set deletes everything;
deleting a task deletes its subtree; **deleting a milestone never deletes tasks** — the
delete-milestone operation sweeps `task.milestone` refs (readers treat a dangling
milestone ref as backlog anyway). Deleting a task requires sweeping its subtree's refs
out of `TaskSet.tasks` (cascade deletes the objects, not the array entries).

### Why (each of these was decisive)

1. **Enumeration.** "All tasks in the set" is one array read — no tree walk over
   milestones or sub-task recursion. This is the argument that killed both
   `Milestone.tasks` arrays and root-only `tasks` + `subtasks` arrays: each
   reintroduced recursive enumeration or double-entry membership.
2. **Single-field moves.** Re-assigning or re-parenting a task is one field write on
   one object — no paired array splices, so concurrent moves cannot duplicate or lose
   a task. The exclusivity invariant ("in exactly one milestone") holds by construction.
3. **Ordering.** Array order is canonical order; no fractional-index fields. Milestone
   sequence = `milestones` order; per-milestone and per-parent task order are induced
   from the global `tasks` order (one canonical order, views filter it). If per-context
   manual ordering is ever needed, add Linear-style per-context sort keys — not pre-paid.
4. **Schema self-description.** An agent reading the type sees the structure. The
   motivating failure: with no native phasing, agents improvised `[Phase 1]` prefixes
   in task titles.
5. **Reactivity.** `Query.children()` does not re-emit on property changes (known M5
   gap); ref arrays and ref fields are ordinary reactive reads.
6. **Linear-shaped sync.** In both Linear and GitHub the milestone is a per-issue
   pointer to a first-class entity (`Issue.projectMilestone`, `issue.milestone`), and
   sub-issues hang off `Issue.parent` — a sub-issue may carry a different milestone
   than its parent. `task.milestone` and `task.parentTask` sync as field copies;
   Milestone objects carry milestone foreign keys in `Obj.getMeta` (embedded structs
   could not). The one deliberate divergence from Linear: `TaskSet.tasks`/`milestones`
   are stored arrays where Linear uses indexed reverse lookups + `sortOrder` floats —
   the arrays are what buy cheap total enumeration and ordering without index machinery.

Derived at view time, never stored: backlog (root tasks with `milestone` unset), the
tree (group by `parentTask`), milestone groups (partition by `milestone`, order groups
by the `milestones` array), sub-task milestone inheritance (nearest ancestor's, unless
overridden — Linear's behavior), and **milestone progress** (% complete computed from
its tasks' statuses — done over non-cancelled; a milestone has no stored status).

Invariants live in the `TaskOperation` verbs (the single write path shared by UI and
agents): array entry + parent edge written together; `task.milestone` must point into
the task's own set's `milestones`; delete sweeps refs. Readers stay tolerant (dedupe by
id, dangling ref ⇒ backlog/root) since concurrent array merges can still double an entry.

Three things the implementation had to discover, recorded so the next change does not
rediscover them:

- **`db.add` cascades over refs, not parent edges.** Dropping both the `routines` ref and the
  routine's parent edge left template-scaffolded routines unreachable from the project's graph,
  so adding the project silently dropped them; they are now persisted explicitly.
- **A suspended optional schema rejects an `undefined` assignment.** `Task.parentTask` is
  self-referential (`Schema.suspend`), so clearing it needs `delete`, not `= undefined`.
- **Compare refs by entity id parsed off the URI**, never by dereferencing: a stored ref is
  local (`echo:///<id>`) while `Obj.getURI` on the object is space-qualified, so string equality
  between the two silently fails — which is also why `Ref.hasEntityId` (local-only) is not a
  general-purpose comparison. The derived-view helpers use `EID.tryParse` + `getEntityId`, which
  is what lets them run against React snapshots whose refs carry no resolver.

**Naming** (2026-08-14, second pass): `Milestone`, not `Phase` — it is the ecosystem
term (Linear and GitHub both call this entity a milestone, so sync maps name-to-name),
and it **replaces `Project.goals`**: a milestone with a description IS a goal with
tasks attached, so the embedded `Goal` struct (and the `goals` field) is removed
rather than duplicated. Goal's lifecycle maps to derived state: "met" is 100%
complete, "dropped" is deleting the milestone — no stored status on the milestone
itself. This un-defers M5's `Milestone` under its original name. `TaskSet` itself
is retained: its dual role (native container AND sync mirror of a Linear team/project
or GitHub repo) rules out native-flavored names like `Plan`; `Tracker` is the recorded
candidate if a rename is ever worth the typename churn.

### Promotion and the outline-first rule

The two-forms model gets teeth for agents:

- **Outline-first**: agents default to writing checklist lines in the outline. A line
  becomes a Task only when it (a) has/needs an assignee, (b) is being delegated (the
  existing promotion moment), or (c) must exist outside the project (external mirror,
  cross-object reference). Under-promotion is self-correcting (promote later, one
  verb); over-promotion is cleanup. This rule belongs in the ProjectSkill/planning
  skill text and the MCP code-project skill — the M5 dogfood mapping "`$track` →
  `taskCreate`" is wrong under it (`$track` writes an outline line; promotion is
  separate). Porting a `TASKS.md` means: outline near-verbatim (headings → hierarchy,
  checkbox state kept); promote only qualifying lines; done items stay markdown.
- **`promote-task` verb** (closes the delegation-only gap): given an outline line,
  create the Task in the project's TaskSet (append to `tasks`, parent-edge to the set),
  carry checkbox state into `task.status`, rewrite the markdown line with the
  `echo://` backlink (label follows renames — the existing convert-to-task contract),
  and **milestone-aware**: a line under a `## <heading>` that corresponds to a
  milestone find-or-creates the `Milestone`, appends it to `TaskSet.milestones`
  (`addMilestoneToSet`) and only then sets `task.milestone` — a milestone absent from
  the array is invisible to the derived views, and `taskCreate`/`taskUpdate` reject a
  milestone that is not a member of the task's own set. The outline's
  structure seeds the TaskSet's structure lazily, one promotion at a time.

## Background: Project, Agent, Chat, AiSession

**Agent**: a durable named actor (`org.dxos.type.agent@0.1.0`,
`@dxos/assistant-toolkit`) — its own identity DID for attributing content it
authors, markdown instructions, a primary `chat`, artifacts, subscriptions, and
an `enabled` master switch over its triggers. Where a project is scope, an agent
is a participant: it is the thing that acts on a schedule or a trigger rather
than in response to a user turn.

**Project**: the user's unit of long-running work and the _scope_ a session runs
in. It owns the instructions that steer its chats (text, sentinel commands, and
the skills those chats get), the routines that automate it, a collection of
artifacts, and the chat sessions parented to it. It is inert on its own — a
project does nothing until a chat or routine runs in its context — so its whole
job is to supply that context, and every design question below is about how its
instructions, skills, and objects reach a running session.

**Chat**: a conversation (`org.dxos.type.assistant.chat@0.1.0`), deliberately
thin — essentially a `name`, a ref to a **`Feed`**, and (per this design) a ref to
the `Instructions` that steer it. The feed is the durable append-only log that
_is_ the conversation: messages, plus `Binding` records of the skills and objects
bound to it. The feed is parented to its chat, and a `CompanionTo` relation
attaches a chat to whatever object it accompanies.

**AiSession**: the runtime, and it is **feed-centric rather than chat-centric**.
`AiSession.Session` is constructed from `{ feed, runtime }` and knows nothing of
`Chat`; it owns an `AiContext.Binder` that projects the feed's `Binding` records
into live skill/object sets, and `createRequest` replays history from the feed,
formats the system prompt, then loops turns — recomputing the toolkit and system
prompt each turn so dynamically enabled skills take effect — appending every
message back to the feed. In the app that request does not run in-process:
`AgentService.getSession(feed)` spawns (or re-hydrates) a durable `AgentProcess`
whose process _target_ is the feed's DXN, so a restart recovers the whole
conversation by replaying the feed. The consequence that shapes this design:
anything a session needs beyond its feed has to be handed to it explicitly.

## Types

### Type inventory (by package)

All types relevant to the project/task/plan model in one place. "M5 target" is the Milestone 5
end-state per [`MILESTONE-5.md`](./MILESTONE-5.md) (Phase 0 decided 2026-08-01); blank = unchanged.

| Type              | Package (today)           | Role                                                                                  | M5 target                                                                                                         |
| ----------------- | ------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `Project`         | `@dxos/compute`           | Umbrella container: instructions, routines, artifacts, chats                          | 0.3.0 adds `goals` / `outline` / `taskSet: Ref<TaskSet>` / `plan`; stays in compute                               |
| `Instructions`    | `@dxos/compute`           | Prompt text + skills + objects + commands                                             |                                                                                                                   |
| `Routine`         | `@dxos/compute`           | Triggered automation (instructions or runnable operation)                             |                                                                                                                   |
| `Skill`           | `@dxos/compute`           | Toolkit definition bound into sessions                                                |                                                                                                                   |
| `ExternalProject` | `@dxos/types`             | Task container (name lies — used natively since #12423)                               | **Renamed `TaskSet`** (`org.dxos.type.taskSet@0.2.0`): lightweight, possibly externally synced                    |
| `Task`            | `@dxos/types`             | Work item: title/status/priority/assigned/estimate/project                            | 0.2.0: `assignee: Actor` (was `assigned: Ref<Person>`), `taskSet` (was `project`), +`failed`/`cancelled`          |
| `Actor`           | `@dxos/types` (struct)    | Identity shape (`Message.sender`): role/contact/DID/email/name                        | Also `Task.assignee` — agents by DID, no `Ref<Agent>` variant                                                     |
| `Person`          | `@dxos/types`             | Contact record; target of `Actor.contact`                                             |                                                                                                                   |
| `Milestone`       | — (does not exist)        | Milestone span within a TaskSet (≙ Linear/GitHub milestone); replaces `Project.goals` | M6 (un-defers M5's `Milestone`): ECHO type, `task.milestone?: Ref<Milestone>`, `TaskSet.milestones` ordered array |
| `Outline`         | `plugin-outliner`         | `{name, content: Ref<Text>}` hierarchical checklist document                          | **Moves to `@dxos/types`**; `project` field renamed `taskSet`                                                     |
| `Plan`            | `@dxos/assistant-toolkit` | Conversation working set: embedded tasks driving supervisor loop                      | `Plan.Task` gains `taskRef?: Ref<Task>` (promotion / write-through)                                               |
| `Chat`            | `@dxos/assistant-toolkit` | Conversation: feed + `instructions` ref + `plan`                                      |                                                                                                                   |
| `Agent`           | `@dxos/assistant-toolkit` | Identity/preset owning no conversation state                                          | Assignment target only via DID on `Actor`                                                                         |
| `Collection`      | `@dxos/echo`              | Ordered ref collection (no longer used by `Project.artifacts`)                        |                                                                                                                   |
| `Text`            | `@dxos/schema`            | CRDT text (content of `Outline`, documents)                                           |                                                                                                                   |

Plugin ownership after M5: **plugin-tasks** (renamed plugin-outliner) owns the TaskSet/Task/
Outline surfaces and `TaskOperation.*`; **plugin-projects** owns Project lifecycle, agentic
wiring, and composition; **plugin-github / plugin-linear** sync into `TaskSet`/`Task` via meta
foreign keys; **plugin-kanban** adopts the plugin-tasks model.

M6 ("Cleanup project data model", 2026-08-14) revises this table's M5 targets:
`Project.artifacts` becomes an inline ref array (`Collection` no longer used there);
`Project.routines` is REMOVED (companion join replaces it); `Project.goals` is
REMOVED (milestones replace goals); `TaskSet` gains `milestones`/`tasks` arrays and
`Task` gains `milestone`/`parentTask` refs. See "Cleanup project data model" above
for the full shape and rationale — this table is not repeated there.

### `Project` (`@dxos/compute`)

See "Cleanup project data model" (top of this document) for the current shape —
`instructions`/`artifacts`/`outline`/`taskSet` — and the rationale. Not repeated here
to avoid the two copies drifting.

### `Routine` (`@dxos/compute`)

`Routine` (`org.dxos.type.routine@0.2.0`) lives in `@dxos/compute` with its pure
helpers (`instanceOf`, `instructionsRef`, `runnableRef`), so `Project` can hold
`Ref(Routine)`. Its wiring — `wireTriggers` and the wiring `make`
(instructions/trigger parenting + `runInstructionsRef`) — stays in plugin-routine
because it depends on `RunInstructions` from `@dxos/assistant-toolkit`, which
itself depends on `@dxos/compute`.

### `Instructions.commands` (structured sentinel commands)

`Instructions` (`@dxos/compute`) carries an optional structured field:

```text
commands?: Array<{ sentinel: string; description?: string; prompt: string }>
```

Project instructions define sentinel commands (e.g. `$track …`) that chat
sessions in project context can invoke, surfaced as autocomplete in the chat
prompt. Living on `Instructions` rather than `Project` means routines and agents
get commands too.

### `Chat.instructions` (`@dxos/assistant-toolkit`)

`Chat` carries `instructions?: Ref.Ref<Instructions>` — the instructions that
steer that conversation. A project chat's ref points at the **project's own**
`Instructions` object, never a copy, so editing the project's instructions
steers every chat under it.

## Layering constraints

These are load-bearing and easy to trip over:

- `@dxos/assistant-toolkit` depends on `@dxos/compute`, so `Project` cannot hold
  typed refs to `Chat` or `Agent` — but `Chat` can hold a typed ref to
  `Instructions`.
- `@dxos/assistant-toolkit` depends on `@dxos/agent-runtime`, so neither
  `@dxos/assistant` nor `@dxos/agent-runtime` may import `Chat`. Both may import
  `@dxos/compute`, so an `Instructions` ref can travel through them.
- plugin-projects depends on `@dxos/assistant-toolkit` (the `Chat` type) and
  `@dxos/plugin-assistant` (`AssistantOperation`, via its `./types` export).
  plugin-assistant does not depend on plugin-projects.

## Plugin

`packages/plugins/plugin-projects` (`"private": true`), standard core-plugin
shape:

- `meta`, `types/` (`ProjectOperation`, capabilities, events), `translations`.
- `capabilities/`: `create-object` (navtree "+ Project": creates a Project with
  owned Instructions + task set; artifacts start empty), `app-graph-builder`,
  `navigation-resolver`, `react-surface`, `operation-handler`.
- `containers/ProjectArticle/`: header (name/description), instructions editor
  (Form + markdown text), milestone list, task set section, artifacts gallery, and a
  toolbar. Storybook story + play test.

### Extension points (seminal-plugin posture)

1. **Artifacts**: any plugin's objects can be project artifacts — the Collection
   accepts `Obj.Unknown`; no coupling required.
2. **Direct use**: types and operations are exported so other plugins can create
   or target projects (`ProjectOperation.Create`, …).
3. **Templates**: a capability for plugins to contribute project templates
   (instructions + skills + starter routines), mirroring `automation-templates`.

## Chat integration

A project's chats reach the model through two distinct channels, and the split
matters: **a ref on the Chat can put text in the prompt but cannot put skills in
the toolkit.**

- **Instructions text and commands** travel via `Chat.instructions`. Whoever
  builds the session resolves the ref and passes it down —
  `AiSession.Options.instructions` → `RunProps` → an explicit `instructions`
  parameter on `formatSystemPrompt`, which renders a `## Instructions` section
  (resolved markdown plus sentinel-command directives).
- **Skills and context objects** travel via `AiContext` bindings.
  `Project.contextBindings` supplies `instructions.skills` and
  `instructions.objects`; bindings persist as `Binding` records in the feed.
- **Commands autocomplete**: a plugin-assistant `ChatPrompt` extension reads
  `commands` from the chat's instructions and offers sentinel completion.
- Context-object stubs in the system prompt carry a `<label>`, so the model
  tool-loads a bound object only for its contents, never to identify it.

### Why instructions are a typed ref, not a binding

Instructions could ride in the context-object bindings, with
`formatSystemPrompt` recovering them by filtering `objects` for
`Obj.instanceOf(Instructions.Instructions, …)`. That dispatches on typename
rather than intent: _any_ bound `Instructions` object would steer the session, so
an Instructions object could never be bound as subject matter (e.g. "help me edit
these"). Two other options were considered and rejected: an `instructions` slot
on the `Binding` feed message (a schema bump on a type written into every
conversation feed, and the ref stays unqueryable), and walking
`Obj.getParent(feed)` to reach the chat (needs a compute-level accessor, since
the session layers may not import `Chat`).

The ref is available at every session-construction site, so nothing has to
resolve it structurally:

| Site                    | Feed from        | Chat in hand                                                                                     |
| ----------------------- | ---------------- | ------------------------------------------------------------------------------------------------ |
| `useChatProcessor`      | `chat.feed`      | yes                                                                                              |
| `run-instructions`      | `chat.feed`      | yes (routines pass their own `system` text, so this path is unaffected)                          |
| agent skill `agent.ts`  | `chatFeed`       | yes                                                                                              |
| cli `chat/processor.ts` | chat             | yes                                                                                              |
| `agent-process`         | spawn target DXN | no — but its spawner, `AgentService.getSession`, is called by `processor.ts`, which holds `chat` |

For the durable agent process the ref travels as `GetSessionOptions.instructions`
plus a persisted spawn annotation beside `Process.TargetAnnotation`. Executable
options do not survive re-hydration (`hydrateAgents` rebuilds with a bare
`makeExecutable()`), which is why the feed itself travels as the process target.

**Repointing**: spawn annotations are immutable, so editing the instructions
_text_ reaches a running process (the ref resolves fresh each turn), while
_repointing_ `chat.instructions` at a different object requires a process
restart. `AgentService.getSession` handles this the way it already handles a
model change: the instructions URI is part of the session-reuse identity (both
in the `sessionCache` comparison and against a rediscovered process's spawn
annotation on the remount path), and a mismatch terminates and respawns — the
feed replays, so history is preserved.

## Artifacts and the project skill

The artifacts array is only useful if the model can both **file** into it and
**find** from it. A `ProjectSkill`, bound into every project chat, owns that:

- **Add** an object ref to the project's artifacts array.
- **List** them, so the model can find what the project already holds
  without falling back to a space-wide search.

Filing is explicit rather than automatic: the skill's instructions tell the model
to file what it creates, and the tool call is visible in the conversation. The
alternative — intercepting object creation during a project chat and filing
everything automatically — needs a creation hook and silently captures scratch
objects, so it is not the default.

Creating artifacts of other types from a project chat (Outline, Sheet,
Organization/Contact) builds on the same skill and is tracked separately.

### The delegation strategy, and why `Plan` is not an artifact

`Chat.plan` is the one piece of durable state that stays on the conversation
rather than graduating to the project, because the supervisor loop is keyed on it.

The loop lives in `assistant-toolkit/src/supervisor/delegation-strategy.ts` and
runs after every turn:

1. **Reconcile.** Resolve the chat backed by this conversation feed, read its
   plan, and select tasks that are `delegated === true`, `in-progress`, and not
   already running. Only explicitly delegated tasks spawn sub-agents — a task
   created by ordinary planning (`update-tasks`) stays in the plan and is not
   double-delegated.
2. **Synthesize.** For each, build a minimal `Instructions` whose goal is the task
   text, bound with the supervisor's own skills **minus the delegation skill** —
   otherwise a sub-agent could recursively delegate.
3. **Spawn.** Invoke `RunInstructions` as its own process, recording the pid on
   the task record so a resumed session can reattach rather than re-spawn.
4. **Complete.** On exit, update the task's status, extract any artifact ids the
   sub-agent reported, and post a templated message back into the conversation.

That shape is why the plan is conversation-scoped. The dispatcher's unit of work
is a feed: `reconcile` and `onComplete` both receive one and resolve the chat from
it. `activeIds` — the set of running delegations — is likewise per-feed. A plan
shared by every chat in a project would put concurrent supervisors on one task
list, and nothing in the model arbitrates two agents claiming the same task or
reconciles their status writes.

So the plan is correctly the conversation's task ledger, and the artifact question
is really about **lifecycle, not schema**: should a _completed_ plan graduate into
the project's artifacts collection as a record of what was done? That is worth
doing — it is exactly the kind of durable work product the collection is for — but
it is a promotion step at completion, not a relocation of the live field. Open
until the completion signal is defined (there is no "plan is finished" state
today; tasks complete individually).

Note the field is a plain `Ref` with no relation: unlike the agent linkage, the
plan is owned by exactly one chat, so a field is the right encoding.

## Project chats

Goal: start a chat session from a project with the project already in scope, and
see that session in the navtree under its project.

### Ownership: the ECHO parent edge

A project chat is parented to its Project (`Obj.setParent(chat, project)`) and
enumerated with `Query.select(Filter.id(project.id)).children()` narrowed to
`Chat.Chat`. This needs no `Project` schema field, and the parent edge is the
ownership statement.

Rejected alternatives: a `chats: Ref<Collection>` field mirroring `artifacts`
(buys sibling ordering and drag-rearrange, costs a schema version bump); and
reusing `CompanionTo` for owned sessions (that relation is single-current by
construction, via `state.currentChat[objectUri]`, and carries no ownership edge).
`CompanionTo` still links the project's _companion_ chat.

**Risk**: a hierarchy-traversal query driving a graph connector is less exercised
than a ref-array read. If `children()` does not re-emit when a chat is newly
parented, fall back to the Collection field — only the enumeration source moves.

### Creation (revised 2026-08-24): a project chat is a companion chat

There is no project-specific chat operation. A project gets its chat the way every
other object does — `AssistantOperation.EnsureCompanionChat`, driven by the assistant's
companion-chat provisioner — and everything project-specific reaches the session through
`AssistantCapabilities.SubjectContext`:

- plugin-assistant's default provider binds the project and the skills its type declares
  via `Skill.SkillsAnnotation`.
- plugin-projects' provider adds the instructions' skills and context objects, and the
  `instructions` ref that `BindChatContext` backfills onto the chat.

Two chat lifecycles, neither project-specific:

- **Provisioned** — `EnsureCompanionChat`, fired by the provisioner for whatever plank is
  active. Transient until the first message, so an untouched companion leaves nothing behind.
- **Explicit** — `CreateCompanionChat`, behind the `+` affordances. Persisted on click, since
  a chat the user deliberately created should be in the navtree straight away.

The remaining change from the old bespoke operation: the chat opens in the companion pane
rather than its own plank, and the navtree child gives it a plank on demand.

`Chat.linkCompanion` sets the parent edge either way, so the navtree children and the
standalone-Chats exclusion below are unaffected.

### Navtree: chats as children of the project node

A `projectChats` extension in plugin-projects contributes the children (the
`TypeSection` extension that emits Project nodes makes them leaves):

- `match`: nodes whose `data` is a `Project.Project`.
- `connector`: the `children()` query above → `AppNode.makeObject` per chat.
- `url`: reuses the `chat` key with a data-dependent `path` that resolves the
  chat's parent project. Sharing one key across extensions is supported and
  intended — plugin-space's `object` key spans both collection connectors for
  exactly this reason (`@dxos/app-graph` `path-resolution.ts`) — so a chat is
  addressed the same way wherever it sits.

The Chats type-section query in plugin-assistant excludes both `CompanionTo`
sources and project-parented chats; without the second exclusion every project
chat appears twice, once under its project and once at the space level.

### Toolbar

`ProjectArticle` has a `Panel.Toolbar` (`asChild` + `Toolbar.Root`) whose
`IconButton` invokes `AssistantOperation.CreateCompanionChat({ companionTo: project })`, which
persists the chat immediately so it appears in the navtree before the first message. The same
action is contributed to the project's navtree node (`disposition: 'list-item-primary'`) so `+`
works from the tree.

## Routine ownership (decided 2026-08-24)

> **A routine is standalone unless an object owns it. Being triggered by an object is
> not ownership.**

The routines companion is gone. It answered "which routines touch this object?" with a
four-hop reverse-ref join (`connectedRoutinesQuery`), and the answer read as arbitrary:
a routine appeared because some ref path happened to reach the object, which is not the
same as the routine changing it, and changes made any other way were invisible. History
and change attribution replace it; both are deferred.

That leaves ownership explicit rather than inferred:

- `Project.routines` (`Ref(Routine)[]`) is back, alongside the routine→project parent
  edge, so a project's starter routines cascade-delete with it. Magazine gets the same
  treatment (one owned routine) in follow-up work.
- Templates seed the array via `Project.addRoutine`; nothing creates a project-owned
  routine by hand until the project-routines UI is designed.
- **An object with a parent is not listed in a top-level section**
  (`TypeSection.sectionQuery` filters `Filter.hasParent(false)`). A project's routines
  and chats are reached through the project, so no deletion guard is needed for them —
  there is no top-level row to delete. This subsumes the per-section
  `standaloneChatsQuery` the Chats section carried.
- Routine templates are all global: `appliesTo` is gone, a template that needs an object
  declares an `inputSchema` the create panel collects first, and one that cannot stand
  alone at all (the connector's Sync) sets `hidden` and is reachable only by id.

The 2026-08-14 argument for removal still stands on its own terms — the join _is_ the
canonical way to find routines that reference an object. What it got wrong is that the
question users were asking was ownership, not reference.

## Routine staleness and deletion guards (decided 2026-08-14)

Removing `Project.routines` (and the routine→project parent edge) means deleting a
project no longer cleans up its routines. Rather than special-casing projects, this is
solved by two generic mechanisms: routines referencing deleted objects is a common
problem (any object a routine watches or binds can be deleted), and deletion needing a
second look is a common problem (any type can have dependents worth surfacing).

**Sequencing (2026-08-14):** neither mechanism gates the routines-field removal. Both
are planned follow-ups (M6 Phases 4–5), addressed separately after the basic model
changes land; the interim gap is accepted and recorded in "`Project`" above.

### Staleness: three tiers by ref class

A routine's outbound refs classify by role, and the policy follows the role:

| Ref class                               | Example (Sender Ledger) | On deletion of the target                                                      |
| --------------------------------------- | ----------------------- | ------------------------------------------------------------------------------ |
| Source/input (`trigger.spec`, `.input`) | the mailbox feed        | **auto-disable** the trigger + record reason + badge in UI                     |
| Context (`instructions.objects`)        | the project             | **flag only** (companion badge + run-trace warning); the routine keeps running |
| Registry (`skills`, `runnable`)         | ProjectSkill            | cannot dangle — registry URIs, not space objects                               |

Context refs must not auto-disable: the list is heterogeneous (ten bound documents, one
deleted ⇒ the routine is degraded, not broken), and the model cannot distinguish
load-bearing context from incidental. The delete guard (below) is what protects the
load-bearing case — it moves the decision to the moment a human with intent is present.

Mechanics (both land their effect on the **Trigger** — the dispatcher never learns what
a Routine is, keeping EDGE compatible):

- **Dispatcher pre-flight**: before scheduling/firing, resolve the spec's source refs;
  tombstoned/unresolvable ⇒ persist `trigger.enabled = false` plus a new structured
  field (`disabledReason?: { kind: 'stale-dependency' | 'failure' | 'user', ref?, at }`)
  — structural disable, distinct from the transient failure cooldown. Disable is
  **lazy** (next fire attempt), which is accepted: an eager sweep would need a
  deletion watcher over the reverse-ref index for marginal benefit.
- **`RunInstructions`**: a dead context ref is skipped as today (degrade, don't crash)
  but now records a warning on the run trace (`RoutineTraceCompanion`), so degradation
  is diagnosable post-hoc instead of silent.
- **UI**: the card badge is computed live from the refs (dangling source or context ref
  via `Obj.isDeleted` on resolution), so a never-firing stale routine still shows
  flagged. A
  space-level stale-routines list (disabled-for-staleness + live dangling refs) gives
  the sweep; delete cascades trigger + instructions via the routine's own parent
  edges. Flag-and-confirm always — never auto-delete.

### Deletion guards (generic, plugin-contributed)

A capability — plugins contribute `{ appliesTo(object), check(objects) =>
Effect<GuardVerdict[]> }` with:

```text
GuardVerdict = {
  severity: 'warn' | 'block'        // gates whether plain "Continue" is offered
  message: string
  subjects?: Ref[]                  // what the guard found (rendered as a list)
  alternative?: { label, operation: DXN, input }   // AT MOST ONE per verdict
}
```

The generic delete flow collects verdicts from applicable guards; no verdicts ⇒ delete
exactly as today (confirmation-free, undo-toast — no guard, no friction). Otherwise one
card: every message; **Continue present iff no verdict is `block`**; each alternative
rendered as a button. Severity and alternative are orthogonal — all four quadrants are
meaningful (`warn` alone: "3 chats reference this"; `warn`+alt: the routines case;
`block` alone: "sync-managed mirror, would be recreated"; `block`+alt: the type case).

- **Choosing an alternative is confirm-convenient**: it runs the operation, re-runs
  the guards, and **completes the deletion automatically** — one click, done. The
  re-check (not the click) is what authorizes: the alternative clears the condition,
  and the loop verifies it, which needs no recursion policy (an alternative's own
  deletions surface in the next round). OPEN: the re-check narrows the concurrent-edit
  window but does not close it — a reference added between the re-check and the delete
  slips past the guard, so the two need one serialized transaction or a version
  precondition that aborts on a changed graph.
- **Agents get the same contract**: the delete operation fails typed
  (`DeleteGuarded { verdicts }`) with the same structured verdicts; the agent may
  cancel, invoke the alternative operation and retry, or — warn-level only — retry
  with an acknowledgement parameter (the programmatic "Continue"). `block` has no
  acknowledgement on either surface. One policy, both write paths.
- **Batch semantics**: guards receive the full deletion set and verdict over it
  (multi-select ⇒ one card, not N dialogs).
- **Undo**: an executed alternative plus the primary delete should commit as one undo
  unit — the hardest implementation detail in the design, costed up front.

First two consumers:

1. **plugin-projects**: deleting a Project with routines that merely _reference_ it (not
   the owned ones, which cascade) ⇒ `warn`, alternative = "Delete N routines". Needs a
   replacement for `connectedRoutinesQuery`, which went with the companion.
2. **Schema/space layer**: deleting a stored type with instances or views pointing at
   it ⇒ `block` (dangling-typed objects would be unopenable), alternative = "Delete
   N objects of this type". "Anything that points at the type" resolves via the same
   reverse-ref machinery.

## Agent ↔ Project convergence (analysis, decision pending)

`Agent` (`org.dxos.type.agent@0.1.0`, assistant-toolkit) accreted most of what
`Project` now owns. This section documents how each overlapping property is
actually used, proposes the target split, and analyzes the impact of refactoring
`Agent` down to it.

### Agent's current surface, and where each field is used

| Field           | Shape                           | Used by                                                                                                                                            |
| --------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`          | `string`                        | labels                                                                                                                                             |
| `did`           | `IdentityDid`                   | attribution of agent-authored content (e.g. suggestion branches); minted at runtime-identity provision, not creation                               |
| `enabled`       | `boolean`                       | `sync-triggers` propagates it to every trigger it manages                                                                                          |
| `instructions`  | `Ref<Text>` (raw markdown)      | `get-context` (returned to the model), `qualifier` (event filtering)                                                                               |
| `chat`          | `Ref<Chat>` (primary chat)      | `AgentWorker` (resolves the feed to run in), `qualifier`, `resetChatHistory`, planning/delegation tests; `makeInitialized` also adds `CompanionTo` |
| `artifacts`     | inline `{name, data: Ref}[]`    | `add-artifact` op (model files from chat context), `get-context` (lists them back to the model)                                                    |
| `subscriptions` | `Ref[]` (objects with a feed)   | `sync-triggers` → one qualifier trigger per subscription feed                                                                                      |
| `cron`          | `string`                        | `sync-triggers` → a timer trigger invoking `AgentWorker` directly                                                                                  |
| `feed`          | `Ref<Feed>` <em>deprecated</em> | input feed for subscriptions                                                                                                                       |
| `filterEvents`  | `boolean` <em>deprecated</em>   | qualifier opt-out                                                                                                                                  |

Overlap with `Project`: **instructions** (Project: `Ref<Instructions>`, typed,
with skills/objects/commands; Agent: raw `Ref<Text>`), **artifacts** (Project:
owned `Collection`, addressed by `ProjectSkill`; Agent: a private inline array
with its own `add-artifact` op), **chats** (Project: parented children + a
`CompanionTo` companion; Agent: a single owned `chat` ref _plus_ `CompanionTo`),
and **automation** (Project: `routines`; Agent: `cron` + `subscriptions` wired
imperatively by `sync-triggers`). Four parallel mechanisms for the same four
concepts.

### Target split

- **Agent** — an _identity_: `did`, a skill set, later permissions. A
  personality, not a container: it carries **no history** beyond the Chats it
  has participated in, and owns nothing.
- **Project** — the _container and chat factory_: artifacts, routines, and
  chats. A project spawns chats with different skill sets — or different Agent
  identities.
- **Chat** — the _conversational instance_: history (feed), bindings
  (artifacts, skills), steering `instructions`; **optionally references an
  Agent** as an alternative to hand-picking skills — the agent is a preset.

Use cases this must serve:

1. Ad-hoc: user starts a bare Chat, uses skills, skills create artifacts.
2. Scoped: user creates a Project; many related Chats share its artifacts.
3. Preset: user creates an Agent and applies it to a Chat (or as a project's
   default) — one pick configures identity + skills + instructions.

### Refactoring impact, field by field

**Remove `artifacts`.** Filing moves to `ProjectSkill.artifact-add` against a
Project's Collection; the agent skill's `add-artifact` op and the artifacts
half of `get-context` retire. An agent that needs durable work products gets a
Project (use case 3 composes with 2). Existing agents' inline `{name, data}`
arrays migrate into a Collection on a Project created per agent. The inline
`name` field is the one loss — Collection rows use the object's own label —
which is also the correction: naming lived on the wrong object.

**Remove `cron` (and `subscriptions`).** Both are trigger _sources_ that
`sync-triggers` compiles imperatively into `Trigger` objects. Each becomes a
Routine — timer trigger for cron, feed trigger per subscription — whose runnable
is a **relay**: qualify the event with a cheap model, and when relevant forward
it to the agent's durable process via `AgentService`/ProcessManager (decided
burdon × Dima; see PLAN.md phase C). The relay gives multiplexing (many feeds →
one process) and filtering in one construct, retires `AgentWorker`'s ephemeral
path, and dissolves `agent.feed` — today's "deprecated" but load-bearing staging
queue between qualifier and worker — into the process's durable input queue.
Accepted gap: no backpressure (relays push as triggers fire); the escape hatch
is an intermediary feed the process drains at its own pace. `enabled` stays as
the agent-level master switch only if routines gain an owner reference to gate
on — otherwise it moves to the Routine. `sync-triggers` shrinks to a migration
shim, then deletes.

**`instructions: Ref<Text>` → `Ref<Instructions>`.** The typed object carries
`skills`, `objects`, and `commands` — which is precisely the "skill set" the
target Agent needs, so this one change gives Agent its whole preset payload.
`makeInitialized` wraps its markdown into `Instructions.make({ text })`;
`get-context` and `qualifier` load `instructions.text` instead of the Text ref.
And it aligns with `Chat.instructions`: applying an agent to a chat is then
`chat.instructions = agent.instructions` — the same channel projects use, no
new plumbing.

**Invert `chat` → `Chat.agent?: Ref<Agent>`.** Today the trigger input carries
the agent and `AgentWorker` resolves `agent.chat` to find its feed. Inverted,
whatever invokes a run holds the Chat (this is already true everywhere else —
see the call-site table above) and reads `chat.agent` for identity/attribution.
"The agent's chats" becomes a query
(`Query.select(Filter.type(Chat)).where(chat.agent === …)` or the existing
`CompanionTo` relation), which also fixes the current single-chat limitation —
the `TODO(dmaretskyi): Multiple chats` on the field. `resetChatHistory` becomes
a Chat helper (rebuild the feed), not an Agent one.

### Where current Agent functionality lands

| Today (Agent)                                                            | After                                                                                                                                     |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `makeInitialized` (agent + chat + binder + CompanionTo)                  | create Agent (identity + instructions); chat creation is the chat factory's job (the companion path or ad-hoc), linked by the parent edge |
| model files an artifact (`add-artifact`)                                 | `ProjectSkill.artifact-add` into the owning project's Collection                                                                          |
| model reads its context (`get-context`)                                  | instructions via the system prompt (`chat.instructions`); artifacts via `ProjectSkill.artifact-list`; plan via the chat, unchanged        |
| scheduled run (`cron` → `sync-triggers` → timer trigger → `AgentWorker`) | Routine (timer trigger) whose run targets a chat carrying `chat.agent`                                                                    |
| subscription run (qualifier trigger per feed)                            | Routine (feed trigger); qualifier folds into the routine                                                                                  |
| `resetChatHistory`                                                       | Chat helper; the agent is untouched                                                                                                       |
| chat attribution (`did`)                                                 | unchanged — the one thing that was always identity-shaped                                                                                 |

Sequences for the three use cases, post-refactor:

1. **Ad-hoc chat**: `AssistantOperation.CreateChat` → skills bound → model
   creates artifacts; nothing owns them unless the user files them.
2. **Project chat**: the companion path → `chat.instructions` =
   project's, `ProjectSkill` bound → artifacts filed into the shared Collection.
3. **Agent as preset**: pick an Agent at chat creation → `chat.agent` = ref,
   `chat.instructions` = `agent.instructions` (skills come along inside it) →
   authored content attributed to `agent.did`. In a project, the project
   remains the container; the agent only flavors the session.

### Recommendation

Factor by **removal, not extraction**: don't introduce a shared
"artifact-holder" abstraction — make Project the only container and shrink
Agent to `name`, `did`, `instructions: Ref<Instructions>` (+ future
permissions). Sequence: (1) `instructions` typing (small, unlocks the preset
path), (2) `Chat.agent` inversion (mechanical; `AgentWorker` takes a chat),
(3) cron/subscriptions → Routines (deletes `sync-triggers`), (4) artifacts →
Project + migration. Each step ships independently; a schema bump
(0.1.0 → 0.2.0) with migration lands with step 4, when the deprecated
`feed`/`filterEvents` fields also drop.

Phased implementation plan (files, verification, risks): [`./PLAN.md`](./PLAN.md).

## UI conventions

- **Owned refs resolve reactively in articles**: a sync `.target` read never
  resolves on a cold or deep-link load, leaving the section permanently missing.
  Use `useObject(ref)` + `Obj.getReactiveOrUndefined` (see `ProjectArticle`'s
  instructions).

## Testing

- Type tests: `Project`/`Routine` schema round-trip, the `commands` field,
  `Project.contextBindings`.
- Unit: `formatSystemPrompt` renders the explicit `instructions` parameter and
  does not inline a bound `Instructions` object; the `children()`-based chat
  enumeration; `CreateChat` parenting and instructions-ref pass-through.
- Storybook: `ProjectArticle` story + play test (including the toolbar creating a
  chat that appears in the project's chat list); chat-binding story in
  stories-assistant.
- Live (manual, in Composer): create a project chat and confirm the project's
  instructions reach the system prompt in a _standalone plank_, not just the
  companion — the end-to-end check that the ref survives the agent-process
  boundary — and that the chat shows under its project in the navtree after a
  cold deep-link load.

### System test (live against a real model, out of CI)

`@dxos/assistant-evals` `src/evals/projects.eval.ts` — one scenario exercising
the whole loop, graded on database effects rather than on model wording:

1. Seed a Project with instructions and an artifacts Collection.
2. Seed a Chat under it — own feed, `instructions` pointing at the project's
   own object, parented to the project (mirrors a project companion chat).
3. Prompt the model to create a markdown document.
4. Assert the document is bound into the session context (a `Binding` record in
   the chat feed) **and** present in the project's artifacts Collection.

Step 4 is the real assertion: binding alone proves only that the session saw the
object, not that the project owns it, so this is the test that would catch the
project skill failing to file. It runs against a live model
(`DX_ANTHROPIC_API_KEY`) and stays out of CI. The eval runner gained `seed`
(space setup returning context objects + the session chat) and `types` (extra
ECHO types for the harness client) to host it.

## Open questions

- Move the `Project` type from `@dxos/compute` into this plugin, once its shape
  settles.
- Merge plugin-routine into plugin-projects — the boundary is thin now that
  `Routine` lives in `@dxos/compute`.
- Project-scoped agent roster (relation or parenting), and artifact provenance
  (which routine or agent produced what).
- Promote a completed `Plan` into the project's artifacts collection — needs a
  plan-level completion signal, which does not exist today (see "The delegation
  strategy, and why `Plan` is not an artifact").
- Remove plugin-sidekick, which this plugin obviates.

Task-level follow-ups live in `./TASKS.md`.

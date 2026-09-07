# Task Management & Delegation — Design

How the assistant tracks durable tasks and delegates them to sub-agents. Everything described
here lives in this package unless noted; the UI surface is `@dxos/react-ui-task`, the schema is
`@dxos/types` (`Task`), and the supervisor loop plumbing is `@dxos/agent-runtime`.

## Model

- **The conversation's working surface is its own ordered array of task refs** (`Chat.tasks`) —
  the shape `TaskSet.tasks` has: flat, sub-tasks included, array order canonical. `SetParent` on
  the field makes every task a child of the chat, so a conversation's checklist cascades with it.
  `Chat.addTask`/`Chat.deleteTask` write it, `Chat.loadTasks` (Effect) and `Chat.resolveTasks`
  (already-resolved refs) read it. The derived views over a task list — hierarchy, readiness,
  milestone grouping — are `Task.*` in `@dxos/types`, since they take a plain array and no
  container. A project chat's checklist is its own — `Project.taskSet` is
  the project's durable ledger, written by the project verbs, not by conversations. There is no
  markdown mirror: task status lives only on the `Task`.
- **`Task.status`**: `todo | started | done | failed | cancelled`. `started` is stamped by the
  runtime at sub-agent spawn — never by an operation — so a started agent task always means a
  live process, and an orphaned `started` is detectable.
- **`Task.dependsOn`**: execution-ordering refs (orthogonal to `parentTask` hierarchy and
  `milestone` grouping). A task is _ready_ when every dependency resolved within the checklist is
  `done` (`Task.isTaskReady`; a dangling ref reads as satisfied).

## Prompt surface

`Chat.formatChecklist` renders the checklist as numbered items:

```
1. [x] Compute 10! using the calculator
2. [ ] Compute 12^2 using the calculator
   (started; depends on 1)
```

Ordinals match the UI (`TaskList` `showOrdinals`), so the user and the model share references
("do task 2", "do the first and last"). Status/dependency notes go on their own indented line —
appended to the title, models paste them back through title-keyed upserts and duplicate tasks
(observed live).

## Skills

- **Planning** (`org.dxos.skill.planning`)
  - `update-tasks` — title-keyed upsert of durable tasks (status `todo | started | done`); the
    assistant's own execution path (mark started → work → mark done).
  - `plan-reminder` — end-of-request hook: while open tasks remain, an ephemeral model check
    decides continue-vs-stop and enqueues a continuation prompt on "continue".
- **Delegation** (`org.dxos.skill.delegation`)
  - `delegate-task` — creates a NEW durable task (queued, agent assignee) from a title.
  - `delegate-tasks` — delegates EXISTING tasks, selected by 1-based checklist ordinal or exact
    title (`tasks: (number | string)[]`), resolved server-side against checklist order. Terminal
    or already-running tasks are skipped and reported.

## Supervisor loop (delegation strategy)

`makeDelegationStrategy` (this package) + the runtime loop (`agent-runtime/agent-process.ts`):

1. **Reconcile** (after each turn AND after each delegation exits): sweep orphans (`started`
   agent tasks with no live process → `failed`), then spawn one sub-agent per _pending_ task —
   agent assignee, `todo`, not active, dependencies done. Spawning stamps `started`.
2. **Sub-agent** — a synthesized `Instructions` run via `RunInstructions` with the supervisor's
   skills inherited (minus delegation, so sub-agents cannot recurse). It signals completion via
   the `completeJob` tool.
3. **On exit** — the task is marked `done`/`failed`, artifacts are resolved into reference
   blocks, and a fold-back message is appended to the conversation (error messages only; full
   causes go to the log). The post-exit re-reconcile is what drains a delegated batch in
   dependency order without further prompting.

## completeJob (sub-agent result channel)

`operations/complete-job-tool.ts`. A dynamic tool whose JSON schema reaches the provider
verbatim, non-strict, with the handler decoding input against the same schema. Two hazards drove
this shape, both observed against the live Anthropic API:

- The structured-output transformer rewrites object members of a static tool's schema into
  typeless subschemas the API rejects.
- A schema-less `success` (`Schema.Any` under non-strict) invites invalid JSON from the model —
  digit-separated numbers (`3,628,800`) killed sub-agents reproducibly — so an undeclared output
  advertises a concrete any-JSON union instead.

The sub-agent system prompt additionally forbids digit separators and unquoted free text.

## Slash commands

`commands.ts` (this package) defines deterministic prompt shortcuts — `/task:create <title>`,
`/task:run <selectors>`, `/task:delete <selectors>` — executed client-side by `Chat.Root` on
submit (no model in the loop). Membership writes go through the shared chat primitives
(`Chat.addTask`/`Chat.deleteTask`); `/task:run`, which only patches fields, invokes the
`UpdateTask` verb. Selectors are 1-based ordinals or exact titles. `/task:run` queues the named
tasks and wakes the conversation with a scoped follow-up prompt (delegation spawns on the
supervisor's reconcile). The prompt editor (`react-ui-chat` `commands()` extension) completes `/`
commands at the prompt start (non-cycling list, command column in mono), and decorates a
completed command token as an atomic `dx-tag` pill. Binding commands to operation invocations
proper awaits a client-side harness bridge (harness-scoped operations resolve their services only
inside the agent session) — tracked in the ledger.

## UI

`TaskList` (`@dxos/react-ui-task`): status-grouped rows with `showGroupLabels` / `showOrdinals`;
a `started` task with an agent assignee spins (`ph--spinner` + `animate-spin`) — the durable
approximation of "actively worked"; the live-process signal is a tracked follow-up. `Chat.TaskList`
(plugin-assistant) renders the strip between thread and prompt.

## Demos (stories-assistant / Chat)

Seeds: three calculator tasks with A ← B ← C dependencies; a story-local Calculator skill
(`compute(expression)`) makes tool use observable. Naming: the `Test` prefix marks a play
script, the `Scripted` suffix an offline model (CI-runnable). Scripted: `TestTaskExecutionScripted`
(assistant executes task 1 itself), `TestTaskDelegationScripted` (delegates task 1 by ordinal),
`TestTaskDrainScripted` (delegates all; drains in dependency order). Live: `WithTaskDrain` —
type the prompt yourself.

## Invariants

- `started` ⇒ a live (or just-spawned) sub-agent; the sweep enforces it after crashes/reloads.
- Delegation verbs only queue (assignee + `todo`); the runtime owns `started`.
- A failed dependency never readies its dependents — a drain ends with them still `todo`.
- Sub-agents inherit the supervisor's skills minus delegation (no recursive delegation).

## Deferred (tracked in `.agents/projects/project-tasks/TASKS.md`)

- Surfacing a conversation's checklist in its project (a project view over its chats' tasks,
  now that the two are separate).
- Cancel/delete tasks (cancellation interrupting a live sub-agent).
- Task list as a launcher: per-task run state, dependencies, and direct sub-agent triggers.
- Live-process signal for the spinner (Process annotation) instead of the durable approximation.

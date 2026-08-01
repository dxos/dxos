# Sub-Agent Delegation — Design

Date: 2026-06-05
Status: Draft (approved design, pending spec review)
Area: `@dxos/compute`, `@dxos/compute-runtime`, `@dxos/assistant-toolkit`, `plugin-assistant`

## Goal

Enable an agent to **spawn and supervise sub-agents** so that a user converses with one
**main agent** directly, and that agent **delegates** units of work to sub-agents running
concurrently in the background, **tracks** them as tasks, and **proactively reports** results
back into the conversation as they finish.

## Concepts (settled)

- **Sub-agent** = a `Routine` executed via the existing `AgentPrompt` operation in a child
  session. Lightweight; reuses all existing routine/session machinery. (No new ECHO type.)
- **Execution model** = asynchronous / concurrent. The main agent keeps conversing while
  sub-agents run.
- **Tracking** = one `Plan` `Task` per sub-agent. `Task.status` mirrors the child process
  state (`in-progress` → `done`/failed); `Task.chat` links to the sub-agent's conversation;
  `Task.parent` may express hierarchy.
- **Result return** = push / wake + proactive notify. The main agent is a long-lived
  **supervisor process**; child completion wakes it and it posts a message to the user.

## Key runtime constraint (grounded in code)

`ProcessHandle` (`packages/core/compute-runtime/src/ProcessHandle.ts`):

- A process that never calls `succeed()` stays alive (`IDLE`/`HYBERNATING`) and continues to
  accept `submitInput` while not finished (`ProcessHandle.ts:155-162`). A supervisor can
  therefore **interleave new user turns with still-running children with no ProcessManager
  change**.
- Child exit wakes the parent via `onChildEvent` (`ProcessHandle.ts:333-336`), but
  `Process.ChildEvent` carries only `Exit.Exit<void>` — **not the child's output value**.

Consequence: results travel through a **durable channel** (the `Plan` `Task` in ECHO, written
by the child); the `onChildEvent` exit is purely the **wake signal**. This is Approach A.

## Chosen approach — A: Linked-concurrent child + Plan-Task result channel

1. A **delegate tool** invoked during the supervisor's turn spawns a child process running
   `AgentPrompt` **via `invokeFiber`** (linked: `parentProcessId = supervisor.pid`;
   non-blocking: returns a fiber without awaiting), and creates/links a `Plan` `Task`
   (`status: in-progress`, `chat: <sub-agent chat>`).
2. The child runs the Routine session to completion and writes its **result into its
   `Task`** (`status: done`, plus result text in its chat).
3. Child exit fires `supervisor.onChildEvent` → the supervisor reads newly-completed `Task`s
   from the `Plan` and emits a proactive assistant message (`submitOutput`) into the user
   chat, marking those tasks acknowledged.

Rejected alternatives:

- **B — extend `ChildEvent` with output payload:** mutates a core compute type, bypasses the
  reactive ECHO `Plan`; more invasive.
- **C — parent subscribes to each child's `subscribeOutputs()` stream:** more handle plumbing,
  does not use hibernation cleanly.

## Resolved: how the supervisor is woken (read from runtime code)

`Operation.schedule` spawns its child `detached` (`parentProcessId: undefined`) **by design**
(`ProcessOperationInvoker.ts:220-257`), so it does **not** deliver `onChildEvent` to the
scheduling parent. The correct primitive is **`ProcessOperationInvoker.invokeFiber`**: it
spawns a **linked** child (`parentProcessId` set) and returns a fiber **without awaiting**
(`ProcessOperationInvoker.ts:114-155`), so the supervisor's `onInput` stays non-blocking, the
child runs concurrently, and child exit fires the supervisor's `onChildEvent`
(`ProcessManager.ts:440-459`). The child's output value (not carried by `ChildEvent`) is read
in `onChildEvent` via `attachFiber(pid)` — the invoker's fiber cache is deliberately retained
for this (`ProcessOperationInvoker.ts:144`).

Slice 1 packages this as a `Supervisor` module (`delegate` + `collectResult`) and proves it
with tests on the real runtime.

## Components & layering

| Layer               | Unit                                                                                                                             | New work                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `compute-runtime`   | **Supervisor process pattern**                                                                                                   | Spawn children, interleave input, wake on child exit, emit derived output. No AI. **Slice 1.** |
| `assistant-toolkit` | **Delegation blueprint** (`DelegateTask` tool) + Plan-Task linkage + supervisor wiring over `AiSession`                          | **Slice 2.**                                                                                   |
| `plugin-assistant`  | Conversational agent runs as the supervisor; children surface in `ProcessTree`/`TracePanel` (mostly automatic via pid hierarchy) | **Slice 3.**                                                                                   |

## Data flow

```text
user → supervisor.onInput → AiSession turn
     → DelegateTask tool → invokeFiber(AgentPrompt) [linked, non-blocking]
                         → create Plan Task (in-progress, chat=subagent chat)
     → child session runs Routine (concurrently; supervisor stays IDLE/HYBERNATING)
                         → child writes result to Task (done) + chat
     → child exits → supervisor.onChildEvent (wake) → collectResult(childPid)
                  → read done Tasks → submitOutput proactive message → ack tasks
```

## Lifecycle / state

- Supervisor never `succeed()`s while work is pending → remains `IDLE`/`HYBERNATING`, accepting
  user turns concurrently with running children.
- `Task.status` mirrors child process state: `in-progress` on spawn, `done` on child success,
  failed on child failure (surfaced to the user).

## Testing strategy

- **Slice 1 — compute-runtime, no AI (toy operations as children).**
  - First failing test: a supervisor `delegate`s a child operation; on child exit the
    supervisor `collectResult`s it and emits a derived `submitOutput` (proves linked-concurrent
    spawn + `onChildEvent` wake + result read on the real runtime).
  - Supervisor handles multiple concurrent delegations, emitting one derived output per child.
  - Child failure surfaces to the supervisor (`collectResult` yields a failed `Exit`).
- **Slice 2 — assistant-toolkit, `AssistantTestLayer` + memoized AI.**
  - `DelegateTask` creates a `Plan` `Task` and schedules `AgentPrompt`.
  - Child Routine completes; `Task` transitions to `done` with result; supervisor folds it in.
- **Slice 3 — plugin-assistant, live AI (`agentTest`/`.node.test.ts`, `tags: ['manual']`).**
  - User converses with the main agent; it delegates, finishes, and proactively reports.

## Surfacing (Slice 3, low new code)

- `ProcessTree` and `TracePanel` already render the pid hierarchy and trace timeline. Children
  spawned with `parentProcessId` appear as nested lanes automatically once they emit the
  existing `AgentRequestBegin/End` / `OperationStart/End` trace events.

## Scope / decomposition

Slice 1 is the first implementation plan and is independently testable. Slices 2 and 3 each get
their own plan after the slice below them lands.

## Out of scope (YAGNI for now)

- A dedicated `SubAgent` ECHO type (using `Routine` + `AgentPrompt`).
- Streaming partial sub-agent results into the main chat (only final result is folded in).
- Cancellation UI / re-delegation policies beyond `Task.status`.
- Multi-level deep hierarchies beyond what `Task.parent` + `parentProcessId` already allow.

## Status (2026-06-06): Approach A implemented

The conversational `AgentProcess` now acts as the supervisor. A generic, optional
`SupervisorStrategy` seam lives in `@dxos/functions-runtime` (kept agnostic of the agent/plan
types) and is injected via `AgentService.layer`; the strategy is implemented in
`@dxos/assistant-toolkit` and contributed by `plugin-assistant` through an optional
`AgentSupervisorStrategy` capability that `plugin-automation`'s AgentService LayerSpec consumes.

After each turn the agent reconciles in-progress plan tasks into **linked** `AgentPrompt` children
(a synthesized minimal `Routine` per task), reusing `AgentProcess`'s existing `onChildEvent` wake
loop; on a child's exit it sets `Task.status` and appends a templated message to the conversation.
Verified end-to-end in the `stories-assistant` `WithSubAgents` story.

## Open questions / follow-ups

- **Blueprint naming.** The `delegation` blueprint (which exposes the `DelegateTask` tool) could be
  renamed to `supervisor` to match the runtime concept — enabling the blueprint is what makes an
  agent a supervisor that can delegate.
- **Sub-agent lifecycle: ephemeral vs. pooled.** Today each delegated task spawns a _fresh_
  sub-agent from a synthesized minimal `Routine` — ephemeral, isolated, no shared context. The
  alternative is to maintain a **set of long-lived sub-agents** with distinct roles, contexts, and
  capabilities (blueprints) that the supervisor routes work to. Trade-offs:
  - _Ephemeral (current):_ simple, clean isolation per task, no cross-task state leakage; but no
    warm context, repeated setup, and no specialization. Sub-agents now **inherit the supervisor's
    blueprints** (minus the delegation blueprint), so they share its tools/capabilities.
  - _Pooled/role-based:_ specialization (e.g. "researcher", "coder"), warm/shared context, reuse
    across tasks; but lifecycle management, routing logic, and context-bleed concerns.
  - Likely resolution: keep ephemeral as the default; introduce optional named sub-agent roles
    (each a `Routine`/blueprint set) that the supervisor can target when a task names a role.
- **Role-based, reusable sub-agents (follow-on).** Today every task spawns a fresh ephemeral
  sub-agent that inherits the supervisor's full blueprint set. The follow-on is to **define a set of
  named sub-agents, each with a distinct role and its own context/capabilities (blueprint subset),
  and reuse them across tasks** rather than synthesizing an anonymous one per task. Open questions:
  - **Definition.** Where do roles live — a `SubAgent`/role ECHO type (role name + instructions +
    blueprints + context), authored by the user or proposed by the supervisor?
  - **Routing.** How does the supervisor pick a role for a task (LLM choice, tags on the task, an
    explicit `role` field), and what happens when no role fits (fall back to ephemeral)?
  - **Reuse & lifecycle.** Per-role long-lived process vs. fresh process per task with shared
    context; how to bound concurrency, persist role context, and avoid cross-task context bleed.
  - **Capability scoping.** Per-role blueprint subsets (narrower than "inherit everything") so a
    "researcher" gets web-search and a "writer" gets markdown, etc.
  - This subsumes blueprint-inheritance "option 3" (per-task/role blueprint selection): roles are
    the unit that carries the capability subset.
- **Notify composition.** Currently a templated append; consider LLM-composed summaries (the design
  always anticipated "templated now, LLM-composed later").
- **Planning as the home for delegation.** Should delegation be a _feature of planning_ rather than
  a separate blueprint? I.e. the supervisor keeps the planning blueprint, and planning itself
  issues and tracks delegation orders (a task can be marked "delegate" and the supervisor reconciles
  it). Today delegation is its own blueprint/tool and only `delegated`-marked tasks are reconciled;
  unifying them would remove the planning-vs-delegation overlap that currently lets the LLM create a
  redundant non-delegated planning task.
- **Delegating to other users (task/workflow management).** Delegation today targets ephemeral
  sub-agent processes. The broader model is human task/workflow management — assign a task to another
  _user_ (or a mix of agents and humans), track status, and fold results back the same way.
- **Trace graph should branch per sub-agent.** The execution-graph/trace currently renders the
  sub-agent's activity inline rather than as its own branch off the supervisor. A delegated
  sub-agent runs as a linked child process and should appear as a distinct branch in the trace so
  its lifecycle (Run Routine → tool calls → completion) is visually attributable to that delegation.

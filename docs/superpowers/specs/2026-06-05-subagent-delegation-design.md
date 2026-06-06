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

## Chosen approach — A: Schedule-as-child + Plan-Task result channel

1. A **delegate tool** invoked during the supervisor's turn schedules a child process running
   `AgentPrompt` with `parentProcessId = supervisor.pid`, and creates/links a `Plan` `Task`
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

## Open technical risk (resolved by the first test)

Whether `Operation.schedule`'d followups deliver `onChildEvent` to the scheduling parent is
unverified — scheduled followups are "tracked separately and won't cancel when parent
completes." **Slice 1's first failing test targets exactly this.** If `schedule` does not
deliver the parent wake, the fallback is the supervisor calling `spawn` with `parentProcessId`
directly (still Approach A), or escalating to Approach B.

## Components & layering

| Layer | Unit | New work |
|---|---|---|
| `compute-runtime` | **Supervisor process pattern** | Spawn children, interleave input, wake on child exit, emit derived output. No AI. **Slice 1.** |
| `assistant-toolkit` | **Delegation blueprint** (`DelegateTask` tool) + Plan-Task linkage + supervisor wiring over `AiSession` | **Slice 2.** |
| `plugin-assistant` | Conversational agent runs as the supervisor; children surface in `ProcessTree`/`TracePanel` (mostly automatic via pid hierarchy) | **Slice 3.** |

## Data flow

```
user → supervisor.onInput → AiSession turn
     → DelegateTask tool → schedule(AgentPrompt, parentProcessId)
                         → create Plan Task (in-progress, chat=subagent chat)
     → child session runs Routine
                         → child writes result to Task (done) + chat
     → child exits → supervisor.onChildEvent (wake)
                  → read done Tasks → submitOutput proactive message → ack tasks
```

## Lifecycle / state

- Supervisor never `succeed()`s while work is pending → remains `IDLE`/`HYBERNATING`, accepting
  user turns concurrently with running children.
- `Task.status` mirrors child process state: `in-progress` on spawn, `done` on child success,
  failed on child failure (surfaced to the user).

## Testing strategy

- **Slice 1 — compute-runtime, no AI (mock toy processes).**
  - First failing test: a supervisor schedules a child; assert the supervisor receives
    `onChildEvent` on child exit (resolves the open risk above).
  - Supervisor accepts a second `submitInput` while a child is still running (interleaving).
  - Supervisor wakes on child exit and emits a derived `submitOutput`.
- **Slice 2 — assistant-toolkit, `AssistantTestLayer` + memoized AI.**
  - `DelegateTask` creates a `Plan` `Task` and schedules `AgentPrompt`.
  - Child Routine completes; `Task` transitions to `done` with result; supervisor folds it in.
- **Slice 3 — plugin-assistant, live AI (`agentTest`/`.node.test.ts`, `tags: ['llm']`).**
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

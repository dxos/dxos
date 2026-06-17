# Session log — `dm/agent`

Branch: `dm/agent`  
Latest commit: `8b292bed86` — `feat(plugin-assistant): nested process tree and delegate-task by id`

---

## Committed (`8b292bed86`)

| Step | Area | What |
|------|------|------|
| 1 | `ProcessTree.tsx` | `depth` prop, always-expanded nesting, label-only indent (`0.5rem`/level) |
| 2 | `ProcessTree.tsx` | Nested rows (level > 1): active only (`RUNNING` / `HYBERNATING` / `TERMINATING`); completed children hidden |
| 3 | `ProcessTree.tsx` | Restored subprocess elbow icon (`ph--arrow-elbow-down-right`) |
| 4 | `TracePanel.tsx` | `ProcessTree` with `depth={3}` |
| 5 | `delegate-task.ts` | Accept `id` OR `title` (not both); delegate existing plan task without duplicating |
| 6 | `delegate-task.test.ts` | Tests: create-by-title, delegate-by-id, reject both |
| 7 | `ProcessTree.stories.tsx` | `WithNestedChildren` story |

---

## Uncommitted (working tree — 18 files, ~+367 / −78 lines)

### Agent PID on plan tasks

| Step | File | Change |
|------|------|--------|
| 8 | `Plan.ts` | Added optional `agentPid: Process.ID` + `formatAgentPidTag()` (e.g. `agent-a1b2`) |
| 9 | `update-tasks.ts` | Omit `agentPid` from LLM-facing schema |
| 10 | `delegation-strategy.ts` | Set `task.agentPid` when sub-agent spawns |
| 11 | `TaskList.tsx` | Show `pending` + `agent-xxxx` tags (both when applicable; no brackets on agent tag) |
| 12 | `TaskList.stories.tsx` | `WithDelegatedAgent` story |

### Delegated task live activity (trace feed)

| Step | File | Change |
|------|------|--------|
| 13 | `execution-graph.ts` | `collectProcessActivityLines()` — filter trace by pid subtree (+ optional `conversationId`), reuse execution-graph event labels |
| 14 | `execution-graph/index.ts` | Export `collectProcessActivityLines`, `CollectProcessActivityOptions` |
| 15 | `sub-agent-delegation.test.ts` | Test activity lines for sub-agent fixture pid |
| 16 | `hooks/useTraceMessages.ts` | New hook — space trace feed atom (extracted from TracePanel) |
| 17 | `hooks/index.ts` | Export `useTraceMessages`, `getTraceMessagesAtom` |
| 18 | `TracePanel.tsx` | Use shared `useTraceMessages` / `getTraceMessagesAtom` |
| 19 | `TaskList.tsx` | Delegated rows: `TextCrawl` (`autoAdvance` + `greedy`) under title — same flip animation as `ToolWidget` tool-call headers |
| 20 | `Chat.tsx` | `Chat.TaskList` passes `traceMessages` + `conversationId` from chat space/feed |
| 21 | `PlanArticle.tsx` | Passes trace messages via `getSpace(subject)` |
| 22 | `TaskList.stories.tsx` | `WithDelegatedAgent` uses real sub-agent delegation fixture + trace messages |

### Agent process completion + respawn

| Step | File | Change |
|------|------|--------|
| 23 | `agent-process.ts` | `maybeComplete()` → `ctx.succeed()` when queue, alarms, delegations, and undelivered tool results are all clear; called from empty `onAlarm`, post-turn `onAlarm`, delegation `onChildEvent` |
| 24 | `agent-process.ts` | `ToolCallManager.hasPendingToolResults()`; exported `isAgentWorkPending()` for unit tests |
| 25 | `AgentService.ts` | Skip terminal handles in session cache; reuse only non-terminal processes from `list()`; spawn fresh after completion |
| 26 | `agent-process.test.ts` | `isAgentWorkPending` unit tests (5 cases, passing) |
| 27 | `AgentService.test.ts` | E2e deferred — see Tests TODO below |

### Formatting only

| Step | File | Change |
|------|------|--------|
| 28 | `delegate-task.ts` | Line-wrap formatting |

---

## Tests

### Passing

- `assistant-toolkit:lint` — pass
- `plugin-assistant:lint` — pass
- `assistant-toolkit:test` — pass (42 tests)
- `plugin-assistant:test` — pass (97 tests, includes `collectProcessActivityLines` fixture test)
- `functions-runtime` — `isAgentWorkPending` unit tests (5 cases)

### TODO (before merge)

Marked as `it.todo` / `describe.todo` in code:

**`AgentService.test.ts`**

- `agent process succeeds when idle and respawns for a follow-up turn`

**`agent-process.test.ts` — `describe.todo('AgentProcess completion')`**

- `calls ctx.succeed when queue, alarms, delegations, and tool calls are all clear`
- `stays alive while a linked tool-call child is running`
- `stays alive while a delegated subprocess is running`
- `succeeds after the last delegated child exits`
- `does not succeed while a self-wake alarm is scheduled`

### Needs regression check (not yet verified)

- `AgentService` tool-call / restart / reload tests (some timed out in full suite run — confirm not regressed by `maybeComplete`)

---

## Verification checklist (before PR)

- [ ] Implement / enable the 6 e2e `it.todo` cases above
- [ ] Confirm tool-call + restart tests pass
- [ ] Manual: ProcessTree shows agent **Succeeded** (not stuck Idle) after turn with no background work
- [ ] Manual: TaskList shows `pending` + `agent-xxxx` on delegated in-progress tasks
- [ ] Manual: TaskList `TextCrawl` flips through sub-agent trace activity (Storybook `WithDelegatedAgent` or live delegation)
- [ ] `pnpm pre-ci` green
- [ ] Commit uncommitted changes

---

## Context / design notes

- **ProcessTree**: roots keep full history sort; nested subprocess rows filter to active states only.
- **delegate-task**: `id` marks existing task delegated + in-progress; `title` creates new delegated task.
- **TaskList activity**: trace messages filtered by `agentPid` subtree; optional `conversationId` excludes mismatched messages that have one set; child ops without `conversationId` still match. UI uses `TextCrawl` (not `Matrix` — that is the dot spinner in `ChatStatus`).
- **Agent lifecycle**: long-lived supervisor design doc assumed agent stays `IDLE`/`HYBERNATING`; this branch transitions to `SUCCEEDED` when fully idle so ProcessTree reflects completion. Follow-up user turns spawn a fresh process via `AgentService.getSession` (terminal cache + list skip).
- **Pending work predicate** (`isAgentWorkPending`): input queue non-empty OR self-wake alarm set OR delegations in flight OR tool results not yet delivered.

---

## Live ephemeral status debugging (WIP — `dm/agent`, instrumentation committed)

Goal: delegated `TaskList` rows should show the sub-agent's **live** activity (streaming
tokens, in-flight tool calls), not just completed durable lines.

### Pipeline as it stands

- `AiRequest.ts` emits `PartialBlock` ephemeral events while streaming, **and now emits a
  final `PartialBlock` with `pending: false`** as an explicit completion signal before
  persisting the durable message.
- `useProcessEphemeralStatus.ts` subscribes to the agent pid **and all active descendant
  pids**, runs each message through `resolveEphemeralStatusUpdate`, and coalesces the
  replay buffer (via `queueMicrotask(endReplay)`) so a re-subscribe lands on the latest
  status rather than a stale partial.
- `TaskList.tsx` chooses the activity line: `ephemeral` → `inFlight`
  (`deriveInFlightActivityLine`) → filtered `durable`.

### Evidence from storybook repro (`WithSubAgentsTest`, two concurrent sub-agents)

Captured via `[DEBUG H1]`–`[DEBUG H7]` in `tools/storybook-react/app.log`:

- Ephemeral **does** reach the UI: `source:"ephemeral"` observed 24× vs `durable` 2× in the
  long run. So subscription + descendant fan-out work.
- **Problem 1 — `status.update` noise dominates.** The most frequent ephemeral line is
  `"Running 01KVB9WBRG…"` (raw routine ULID from a `status.update` event), 23× vs 1×
  for the useful `"Calling Get Agent Context (0 bytes)..."`. This ULID keeps overwriting
  the descriptive partial-block lines.
- **Problem 2 — reverts to `Run Routine...` between turns.** When the stream clears
  (`pending:false`) during an LLM-thinking gap, `ephemeralLine` is `undefined`, so the UI
  falls back to `inFlight` = `"Run Routine..."` (the top-level `AgentPrompt` op, open for
  the whole run). This is the "RunRoutine only" symptom the user saw.
- **Problem 3 — fast/memoized single-agent runs.** All ephemeral events replay in one
  synchronous burst that ends on a completion-clear, so replay coalescing lands on
  "cleared" and the UI never surfaces the in-between partials; only `inFlight`/`durable`
  show.
- Last manual check used an **ephemeral-only** override in `TaskList.tsx`
  (`#region DEBUG`): the row mostly showed nothing ("subscription not firing" from the
  user's POV) because the stream clears between turns and the ULID noise aside there is
  little sustained descriptive content.

### Current instrumentation / temporary state (in this commit)

- `TaskList.tsx`: `activityLines` forced **ephemeral-only** inside a `#region DEBUG` block
  (durable + inFlight bypassed); `[DEBUG H6]` (source + all lines) and `[DEBUG H7]`
  (rendered line) logs.
- `useProcessEphemeralStatus.ts`: `[DEBUG H1]`–`[DEBUG H5]` logs.
- `AiRequest.ts`: `pending:false` completion emit (keep — this is a real fix, not debug).

### Proposed fix direction (next session)

1. **Suppress / reformat `status.update` ULID lines** in `pendingStatusFromEphemeralMessage`
   so descriptive partial-block lines win (don't let `"Running <ULID>"` overwrite
   `"Generating N tokens..."` / `"Calling X..."`).
2. **Make the ephemeral line sticky**: keep the last meaningful status until a *new* line
   arrives or the task reaches a terminal state, instead of clearing on every block
   completion — avoids the revert to `"Run Routine..."` during LLM gaps.
3. **Replay coalescing**: on re-subscribe to a still-active process, don't let a trailing
   completion-clear wipe a live status.
4. Reconsider `deriveInFlightActivityLine` so the top-level `Run Routine` op is the last
   resort, not the default.
5. Remove all `#region DEBUG` blocks (H1–H7, ephemeral-only override) once confirmed.

---

## Agent handoff

| Agent | Focus |
|-------|-------|
| Agent 1 | ProcessTree nesting/filtering, delegate-task by id, TracePanel depth |
| Agent 2 | Agent PID on plan tasks, TaskList tags + trace activity, `ctx.succeed` / respawn, test scaffolding |

Both logs consolidated in this file.

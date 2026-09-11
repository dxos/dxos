# task-visualization — Tasks

Design: [`./DESIGN.md`](./DESIGN.md). Flow doc: `packages/plugins/plugin-projects/docs/FLOW.md`.

## Phase 1: Understand and document the delegation flow

What happens between "Assign selected tasks to agent" and a finished task, and where the join keys
are (event → session → task).

### Tasks

- [x] **FLOW.md** in `packages/plugins/plugin-projects/docs/` — sequence, writes, join keys, state
      machine, idempotence, stop options (§6, decision deferred), gaps (§7).

## Phase 2: Idempotent delegation

- [x] **Disable `delegate-tasks` while in flight**; handler skips `Task.isAgentWorking` rows and
      refuses a list of nothing else; story covers re-checking held rows.
- [ ] **Stop** — deferred pending FLOW.md analysis of options.

## Phase 3: Data layer

- [ ] **`assistant.delegationSpawned { taskId, pid }` trace event** at the spawn site in
      `@dxos/agent-runtime` `agent-process.ts`.
- [ ] **`buildSessionTimeline`** in plugin-assistant next to `execution-graph`: trace messages +
      processes + chats + tasks → `Lane[]` + `Marker[]`; Effect schema; tests on the existing
      `sub-agent-delegation.json` fixture.

## Phase 4: Visualization

- [ ] **Gantt component** (own, not a library) with a story driven by fixture data.
- [ ] **Companion panel** subscribing via `useTraceMessages` + `ProcessMonitor`.

## Follow-ups surfaced by FLOW.md §7 (not in scope unless promoted)

- [ ] **`started` on delegation vs. orphan sweep (§7.1)** — `sweepOrphanedTasks` fails every
      delegated task the opening turn did not finish. Decide: sweep only ids this process spawned,
      or leave delegated tasks `todo` and let reconcile spawn sub-agents.
- [ ] **TracePanel `resolveLabel` matches feed ids but `TargetAnnotation` is the chat URI (§7.4)**.
- [ ] **Sub-agent trace events carry no `meta.conversation` (§7.5)**; their feeds are unparented (§7.6).
- [ ] **`onComplete` writes `done` directly, bypassing `finishStatus`/reviewers (§7.3)**.

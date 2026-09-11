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

- [x] **`assistant.delegationSpawned { taskId, pid }` trace event** — `@dxos/assistant`
      `util/tracing.ts`, written at both spawn sites in `agent-process.ts`.
- [x] **`buildSessionTimeline`** — `plugin-assistant/src/session-timeline/` (`#session-timeline`):
      Effect-schema `Lane`/`Marker`/`SessionTimeline`; sub-agent runs are child `session` lanes with
      `delegatedFrom`; 4 tests incl. the `sub-agent-delegation.json` fixture.
- [ ] **Capture a fresh trace fixture** with `dxosDumpTrace()` from a live delegation — the existing
      one predates `meta.conversation` (still `conversationId`) and `delegationSpawned`.

## Phase 4: Visualization

- [x] **Gantt component** — `react-ui-components/src/components/Gantt/`: session boxes with event
      nodes, task lines, dependency + delegation connectors, tokens gutter, `now` line; `Default` +
      `Live` stories.
- [ ] Story cleanup: one `DefaultStory` + args (drop per-story `render`); zoom/pan; marker tooltips.
- [ ] **Companion panel** subscribing via `useTraceMessages` + `ProcessMonitor`.

## Follow-ups surfaced by FLOW.md §7 (not in scope unless promoted)

- [ ] **`started` on delegation vs. orphan sweep (§7.1)** — `sweepOrphanedTasks` fails every
      delegated task the opening turn did not finish. Decide: sweep only ids this process spawned,
      or leave delegated tasks `todo` and let reconcile spawn sub-agents.
- [ ] **TracePanel `resolveLabel` matches feed ids but `TargetAnnotation` is the chat URI (§7.4)**.
- [ ] **Sub-agent trace events carry no `meta.conversation` (§7.5)**; their feeds are unparented (§7.6).
- [ ] **`onComplete` writes `done` directly, bypassing `finishStatus`/reviewers (§7.3)**.

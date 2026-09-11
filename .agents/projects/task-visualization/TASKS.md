# task-visualization — Tasks

Design: [`./DESIGN.md`](./DESIGN.md). Flow doc: `packages/plugins/plugin-projects/docs/FLOW.md`.

## Phase 1: Understand and document the delegation flow

What happens between "Assign selected tasks to agent" and a finished task, and where the join keys
are (event → session → task).

### Tasks

- [ ] **FLOW.md** in `packages/plugins/plugin-projects/docs/` — sequence from toolbar to sub-agent
      completion; join keys; stop-semantics options (deferred decision).

## Phase 2: Idempotent delegation

- [ ] **Disable `delegate-tasks` while in flight** and while the checked set contains a task already
      `started` with `assignee.role === 'assistant'`.
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

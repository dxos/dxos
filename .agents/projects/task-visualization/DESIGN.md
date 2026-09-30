# task-visualization — Design

## Goal

A horizontal, time-scaled view of the tasks a project has handed to the assistant: which are
running, blocked, or done, the sessions/sub-agents working them, the events inside each, and
metadata such as token counts.

## Decisions

- **D1 — Own component, not a gantt library.** frappe-gantt / gantt-task-react / svar are
  row-per-task at date granularity with their own CSS and no notion of nested spans, event markers
  or live streaming; adapting them costs more than a small SVG/grid component consuming the existing
  span tree.
- **D2 — Data first.** The lane/marker schema is the deliverable; the component maps it.
- **D3 — Companion panel** (like TracePanel), not a third `ProjectArticle` tab.
- **D4 — Emit `assistant.delegationSpawned`** so sub-agent pid ↔ task is observable from the trace
  (today it lives only in the supervisor's runtime `DelegationsCell`). Title-match on the
  `RunInstructions` `OperationStart` is the fallback for old traces.
- **D5 — Stop semantics deferred**; FLOW.md lays out the options.

## Join keys

- `Trace.Meta.conversation` → feed → `Chat` (`Chat.loadForFeed` / `feedEntityId`) → `chat.tasks`.
- Agent process: `Process.Info.key === AGENT_PROCESS_KEY`, `TargetAnnotation` = feed URI.
- Sub-agent: `Process.Info.parentPid` = agent pid; task via D4.
- Tokens: `ContentBlock.Stats.usage` per turn (`CompleteBlock` trace event / feed message);
  `Process.Info.metrics` for wall time and I/O counts.

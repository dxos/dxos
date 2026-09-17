---
'@dxos/react-ui-trace': minor
'@dxos/react-ui-components': minor
'@dxos/compute': minor
'@dxos/assistant': minor
'@dxos/plugin-assistant': patch
'@dxos/plugin-projects': patch
'@dxos/plugin-review': patch
'@dxos/devtools': patch
'@dxos/react-ui-list': patch
'@dxos/react-ui': patch
'@dxos/react-ui-assistant': patch
---

New `@dxos/react-ui-trace`: the `Timeline` commit graph and `Gantt` (moved from `@dxos/react-ui-components`), the `ProcessTree`, a presentational `TracePanel`, and the pure builders behind them — `buildExecutionGraph` (span tree → commits) and `buildSessionTimeline` (sessions, tasks and sub-agents on a time axis, now over a `Session` input rather than a `Chat`). The agent trace events (`AgentRequestBegin/End`, `CompleteBlock`, `PartialBlock`, `DelegationSpawned`, `RequestPhase`, `McpServerError`) move from `@dxos/assistant` to `@dxos/compute` `Trace`, and `Process.isHarnessHost` identifies a conversation's agent process by its annotation, so the package depends on the compute layer only. `@dxos/react-ui-components` no longer depends on `@dxos/assistant`; the message-based `useExecutionGraph` hook is gone (its two consumers inline it). `@dxos/plugin-assistant` keeps the app-bound `TracePanel` container and `useSessionTimeline`, whose lanes now carry `sessionId` instead of `chatId`.

TracePanel: processes are multi-selectable (click selects one, meta-click toggles; selection kept in view state) and the trace narrows to the selected processes and their children; each trace line shows a `HH:mm:ss` timestamp. `Tree` gains a `multiple` selection mode where a plain click selects a row alone and a meta-click toggles it (`onSelect` reports `meta`), and `createStaticTreeModel` an `isCurrent` seed. `Accordion.Root` gains `rounded`.

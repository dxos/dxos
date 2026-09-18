//
// Copyright 2026 DXOS.org
//

// A UI-free entrypoint. The root barrel reaches the trace's React components, and through them
// `@dxos/react-ui-mosaic` and a drag-and-drop dependency that imports CSS, so a node test or a
// handler running outside the browser cannot import from it. Re-exported from the modules that own
// them rather than moved, so there is a single definition of each.

export {
  type BuildExecutionGraphParams,
  type CollectProcessActivityOptions,
  CommitSelector,
  type ExecutionGraph,
  type ExecutionGraphDetailsMap,
  buildExecutionGraph,
  collectProcessActivityLines,
  deriveInFlightActivityLine,
} from './execution-graph/execution-graph.ts';
export {
  BEGIN_EVENT_TYPES,
  type BuildSpanTreeOptions,
  DEFAULT_SPAN_TIMEOUT_MS,
  END_EVENT_TYPES,
  ROOT_SPAN_ID,
  type Span,
  type SpanMeta,
  buildSpanTree,
  flattenSpanTree,
  isSpanBeginEvent,
  isSpanEndEvent,
  walkSpanTree,
} from './execution-graph/span-tree.ts';
export { type Commit } from './components/Timeline/Timeline.tsx';
export { renderTimelineAscii } from './components/Timeline/timeline-printer.ts';

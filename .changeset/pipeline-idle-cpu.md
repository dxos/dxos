---
'@dxos/plugin-assistant': patch
'@dxos/plugin-projects': patch
---

The project pipeline chart no longer burns CPU while it is closed.

`ProjectArticle` mounted `ProjectPipeline` unconditionally inside the splitter's end panel and let `showPipeline` collapse it visually, so the chart kept rebuilding its whole timeline from the space's trace feed with nothing on screen. It is now mounted only while shown.

`useSessionTimeline` additionally debounces the trace feed by 500ms, matching the debounce already applied to the process tree. `buildSessionTimeline` is not incremental — it re-flattens the full message history on every emission — and the feed emits per message, far faster than a reader can read. `useTraceMessages` takes the interval as a new optional `debounce` option; callers that omit it (such as `TracePanel`) are unchanged.

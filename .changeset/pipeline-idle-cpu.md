---
'@dxos/plugin-assistant': patch
'@dxos/plugin-projects': patch
'@dxos/network-manager': patch
'@dxos/client': patch
---

The project pipeline chart no longer burns CPU while it is closed.

`ProjectArticle` mounted `ProjectPipeline` unconditionally inside the splitter's end panel and let `showPipeline` collapse it visually, so the chart kept rebuilding its whole timeline from the space's trace feed with nothing on screen. It is now mounted only while shown.

`useSessionTimeline` additionally debounces the trace feed by 500ms, matching the debounce already applied to the process tree. `buildSessionTimeline` is not incremental — it re-flattens the full message history on every emission — and the feed emits per message, far faster than a reader can read. `useTraceMessages` takes the interval as a new optional `debounce` option; callers that omit it (such as `TracePanel`) are unchanged.

`RtcTransportProxy` also no longer logs whole bridge events. A data event carries the packet as a `Uint8Array`, which the logger serialises as one JSON key per byte — 20MB across a few minutes of an idle session. It now logs the event's case and the payload's byte length.

`SpaceProxy` no longer re-applies an unchanged automerge root. The host re-sends the space several times a second as its feeds advance, and the root is the same in nearly all of those updates; the redundant ones were walked down into the database only to be discarded there.

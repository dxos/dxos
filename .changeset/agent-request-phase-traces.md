---
'@dxos/assistant': minor
'@dxos/agent-runtime': patch
'@dxos/plugin-assistant': minor
---

The chat now says what a request is doing while the reader waits for the first token, instead of showing an unexplained pause.

`@dxos/assistant` adds an ephemeral `RequestPhase` trace event (`assistant.requestPhase`) carrying the setup stage a turn has reached — `preparing`, `loading-history`, `summarizing`, `connecting-mcp`, `building-toolkit`, `encoding-prompt`, `contacting-provider` — plus a 1-based `attempt` so a request the provider makes us re-issue reads as a retry rather than a stall. Emit one with `emitRequestPhase(phase, { attempt, detail })`; it rides the existing ephemeral trace channel alongside `PartialBlock`, so it never reaches the durable feed.

`@dxos/plugin-assistant` exposes the latest phase on `AiChatProcessor.activity` and renders it as `Chat.Activity`, a line between the thread and the composer. It clears as soon as content streams in — the reply is the better progress report — and on the request settling.

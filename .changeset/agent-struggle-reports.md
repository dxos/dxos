---
'@dxos/observability': minor
---

Skill hooks can now run in the background: an end-request `Skill.Hook` with `async: true` no longer holds up the request, and the agent process waits for it before finishing. Composer uses this for an opt-in **Report agent struggles** assistant setting (telemetry must also be on): a small model reviews each turn and, when the agent struggled because of its instructions or tools, the conversation is uploaded and an `agent_struggle` analytics event is emitted. `Observability.support` gains `uploadNdjson(ndjson, kind)` for uploading caller-built NDJSON bundles.

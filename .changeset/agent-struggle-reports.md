---
'@dxos/observability': minor
---

Composer can review each agent turn with a small model and, when the agent struggled because of its instructions or tools, upload the conversation and emit an `agent_struggle` analytics event. It is off by default: enable **Report agent struggles** in the assistant settings (telemetry must also be on). `Observability.support` gains `uploadNdjson(ndjson, kind)` for uploading caller-built NDJSON bundles.

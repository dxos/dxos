---
'@dxos/observability': minor
'@dxos/plugin-observability': minor
---

AI model calls, tool calls, and conversation turns are reported to LLM analytics. `@dxos/observability` gains an `ai` extension kind: `AiObservability` reads the finished `gen_ai.*` spans, applies the capture policy (nothing while telemetry is off; the prompt, the response, and the tool names only for a space its `allowContent` predicate accepts), and reports `Inference`, `Turn`, and `ToolCall` records. The PostHog extension maps them onto `$ai_generation`, `$ai_trace`, and `$ai_span`, with prompt-cache token counts and the streaming flag. Conversation content never reaches a trace backend: every OTLP export strips it from the span, and the span itself stays in the trace.

Traces are complete and attributable. The compute runtime opens a span around every handler dispatch, spawn, hydrate, operation invoke, trigger invocation, and layer materialization, and an alarm or child event runs with the process's own context rather than under the span that scheduled it, so a model call fired from an alarm exports under its turn. Every span carries the identity as `did` in the tab and in the dedicated worker, and `spaceId` wherever the work is scoped to one space: ECHO, the feed store, the index engine, and the process runtime. Logs carry the active trace and span ids in the browser and in node, and a warning or error log promotes its trace through the tail sampler.

Breaking: `ProcessContext.setAlarm` returns an `Effect` and must be yielded. `SpanAttributes` in `@dxos/effect` holds the shared attribute keys, `Database.withSpaceId` stamps the current database's space on the spans below it, and `EffectEx.contextWithoutParentSpan<R>()` captures a context for work dispatched later.

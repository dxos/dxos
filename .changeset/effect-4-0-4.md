---
'@dxos/sql-sqlite': patch
'@dxos/ai': patch
'@dxos/observability': patch
---

Move Effect from 4.0.0 to 4.0.4. In 4.0.0, `PartitionedSemaphore` lost its only permit once about a thousand waiters were queued, because each release resumed the next waiter on the same stack until it overflowed. The OPFS SQLite client guards its connection with that semaphore, so a statement backlog behind one index transaction left every later statement and query waiting forever.

Effect 4.0.4 follows the current OpenTelemetry GenAI conventions, so model-call spans carry the serving product as `gen_ai.provider.name` instead of `gen_ai.system`. `ChatCompletionsAdapter` reports it under the new key, and `AiObservability` reads it from there, so `$ai_provider` on PostHog events keeps its value. `ChatCompletionsClientConfig.provider` is now required: it no longer falls back to the API format, which named an OpenAI-compatible server `openai`.

The `effect` patch is dropped: 4.0.4 ships the `DecisionModel` image support it added.

---
'@dxos/ai': minor
'@dxos/app-toolkit': minor
'@dxos/effect': minor
'@dxos/observability': minor
'@dxos/plugin-assistant': minor
'@dxos/plugin-observability': minor
'@dxos/assistant': patch
---

Model calls are now reported to PostHog as `$ai_generation` events, so LLM analytics shows traces, token counts, cost, and latency. Capture rides the existing observability opt-in: a user who has telemetry off sends nothing. Prompt and response content is captured for spaces EDGE replicates in plaintext, which is every space today, and a space whose plaintext never reaches infrastructure will capture metadata only. The single decision point is `contentCaptureAllowed()` in `@dxos/plugin-observability`.

`@dxos/ai` adds `AiTelemetry`. `AiTelemetry.wrap` decorates an `AiService` so each resolved model runs with a given tracer, and `makeContentSpanTransformer` stamps prompt and response content onto the model-call span. Local models served through `ChatCompletionsAdapter` (Ollama, LM Studio) now annotate their spans with model and token usage, matching what the Anthropic provider already reported.

`@dxos/observability` adds `AiObservability`, whose `AiSpanProcessor` maps OpenTelemetry GenAI spans onto PostHog's schema. It forwards an allowlist of attributes and reduces span errors to their exception class, because provider error messages can embed request and response fragments. `Events.captureEvent` accepts structured attribute values (arrays and nested objects), widening the previous scalar-only type; extensions implementing the events API must accept them.

`@dxos/app-toolkit` adds an `AiServiceMiddleware` capability for decorating the assembled `AiService`. Contributions are applied per space by `@dxos/plugin-assistant`, so a policy can vary between spaces.

`@dxos/effect` adds `makeTracer`, which builds an Effect tracer over an explicit OpenTelemetry provider rather than the global one.

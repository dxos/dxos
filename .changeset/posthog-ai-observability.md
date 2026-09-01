---
'@dxos/ai': minor
'@dxos/app-framework': minor
'@dxos/effect': minor
'@dxos/observability': minor
'@dxos/plugin-observability': minor
'@dxos/assistant': patch
---

Model calls are now reported to PostHog as `$ai_generation` events, so LLM analytics shows traces, token counts, cost, and latency. Capture rides the existing observability opt-in: a user who has telemetry off sends nothing. Prompt and response content is reported for spaces EDGE replicates in plaintext, which is every space today, and a space whose plaintext never reaches infrastructure reports metadata only. `contentCaptureAllowed()` in `@dxos/plugin-observability` is the single decision point, and it is evaluated in the sink so it applies to every event on the way out.

`@dxos/ai` adds `AiTelemetry`, whose `makeSpanTransformer` stamps prompt content, response content, tool names, and the prompt-cache token counts onto the model-call span. The cache counts are there because the GenAI conventions have nowhere for them — `gen_ai.usage` is input and output tokens and nothing else — so without them the uncached input count is the only input figure a consumer sees, and every cached turn reads as a cheap one. It evaluates no policy of its own, and a value it cannot serialize costs its own attribute rather than the model call. Content over 64 KB per attribute is cut, and the span says so, since a cut value is no longer parseable. Local models served through `ChatCompletionsAdapter` (Ollama, LM Studio) now annotate their spans with model and token usage, matching what the Anthropic provider already reported; `ChatCompletionsClientConfig` gains `provider`, the serving product reported as `gen_ai.system`, so LM Studio is no longer reported as OpenAI on the strength of speaking its wire format.

The process manager now has a real tracer. Effect's default is a no-op, so every `withSpan` in the app was created and discarded; `@dxos/plugin-observability` contributes one at startup over the OpenTelemetry global provider, and every fiber on the process-manager runtime inherits it. AI capture is then only what the baseline does not give — a span processor and effect's content hook — rather than a provider, sampler and tracer of its own.

What to keep is decided once a span has ended, in the observability worker. Head sampling could not express either rule that matters: a sampler runs when a span is created, so it cannot know the span will fail, and the GenAI attributes marking a model call are not on it yet — the previous 30% head ratio therefore discarded 70% of errors and 70% of model calls unseen. Errors and model calls are now kept outright, their traces promoted so later spans follow, and everything else keeps the same 30% keyed on the trace id. `@dxos/effect` adds `makeGlobalTracer`.

`@dxos/observability` adds `AiObservability` at `@dxos/observability/AiObservability` — a standalone subpath kept off the root barrel, which Composer's boot imports. Its `AiSpanProcessor` reads the finished GenAI spans, applies the capture policy, and reports each surviving call to the new `generations` extension API as a vendor-neutral record shaped after the OpenTelemetry GenAI conventions. It reports nothing at all while telemetry is off, and drops the prompt, the response, and the tool names unless the span names a space its `allowContent` predicate accepts — so a call site that has not declared where it runs reports metadata only. It also reads an allowlist of attributes and reduces span errors to their exception class, because provider error messages can embed request and response fragments.

The PostHog extension maps that record onto `$ai_generation` and PostHog's `$ai_*` properties. The vocabulary is PostHog's, so it lives with the extension that speaks it rather than with the policy that produces the record; another backend implements `generations` its own way.

`Events.captureEvent` accepts structured attribute values (arrays and nested objects), widening the previous scalar-only type; extensions implementing the events API must accept them.

`@dxos/app-framework` adds a `RuntimeServices` capability: an Effect layer merged into the process-manager runtime, so services contributed there — a `Tracer` and what it needs — are inherited by every fiber the runtime runs. Contributing one after startup logs an error, as contributing a `LayerSpec` late already did.

`@dxos/effect` adds `makeTracer`, which builds an Effect tracer over an explicit OpenTelemetry provider rather than the global one.

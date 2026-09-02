---
'@dxos/ai': minor
'@dxos/app-framework': minor
'@dxos/effect': minor
'@dxos/observability': minor
'@dxos/plugin-observability': minor
'@dxos/assistant': patch
'@dxos/compute': minor
'@dxos/compute-runtime': minor
'@dxos/agent-runtime': patch
---

Model calls are now reported to PostHog as `$ai_generation` events, so LLM analytics shows traces, token counts, cost, and latency. Capture rides the existing observability opt-in: a user who has telemetry off sends nothing. Prompt and response content is reported for spaces EDGE replicates in plaintext, which is every space today, and a space whose plaintext never reaches infrastructure reports metadata only. `contentCaptureAllowed()` in `@dxos/observability` is the single decision point, and it is evaluated in the sink so it applies to every event on the way out.

`@dxos/ai` adds `AiTelemetry`, whose `makeSpanTransformer` stamps prompt content, response content, tool names, and the prompt-cache token counts onto the model-call span. The cache counts are there because the GenAI conventions have nowhere for them — `gen_ai.usage` is input and output tokens and nothing else — so without them the uncached input count is the only input figure a consumer sees, and every cached turn reads as a cheap one. It evaluates no policy of its own, and a value it cannot serialize costs its own attribute rather than the model call. Content over 64 KB per attribute is cut, and the span says so, since a cut value is no longer parseable. Local models served through `ChatCompletionsAdapter` (Ollama, LM Studio) now annotate their spans with model and token usage, matching what the Anthropic provider already reported; `ChatCompletionsClientConfig` gains `provider`, the serving product reported as `gen_ai.system`, so LM Studio is no longer reported as OpenAI on the strength of speaking its wire format.

The process manager now has a real tracer. Effect's default is a no-op, so every `withSpan` in the app was created and discarded; `@dxos/app-framework` installs one over the OpenTelemetry global provider — a proxy, so it no-ops until something registers a real provider and delegates from then on — and every fiber on the process-manager runtime inherits it. AI capture is then only what the baseline does not give — a span processor and effect's content hook — rather than a provider, sampler and tracer of its own.

What to keep is decided once a span has ended, in the observability worker. Head sampling could not express either rule that matters: a sampler runs when a span is created, so it cannot know the span will fail, and the GenAI attributes marking a model call are not on it yet — the previous 30% head ratio therefore discarded 70% of errors and 70% of model calls unseen. Errors, spans slower than 30 seconds, and model calls are now kept outright, their traces promoted so later spans follow, and everything else keeps the same 30% keyed on the trace id. The first three are the canonical tail-sampling policies — `status_code`, `latency`, `probabilistic` — as described in [OpenTelemetry's writeup](https://opentelemetry.io/blog/2022/tail-sampling/) and implemented by the Collector's [tailsamplingprocessor](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor); keeping model calls is ours, because a sampled fraction of the AI events reports a fraction of the spend. The latency threshold is far above the 5s those examples use, since a conversation turn legitimately runs for tens of seconds. `@dxos/effect` adds `makeGlobalTracer`.

`@dxos/observability` adds `AiObservability` at `@dxos/observability/AiObservability` — a standalone subpath kept off the root barrel, which Composer's boot imports. Its `AiSpanProcessor` reads the finished GenAI spans, applies the capture policy, and reports each surviving call to the new `generations` extension API as a vendor-neutral record shaped after the OpenTelemetry GenAI conventions. It reports nothing at all while telemetry is off, and drops the prompt, the response, and the tool names unless the span names a space its `allowContent` predicate accepts — so a call site that has not declared where it runs reports metadata only. It also reads an allowlist of attributes and reduces span errors to their exception class, because provider error messages can embed request and response fragments.

The PostHog extension maps that record onto `$ai_generation` and PostHog's `$ai_*` properties. The vocabulary is PostHog's, so it lives with the extension that speaks it rather than with the policy that produces the record; another backend implements `generations` its own way.

`Events.captureEvent` accepts structured attribute values (arrays and nested objects), widening the previous scalar-only type; extensions implementing the events API must accept them.

`@dxos/effect` adds `makeTracer`, which builds an Effect tracer over an explicit OpenTelemetry provider rather than the global one.

`ProcessContext.setAlarm` now returns an Effect. A process handle used to start its alarm timer and child-event dispatch on Effect's default runtime, copying the clock and tracer across by hand, so a dispatched handler ran with whatever references someone had remembered to copy. `rearmAlarm`, `requestAlarm`, and `requestChildEvent` now fork into the process scope from the calling fiber, and the handler inherits that fiber's context. This is what made a conversation's model calls invisible: the assistant runs each turn from an alarm, so every generation traced to a default that exports nothing while the naming call, invoked directly, traced end to end. `TriggerDispatcher` forks its refresh and reactive dispatches over the context it captured at build for the same reason.

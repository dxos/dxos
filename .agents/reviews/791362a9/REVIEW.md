---
branch: HEAD
commit: 791362a9a364ab55650f1f707ec67621cf0ded08
base: e6df2be1b8ec531a3490b98d9560a199651eabea
mode: fast
createdAt: 2026-10-03T18:35:48.433Z
isFinalized: true
groups: 61
rules: [bounded-live-state, collect-dead-entities, declare-optional-services-with-noop-layers, inject-dependencies-via-constructor, namespace-brand-key-prefixing, no-casts, no-mixed-promise-effect-lifecycle]
reviewId: 791362a9
---

_6 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 791362a9-1 - ignored - namespace-brand-key-prefixing - packages/core/compute/ai/src/AiTelemetry.ts:208
- 791362a9-2 - ignored - no-casts - packages/core/compute/assistant/src/request/AiRequest.ts:395
- 791362a9-3 - ignored - inject-dependencies-via-constructor - packages/core/compute/assistant/src/session/AiContext.ts:74
- 791362a9-4 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/assistant/src/session/AiSession.ts:167
- 791362a9-5 - ignored - bounded-live-state - packages/core/compute/compute-runtime/src/process-store.ts:139
- 791362a9-6 - ignored - bounded-live-state - packages/core/compute/compute-runtime/src/ProcessManager.ts:474
- 791362a9-7 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.ts:762
- 791362a9-8 - ignored - collect-dead-entities - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:194
- 791362a9-9 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:350
- 791362a9-10 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:362
- 791362a9-11 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:390

## Issues

# WARN 791362a9-1 namespace-brand-key-prefixing `packages/core/compute/ai/src/AiTelemetry.ts:208`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.80. The likeliest place is lines 208-221 (`}).pipe(Stream.onEnd(Effect.sync(() => markWork(REQUEST_MARKS.response, reque...`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 791362a9-2 no-casts `packages/core/compute/assistant/src/request/AiRequest.ts:395`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 395-406 (`withoutToolCallParsing,`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 791362a9-3 inject-dependencies-via-constructor `packages/core/compute/assistant/src/session/AiContext.ts:74`

System One judges this a likely violation of `inject-dependencies-via-constructor` (Take shared collaborators once, not per-method), p=0.85. The likeliest place is lines 74-77 (`const countBindingWrite = (feed: Feed.Feed): void => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 791362a9-4 no-mixed-promise-effect-lifecycle `packages/core/compute/assistant/src/session/AiSession.ts:167`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 167-178 (`public async appendTurnMessage(message: Message.Message): Promise<void> {`, location confidence 0.52). Judged with added `importers, imports` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 791362a9-5 bounded-live-state `packages/core/compute/compute-runtime/src/process-store.ts:139`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.86. The likeliest place is lines 139-150 (`putProcess(record: PersistedProcess): Effect.Effect<void> {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 791362a9-6 bounded-live-state `packages/core/compute/compute-runtime/src/ProcessManager.ts:474`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.80. The likeliest place is lines 474-497 (`if (!handle) {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 791362a9-7 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:762`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 762-785 (`return handle as unknown as Handle<I, O, _Rpcs>;`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 791362a9-8 collect-dead-entities `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:194`

System One judges this a likely violation of `collect-dead-entities` (Terminated entries are retained up to a cap and then collected), p=0.81. The likeliest place is lines 194-205 (`fiberCache.set(handle.pid, fiber);`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 791362a9-9 no-mixed-promise-effect-lifecycle `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:350`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.84. The likeliest place is lines 350-361 (`);`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 791362a9-10 no-casts `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:362`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 362-373 (`}`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 791362a9-11 declare-optional-services-with-noop-layers `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:390`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.85. The likeliest place is lines 390-401 (`export const layer: Layer.Layer<`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `e6df2be1b8ec531a3490b98d9560a199651eabea`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 11 violations written to fragments, 338 uncertain, 167 clean, 0 unanswered
- left for an agentic reviewer: 55 batch(es)

```text
requests: 341 (188 verdicts re-asked with context the model requested)
estimated input tokens: 4161533
billed input tokens: 3980525 (cost $0.1672)
measured chars per token: 3.14
```

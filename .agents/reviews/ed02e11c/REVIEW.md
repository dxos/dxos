---
branch: HEAD
commit: ed02e11c9947500a576e711634e734cf16a5474d
base: e36e44b0088c707d9a27fb4ccd4bfb757347e1c5
mode: fast
createdAt: 2026-10-03T16:57:55.496Z
isFinalized: true
groups: 61
rules: [declare-optional-services-with-noop-layers, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, flat-layer-composition, no-casts, no-mixed-promise-effect-lifecycle, no-sleep-in-test]
reviewId: ed02e11c
---

_2 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- ed02e11c-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:193
- ed02e11c-2 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:427
- ed02e11c-3 - ignored - flat-layer-composition - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1496
- ed02e11c-4 - ignored - no-sleep-in-test - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:2267
- ed02e11c-5 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:389
- ed02e11c-6 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:401
- ed02e11c-7 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:422
- ed02e11c-8 - ignored - error-messages-carry-context - packages/e2e/perf-harness/src/score/stages.ts:20

## Issues

# WARN ed02e11c-1 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:193`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 193-216 (`const makeParentAwaitingChild = () =>`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ed02e11c-2 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:427`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 427-450 (`const manager = yield* ProcessManager.Service;`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN ed02e11c-3 flat-layer-composition `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1496`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 1496-1519 (`Layer.provideMerge(RemoteTraceMonitor.layerNoop),`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN ed02e11c-4 no-sleep-in-test `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:2267`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.83. The likeliest place is lines 2267-2290 (`yield* Effect.yieldNow.pipe(Effect.repeat({ times: 10 }));`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN ed02e11c-5 no-mixed-promise-effect-lifecycle `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:389`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.85. The likeliest place is lines 389-400 (`try {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ed02e11c-6 no-casts `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:401`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 401-412 (`const _invokeCore: OperationInvoker.OperationInvokerInternal['_invokeCore'] =...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN ed02e11c-7 declare-optional-services-with-noop-layers `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:422`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.84. The likeliest place is lines 422-433 (`export const layer: Layer.Layer<`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN ed02e11c-8 error-messages-carry-context `packages/e2e/perf-harness/src/score/stages.ts:20`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 20-31 (`export const parseStageEvent = (json: unknown): StageEvent => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

All eight findings point at code this PR does not change (the flagged line ranges fall outside its hunks: `ProcessManager.test.ts` 193/427/1496/2267, `ProcessOperationInvoker.ts` 389–433 — `invokePromise`, `_invokeCore`, `layer` — and `parseStageEvent` in `stages.ts`), so they are left as they are.

### System One pass

- model: jev-latest
- base for context: `e36e44b0088c707d9a27fb4ccd4bfb757347e1c5`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 8 violations written to fragments, 177 uncertain, 218 clean, 0 unanswered
- left for an agentic reviewer: 49 batch(es)

```text
requests: 272 (106 verdicts re-asked with context the model requested)
estimated input tokens: 3642285
billed input tokens: 3583789 (cost $0.1505)
measured chars per token: 3.05
```

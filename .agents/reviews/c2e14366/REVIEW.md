---
branch: dm/confident-goodall-aitck0
commit: c2e1436666bda66afd28456aadc1b2d1fb654d0b
base: 7a5616a823bfbf294872869d6a579376d572871d
mode: fast
createdAt: 2026-10-03T19:05:08.004Z
isFinalized: true
groups: 62
rules: [bounded-live-state, collect-dead-entities, declare-optional-services-with-noop-layers, effect-fn-not-hand-wrapped-gen, flat-layer-composition, namespace-export-with-internal-hiding, no-casts, no-mixed-promise-effect-lifecycle]
reviewId: c2e14366
---

_6 error(s), 7 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- c2e14366-1 - ignored - namespace-export-with-internal-hiding - packages/core/compute/compute-runtime/src/index.ts:13
- c2e14366-2 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessHandle.ts:416
- c2e14366-3 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:430
- c2e14366-4 - ignored - flat-layer-composition - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1463
- c2e14366-5 - ignored - bounded-live-state - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:194
- c2e14366-6 - ignored - collect-dead-entities - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:194
- c2e14366-7 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:350
- c2e14366-8 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:362
- c2e14366-9 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:389
- c2e14366-10 - ignored - no-casts - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1110
- c2e14366-11 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/OperationHandlerSet.ts:24
- c2e14366-12 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/OperationHandlerSet.ts:243
- c2e14366-13 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/capabilities/check-app-scheme.ts:153

## Issues

# WARN c2e14366-1 namespace-export-with-internal-hiding `packages/core/compute/compute-runtime/src/index.ts:13`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.85. The likeliest place is lines 13-26 (`export * as ProcessMonitor from './ProcessMonitor.ts';`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c2e14366-2 no-casts `packages/core/compute/compute-runtime/src/ProcessHandle.ts:416`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 416-439 (`const defWithSchema = definition as unknown as { input: Schema.Codec<I, unkno...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c2e14366-3 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:430`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 430-453 (`const manager = yield* ProcessManager.Service;`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN c2e14366-4 flat-layer-composition `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1463`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 1463-1486 (`);`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c2e14366-5 bounded-live-state `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:194`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.82. The likeliest place is lines 194-205 (`fiberCache.set(handle.pid, fiber);`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c2e14366-6 collect-dead-entities `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:194`

System One judges this a likely violation of `collect-dead-entities` (Terminated entries are retained up to a cap and then collected), p=0.84. The likeliest place is lines 194-205 (`fiberCache.set(handle.pid, fiber);`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN c2e14366-7 no-mixed-promise-effect-lifecycle `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:350`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.86. The likeliest place is lines 350-361 (`};`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c2e14366-8 no-casts `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:362`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 362-373 (`};`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN c2e14366-9 declare-optional-services-with-noop-layers `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:389`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.85. The likeliest place is lines 389-400 (`export const layer: Layer.Layer<`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c2e14366-10 no-casts `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1110`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 1110-1121 (`const timerSpec = trigger.spec as Trigger.TimerSpec;`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN c2e14366-11 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/OperationHandlerSet.ts:24`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 24-35 (`export interface OperationHandlerSet {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN c2e14366-12 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/OperationHandlerSet.ts:243`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 243-257 (`const lookup = (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c2e14366-13 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/capabilities/check-app-scheme.ts:153`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 153-162 (`props: { onOpenHere },`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `7a5616a823bfbf294872869d6a579376d572871d`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 13 violations written to fragments, 198 uncertain, 112 clean, 0 unanswered
- left for an agentic reviewer: 55 batch(es)

```text
requests: 282 (120 verdicts re-asked with context the model requested)
estimated input tokens: 4200503
billed input tokens: 4018284 (cost $0.1688)
measured chars per token: 3.14
```

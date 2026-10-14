---
branch: dm/modest-goldwasser-486e7a-jpevdc
commit: 1935a824f1fb77533f61e3012a631766d3c506f8
base: 752c4a9e90053ae1ab9b39329fb668cd70ae6f38
mode: fast
createdAt: 2026-10-01T10:07:42.111Z
isFinalized: true
groups: 60
rules: [effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, flat-layer-composition, no-casts, no-mixed-promise-effect-lifecycle, use-context-scoped-cancellation]
reviewId: 1935a824
---

_3 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 1935a824-1 - ignored - no-casts - packages/core/compute/compute-runtime/src/LayerStack.test.ts:763
- 1935a824-2 - ignored - no-casts - packages/core/compute/compute-runtime/src/LayerStack.ts:881
- 1935a824-3 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/query-service.ts:38
- 1935a824-4 - resolved - use-context-scoped-cancellation - packages/core/echo/echo-host/src/db-host/query-service.ts:430
- 1935a824-5 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.test.ts:56
- 1935a824-6 - ignored - flat-layer-composition - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:205
- 1935a824-7 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:229
- 1935a824-8 - ignored - no-casts - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:253

## Issues

# ERROR 1935a824-1 no-casts `packages/core/compute/compute-runtime/src/LayerStack.test.ts:763`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 763-810 (`const resolvedA = yield* resolveWithScope(resolver.resolve(ServiceA, { proces...`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1935a824-2 no-casts `packages/core/compute/compute-runtime/src/LayerStack.ts:881`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 881-904 (`const defaultTracer = Context.make(Tracer.Tracer, yield* Effect.tracer);`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1935a824-3 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/query-service.ts:38`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 38-49 (`updateIndexes: () => Promise<void>;`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1935a824-4 use-context-scoped-cancellation `packages/core/echo/echo-host/src/db-host/query-service.ts:430`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.87. The likeliest place is lines 430-441 (`this.#wakeTimer = undefined;`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1935a824-5 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.test.ts:56`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 56-61 (`const resolveWith = <S>(manager: PluginManager.PluginManager, tag: Context.Ke...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1935a824-6 flat-layer-composition `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:205`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 205-216 (`const remoteProcessManagerLayer = RemoteProcessManager.layerNoop.pipe(Layer.p...`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1935a824-7 effect-requirement-type-not-erased `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:229`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.85. The likeliest place is lines 229-240 (`runFork: (effect, options) => managedRuntime.runFork(effect as Effect.Effect<...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1935a824-8 no-casts `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:253`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 253-264 (`const operationInvoker: OperationInvoker.OperationInvoker = managedRuntime.ru...`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `752c4a9e90053ae1ab9b39329fb668cd70ae6f38`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 8 violations written to fragments, 226 uncertain, 142 clean, 0 unanswered
- left for an agentic reviewer: 55 batch(es)

```text
requests: 289 (134 verdicts re-asked with context the model requested)
estimated input tokens: 3980464
billed input tokens: 3877933 (cost $0.1629)
measured chars per token: 3.08
```

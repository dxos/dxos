---
branch: dm/zen-hawking-92843m
commit: 99a0a1840bbbfd2b7ae1dc5220ff36e78ae8734a
base: 8ad08cb2be9afbc854637512e3fa36d633216698
mode: fast
createdAt: 2026-11-06T12:13:01.998Z
isFinalized: true
groups: 162
rules: [code-not-in-strings, declare-optional-services-with-noop-layers, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, flat-layer-composition, inject-dependencies-via-constructor, keep-parallel-apis-structurally-aligned, namespace-export-with-internal-hiding, no-casts, no-module-level-object-caches, options-object-with-defaults]
reviewId: 99a0a1840b
---

_3 error(s), 16 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 99a0a1840b-1 - ignored - flat-layer-composition - packages/plugins/plugin-client/src/capabilities/client.ts:189
- 99a0a1840b-2 - ignored - no-casts - packages/sdk/app-framework/src/core/capability.ts:299
- 99a0a1840b-3 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/core/capability.ts:587
- 99a0a1840b-4 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/core/capability.ts:587
- 99a0a1840b-5 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/core/plugin.ts:160
- 99a0a1840b-6 - ignored - options-object-with-defaults - packages/sdk/app-framework/src/core/plugin.ts:314
- 99a0a1840b-7 - ignored - no-casts - packages/sdk/app-framework/src/core/plugin.ts:499
- 99a0a1840b-8 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/core/plugin.ts:915
- 99a0a1840b-9 - ignored - namespace-export-with-internal-hiding - packages/sdk/app-framework/src/index.ts:1
- 99a0a1840b-10 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useApp.tsx:373
- 99a0a1840b-11 - ignored - no-module-level-object-caches - packages/sdk/app-framework/src/vite-plugin/plugin-config/index.ts:150
- 99a0a1840b-12 - ignored - inject-dependencies-via-constructor - packages/sdk/app-framework/src/vite-plugin/plugin-config/index.ts:228
- 99a0a1840b-13 - ignored - code-not-in-strings - packages/sdk/app-framework/src/vite-plugin/plugin-config/index.ts:372
- 99a0a1840b-14 - ignored - flat-layer-composition - packages/sdk/app-framework/src/worker/PluginWorker.ts:166
- 99a0a1840b-15 - ignored - flat-layer-composition - packages/sdk/app-framework/src/worker/testing/echo-worker-module.ts:25
- 99a0a1840b-16 - ignored - keep-parallel-apis-structurally-aligned - packages/sdk/app-framework/src/worker/WorkerEvents.ts:35
- 99a0a1840b-17 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/services/service-stack.ts:87
- 99a0a1840b-18 - ignored - flat-layer-composition - packages/sdk/client-services/src/internal/worker/worker-runtime.ts:254
- 99a0a1840b-19 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client/src/services/dedicated/dedicated-worker.ts:32

## Issues

# WARN 99a0a1840b-1 flat-layer-composition `packages/plugins/plugin-client/src/capabilities/client.ts:189`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.86. The likeliest place is lines 189-200 (`const clientServiceLayer = awaitInitialization`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 99a0a1840b-2 no-casts `packages/sdk/app-framework/src/core/capability.ts:299`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 299-317 (`const buildTag = <T, S extends string, A extends Arity>(identifier: S, arity:...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 99a0a1840b-3 effect-requirement-type-not-erased `packages/sdk/app-framework/src/core/capability.ts:587`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.84. The likeliest place is lines 587-608 (`export const lazyModule = <`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 99a0a1840b-4 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/core/capability.ts:587`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 587-608 (`export const lazyModule = <`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 99a0a1840b-5 effect-requirement-type-not-erased `packages/sdk/app-framework/src/core/plugin.ts:160`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.82. The likeliest place is lines 160-183 (`export type TypedModuleOptions = {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 99a0a1840b-6 options-object-with-defaults `packages/sdk/app-framework/src/core/plugin.ts:314`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.80. The likeliest place is lines 314-332 (`export const getMetaFromConfig = ({ plugin }: Config2.Config): Meta => {`, location confidence 0.47). Judged with added `importers, public-api` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 99a0a1840b-7 no-casts `packages/sdk/app-framework/src/core/plugin.ts:499`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 499-520 (`const moduleOpts = moduleOrOptionsOrBuilder as ModuleEntry | ((options: T) =>...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 99a0a1840b-8 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/core/plugin.ts:915`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 915-929 (`return yield* Effect.fail(new LazyPluginError({ context: { id, reason: 'missi...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 99a0a1840b-9 namespace-export-with-internal-hiding `packages/sdk/app-framework/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.92. The likeliest place is lines 1-12 (`export * from './common/index.ts';`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 99a0a1840b-10 no-casts `packages/sdk/app-framework/src/ui/hooks/useApp.tsx:373`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 373-384 (`if (event === ActivationEvents.Startup.id && state === 'activated' && !module) {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 99a0a1840b-11 no-module-level-object-caches `packages/sdk/app-framework/src/vite-plugin/plugin-config/index.ts:150`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.80. The likeliest place is lines 150-162 (`const WORKER_ENVIRONMENT = 'plugin-worker';`, location confidence 0.36). Judged with added `importers` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN 99a0a1840b-12 inject-dependencies-via-constructor `packages/sdk/app-framework/src/vite-plugin/plugin-config/index.ts:228`

System One judges this a likely violation of `inject-dependencies-via-constructor` (Take shared collaborators once, not per-method), p=0.81. The likeliest place is lines 228-239 (`const evaluate = (root: string, file: string): Promise<unknown> => {`, location confidence 0.18). Judged with added `diff, importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 99a0a1840b-13 code-not-in-strings `packages/sdk/app-framework/src/vite-plugin/plugin-config/index.ts:372`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.86. The likeliest place is lines 372-383 (``export const make = Plugin.lazy(meta, () => import(${JSON.stringify(`./${bas...`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 99a0a1840b-14 flat-layer-composition `packages/sdk/app-framework/src/worker/PluginWorker.ts:166`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.88. The likeliest place is lines 166-177 (`LayerStack.layer({ layers, services: [ConfigService, Hook.Controller, RpcRout...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 99a0a1840b-15 flat-layer-composition `packages/sdk/app-framework/src/worker/testing/echo-worker-module.ts:25`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 25-36 (`Effect.provideService(Hook.Controller, host.hooks),`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 99a0a1840b-16 keep-parallel-apis-structurally-aligned `packages/sdk/app-framework/src/worker/WorkerEvents.ts:35`

System One judges this a likely violation of `keep-parallel-apis-structurally-aligned` (Give parallel modules and methods the same signature shape), p=0.84. The likeliest place is lines 35-38 (`export const SessionClosed = Hook.make<{ readonly clientId: string; readonly ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 99a0a1840b-17 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/services/service-stack.ts:87`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.82. The likeliest place is lines 87-98 (`export const registerReplicator = <Self>(`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 99a0a1840b-18 flat-layer-composition `packages/sdk/client-services/src/internal/worker/worker-runtime.ts:254`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.87. The likeliest place is lines 254-265 (`yield* Layer.build(`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 99a0a1840b-19 effect-fn-not-hand-wrapped-gen `packages/sdk/client/src/services/dedicated/dedicated-worker.ts:32`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 32-43 (`export const runDedicatedWorker = (options: RunDedicatedWorkerOptions = {}): ...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `8ad08cb2be9afbc854637512e3fa36d633216698`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 19 violations written to fragments, 236 uncertain, 1052 clean, 0 unanswered
- left for an agentic reviewer: 82 batch(es)

```text
requests: 556 (151 verdicts re-asked with context the model requested)
estimated input tokens: 4775267
billed input tokens: 4451773 (cost $0.1870)
measured chars per token: 3.22
```

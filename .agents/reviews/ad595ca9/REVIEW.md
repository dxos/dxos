---
branch: main-scp1bo
commit: ad595ca976a8c6a76251367034a8dfff96a08a82
base: b0c5000902ff103c3156b2ea6a7c6c0ed3f80825
mode: fast
createdAt: 2026-10-05T08:43:26.252Z
isFinalized: true
groups: 155
rules: [collect-dead-entities, declare-optional-services-with-noop-layers, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, errors-extend-base-error, flat-layer-composition, import-as-namespace-is-all-or-nothing, namespace-export-with-internal-hiding, no-casts, no-mixed-promise-effect-lifecycle, reactive-state-via-atom-bridge]
reviewId: ad595ca9
---

_8 error(s), 12 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- ad595ca9-1 - ignored - flat-layer-composition - packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:168
- ad595ca9-2 - ignored - no-casts - packages/core/compute/assistant/src/session/Harness.ts:265
- ad595ca9-3 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/compute-runtime/src/index.ts:13
- ad595ca9-4 - ignored - namespace-export-with-internal-hiding - packages/core/compute/compute-runtime/src/index.ts:13
- ad595ca9-5 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessHandle.ts:415
- ad595ca9-6 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:445
- ad595ca9-7 - ignored - flat-layer-composition - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1505
- ad595ca9-8 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.ts:727
- ad595ca9-9 - ignored - collect-dead-entities - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:194
- ad595ca9-10 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:350
- ad595ca9-11 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:362
- ad595ca9-12 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:389
- ad595ca9-13 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/QueuedRemoteControl.ts:396
- ad595ca9-14 - ignored - errors-extend-base-error - packages/core/compute/compute-runtime/src/testing/LocalRemoteHost.ts:223
- ad595ca9-15 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:60
- ad595ca9-16 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:83
- ad595ca9-17 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/common/capabilities.ts:305
- ad595ca9-18 - ignored - flat-layer-composition - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:205
- ad595ca9-19 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:229
- ad595ca9-20 - ignored - no-casts - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:253

## Issues

# WARN ad595ca9-1 flat-layer-composition `packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:168`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 168-184 (`const assistantTestLayerOptions = {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ad595ca9-2 no-casts `packages/core/compute/assistant/src/session/Harness.ts:265`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 265-277 (`),`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN ad595ca9-3 import-as-namespace-is-all-or-nothing `packages/core/compute/compute-runtime/src/index.ts:13`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 13-26 (`export * as QueuedRemoteControl from './QueuedRemoteControl.ts';`, location confidence 0.01). Judged with added `importers` context after a first pass of 0.72. This is a single-shot classifier: confirm against the rule before acting.

# WARN ad595ca9-4 namespace-export-with-internal-hiding `packages/core/compute/compute-runtime/src/index.ts:13`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.82. The likeliest place is lines 13-26 (`export * as QueuedRemoteControl from './QueuedRemoteControl.ts';`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ad595ca9-5 no-casts `packages/core/compute/compute-runtime/src/ProcessHandle.ts:415`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 415-438 (`const defWithSchema = definition as unknown as { input: Schema.Codec<I, unkno...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ad595ca9-6 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:445`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 445-468 (`function* ({ expect }) {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN ad595ca9-7 flat-layer-composition `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1505`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 1505-1528 (`Layer.provideMerge(RemoteTraceMonitor.layerNoop),`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ad595ca9-8 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:727`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 727-750 (`const defRaw = definition as unknown as { input: Schema.Codec<any, any, never...`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ad595ca9-9 collect-dead-entities `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:194`

System One judges this a likely violation of `collect-dead-entities` (Terminated entries are retained up to a cap and then collected), p=0.81. The likeliest place is lines 194-205 (`fiberCache.set(handle.pid, fiber);`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN ad595ca9-10 no-mixed-promise-effect-lifecycle `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:350`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.85. The likeliest place is lines 350-361 (`};`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ad595ca9-11 no-casts `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:362`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 362-373 (`};`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN ad595ca9-12 declare-optional-services-with-noop-layers `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:389`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.85. The likeliest place is lines 389-400 (`export const layer: Layer.Layer<`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN ad595ca9-13 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/QueuedRemoteControl.ts:396`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 396-407 (`status: ({ spaceId, pid }) =>`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ad595ca9-14 errors-extend-base-error `packages/core/compute/compute-runtime/src/testing/LocalRemoteHost.ts:223`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.94. The likeliest place is lines 223-235 (`class ChannelDown extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ad595ca9-15 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:60`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 60-71 (`const attachActiveHandle = (`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN ad595ca9-16 reactive-state-via-atom-bridge `packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:83`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.87. The likeliest place is lines 83-94 (`export const useProcessEphemeralStatus = (`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN ad595ca9-17 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/common/capabilities.ts:305`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 305-316 (`export const getAtomValue = <T>(`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN ad595ca9-18 flat-layer-composition `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:205`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 205-216 (`const remoteProcessManagerLayer = RemoteProcessManager.layerNoop.pipe(Layer.p...`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN ad595ca9-19 effect-requirement-type-not-erased `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:229`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.83. The likeliest place is lines 229-240 (`const processManagerRuntime: Capabilities.ProcessManagerRuntime = {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ad595ca9-20 no-casts `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:253`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 253-264 (`);`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `b0c5000902ff103c3156b2ea6a7c6c0ed3f80825`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 20 violations written to fragments, 196 uncertain, 1051 clean, 0 unanswered
- left for an agentic reviewer: 56 batch(es)

```text
requests: 544 (130 verdicts re-asked with context the model requested)
estimated input tokens: 6068414
billed input tokens: 5639923 (cost $0.2369)
measured chars per token: 3.23
```

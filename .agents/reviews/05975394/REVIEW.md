---
branch: dm/exciting-newton-fudstq
commit: 0597539447c83cba35287b7aa4168fe6edf493bd
base: 5b853f459a2378e8876787e446295d521610ced9
mode: fast
createdAt: 2026-10-07T04:50:39.560Z
isFinalized: true
groups: 151
rules: [consistent-private-field-convention, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, errors-extend-base-error, flat-layer-composition, import-as-namespace-is-all-or-nothing, namespace-export-with-internal-hiding, no-casts, no-mixed-promise-effect-lifecycle, reactive-state-via-atom-bridge, test-asserts-real-behavior]
reviewId: 05975394
---

_10 error(s), 16 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 05975394-1 - ignored - flat-layer-composition - packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:168
- 05975394-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:30
- 05975394-3 - ignored - namespace-export-with-internal-hiding - packages/core/compute/compute-runtime/src/index.ts:1
- 05975394-4 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/compute-runtime/src/index.ts:13
- 05975394-5 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessHandle.ts:440
- 05975394-6 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1420
- 05975394-7 - ignored - flat-layer-composition - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1468
- 05975394-8 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.ts:620
- 05975394-9 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:157
- 05975394-10 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:157
- 05975394-11 - ignored - errors-extend-base-error - packages/core/compute/compute-runtime/src/testing/LocalRemoteHost.ts:223
- 05975394-12 - ignored - consistent-private-field-convention - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:392
- 05975394-13 - ignored - no-casts - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1110
- 05975394-14 - ignored - no-casts - packages/core/compute/compute/src/Operation.ts:178
- 05975394-15 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/Operation.ts:1114
- 05975394-16 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/Process.ts:654
- 05975394-17 - ignored - no-casts - packages/core/compute/compute/src/Process.ts:678
- 05975394-18 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/operation/src/OperationInvoker.ts:60
- 05975394-19 - ignored - no-casts - packages/core/compute/operation/src/OperationInvoker.ts:126
- 05975394-20 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:60
- 05975394-21 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:83
- 05975394-22 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/capabilities/check-app-scheme.ts:153
- 05975394-23 - ignored - test-asserts-real-behavior - packages/plugins/plugin-transcription/src/normalization/normalization.test.ts:103
- 05975394-24 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/common/capabilities.ts:304
- 05975394-25 - ignored - no-casts - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:230
- 05975394-26 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:230

## Issues

# WARN 05975394-1 flat-layer-composition `packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:168`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 168-184 (`const assistantTestLayerOptions = {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 05975394-2 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:30`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 30-44 (`const resolveArtifactRef = (id: string): Effect.Effect<Ref.Ref<Obj.Unknown>, ...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 05975394-3 namespace-export-with-internal-hiding `packages/core/compute/compute-runtime/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.89. The likeliest place is lines 1-12 (`export * from './errors.ts';`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 05975394-4 import-as-namespace-is-all-or-nothing `packages/core/compute/compute-runtime/src/index.ts:13`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 13-26 (`export * as QueuedRemoteControl from './QueuedRemoteControl.ts';`, location confidence 0.48). Judged with added `importers` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 05975394-5 no-casts `packages/core/compute/compute-runtime/src/ProcessHandle.ts:440`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 440-463 (`const defWithSchema = definition as unknown as { input: Schema.Codec<I, unkno...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 05975394-6 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1420`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 1420-1443 (`),`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 05975394-7 flat-layer-composition `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1468`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 1468-1491 (`);`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 05975394-8 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:620`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 620-643 (`return handle as unknown as Process.Process<I, O, _Rpcs>;`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 05975394-9 no-casts `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:157`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 157-168 (`...args: any[]`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 05975394-10 no-mixed-promise-effect-lifecycle `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:157`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.89. The likeliest place is lines 157-168 (`...args: any[]`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 05975394-11 errors-extend-base-error `packages/core/compute/compute-runtime/src/testing/LocalRemoteHost.ts:223`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.93. The likeliest place is lines 223-235 (`class ChannelDown extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 05975394-12 consistent-private-field-convention `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:392`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.82. The likeliest place is lines 392-415 (`#pendingRefreshFiber: Fiber.Fiber<void, never> | undefined;`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 05975394-13 no-casts `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1110`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 1110-1121 (`const timerSpec = trigger.spec as Trigger.TimerSpec;`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 05975394-14 no-casts `packages/core/compute/compute/src/Operation.ts:178`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 178-212 (`export const lazyHandler: {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 05975394-15 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/Operation.ts:1114`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.86. The likeliest place is lines 1114-1159 (`export interface OperationService {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 05975394-16 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/Process.ts:654`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 654-677 (`const idempotent = Operation.isIdempotent(op);`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 05975394-17 no-casts `packages/core/compute/compute/src/Process.ts:678`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 678-701 (`yield* Trace.write(Trace.OperationInput, {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 05975394-18 no-mixed-promise-effect-lifecycle `packages/core/compute/operation/src/OperationInvoker.ts:60`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.89. The likeliest place is lines 60-71 (`) => Promise<{ data?: O; error?: Error }>;`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 05975394-19 no-casts `packages/core/compute/operation/src/OperationInvoker.ts:126`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 126-137 (`private _getDynamicRuntime(services: readonly Context.Key<any, any>[]): Dynam...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 05975394-20 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:60`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 60-71 (`const attachActiveHandle = (`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 05975394-21 reactive-state-via-atom-bridge `packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:83`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.86. The likeliest place is lines 83-94 (`export const useProcessEphemeralStatus = (`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 05975394-22 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/capabilities/check-app-scheme.ts:153`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 153-162 (`props: { onOpenHere },`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 05975394-23 test-asserts-real-behavior `packages/plugins/plugin-transcription/src/normalization/normalization.test.ts:103`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.84. The likeliest place is lines 103-113 (`throw new Error('test');`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 05975394-24 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/common/capabilities.ts:304`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 304-315 (`export const getAtomValue = <T>(`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 05975394-25 no-casts `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:230`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 230-241 (`const processManagerRuntime: Capabilities.ProcessManagerRuntime = {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 05975394-26 effect-requirement-type-not-erased `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:230`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.83. The likeliest place is lines 230-241 (`const processManagerRuntime: Capabilities.ProcessManagerRuntime = {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `5b853f459a2378e8876787e446295d521610ced9`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 26 violations written to fragments, 221 uncertain, 995 clean, 0 unanswered
- left for an agentic reviewer: 55 batch(es)

```text
requests: 599 (141 verdicts re-asked with context the model requested)
estimated input tokens: 8226273
billed input tokens: 7716737 (cost $0.3241)
measured chars per token: 3.20
```

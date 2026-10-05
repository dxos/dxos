---
branch: dm/exciting-newton-fudstq
commit: 5b853f459a2378e8876787e446295d521610ced9
base: 7b031542f132d4b7d60ba49ab6be40081f76ff9c
mode: fast
createdAt: 2026-10-05T10:12:42.717Z
isFinalized: true
groups: 111
rules: [consistent-private-field-convention, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, flat-layer-composition, import-as-namespace-is-all-or-nothing, namespace-export-with-internal-hiding, no-casts, no-mixed-promise-effect-lifecycle, reuse-shared-test-layer, test-asserts-real-behavior]
reviewId: 5b853f45
---

_7 error(s), 14 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 5b853f45-1 - ignored - flat-layer-composition - packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:169
- 5b853f45-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-runtime/src/agent-service/delegation-scripted.test.ts:65
- 5b853f45-3 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:30
- 5b853f45-4 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/compute-runtime/src/index.ts:1
- 5b853f45-5 - ignored - namespace-export-with-internal-hiding - packages/core/compute/compute-runtime/src/index.ts:13
- 5b853f45-6 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessHandle.ts:415
- 5b853f45-7 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1424
- 5b853f45-8 - ignored - flat-layer-composition - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1472
- 5b853f45-9 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.ts:630
- 5b853f45-10 - ignored - consistent-private-field-convention - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:392
- 5b853f45-11 - ignored - no-casts - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1110
- 5b853f45-12 - ignored - no-casts - packages/core/compute/compute/src/Operation.ts:211
- 5b853f45-13 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/Operation.ts:1120
- 5b853f45-14 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/operation/src/OperationInvoker.ts:49
- 5b853f45-15 - ignored - no-casts - packages/core/compute/operation/src/OperationInvoker.ts:115
- 5b853f45-16 - ignored - reuse-shared-test-layer - packages/plugins/plugin-assistant/src/processor/streaming.node.test.ts:438
- 5b853f45-17 - ignored - test-asserts-real-behavior - packages/plugins/plugin-transcription/src/normalization/normalization.test.ts:98
- 5b853f45-18 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/common/capabilities.ts:304
- 5b853f45-19 - ignored - flat-layer-composition - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:195
- 5b853f45-20 - ignored - no-casts - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:231
- 5b853f45-21 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:231

## Issues

# WARN 5b853f45-1 flat-layer-composition `packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:169`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 169-185 (`const assistantTestLayerOptions = {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5b853f45-2 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-runtime/src/agent-service/delegation-scripted.test.ts:65`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 65-76 (`const StubDelegationStrategy: DelegationStrategy = {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5b853f45-3 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:30`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 30-44 (`const resolveArtifactRef = (id: string): Effect.Effect<Ref.Ref<Obj.Unknown>, ...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5b853f45-4 import-as-namespace-is-all-or-nothing `packages/core/compute/compute-runtime/src/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-12 (`export * from './errors.ts';`, location confidence 0.10). Judged with added `importers` context after a first pass of 0.69. This is a single-shot classifier: confirm against the rule before acting.

# WARN 5b853f45-5 namespace-export-with-internal-hiding `packages/core/compute/compute-runtime/src/index.ts:13`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.85. The likeliest place is lines 13-25 (`export * from './remote-command-queue.ts';`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5b853f45-6 no-casts `packages/core/compute/compute-runtime/src/ProcessHandle.ts:415`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 415-438 (`redeliver(event: PersistedEvent, definition: Operation.Durable<I, O, any, any...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5b853f45-7 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1424`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 1424-1447 (`),`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5b853f45-8 flat-layer-composition `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1472`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 1472-1495 (`);`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5b853f45-9 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:630`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 630-653 (`return handle as unknown as Process.Handle<I, O, _Rpcs>;`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5b853f45-10 consistent-private-field-convention `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:392`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.84. The likeliest place is lines 392-415 (`#pendingRefreshFiber: Fiber.Fiber<void, never> | undefined;`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5b853f45-11 no-casts `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1110`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 1110-1121 (`const timerSpec = trigger.spec as Trigger.TimerSpec;`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5b853f45-12 no-casts `packages/core/compute/compute/src/Operation.ts:211`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 211-253 (`export const isOperationWithHandler = (value: unknown): value is WithHandler<...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5b853f45-13 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/Operation.ts:1120`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.89. The likeliest place is lines 1120-1143 (`export interface OperationService {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5b853f45-14 no-mixed-promise-effect-lifecycle `packages/core/compute/operation/src/OperationInvoker.ts:49`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.89. The likeliest place is lines 49-60 (`) => Promise<{ data?: O; error?: Error }>;`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5b853f45-15 no-casts `packages/core/compute/operation/src/OperationInvoker.ts:115`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 115-126 (`private _getDynamicRuntime(services: readonly Context.Key<any, any>[]): Dynam...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5b853f45-16 reuse-shared-test-layer `packages/plugins/plugin-assistant/src/processor/streaming.node.test.ts:438`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.82. The likeliest place is lines 438-449 (`const makeSpaceLayer = (agentService: AgentService.Service) =>`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5b853f45-17 test-asserts-real-behavior `packages/plugins/plugin-transcription/src/normalization/normalization.test.ts:98`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.84. The likeliest place is lines 98-108 (`throw new Error('test');`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5b853f45-18 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/common/capabilities.ts:304`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 304-315 (`export const getAtomValue = <T>(`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5b853f45-19 flat-layer-composition `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:195`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 195-206 (`);`, location confidence 0.17). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5b853f45-20 no-casts `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:231`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 231-242 (`const processManagerRuntime: Capabilities.ProcessManagerRuntime = {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5b853f45-21 effect-requirement-type-not-erased `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:231`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.84. The likeliest place is lines 231-242 (`const processManagerRuntime: Capabilities.ProcessManagerRuntime = {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `7b031542f132d4b7d60ba49ab6be40081f76ff9c`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 21 violations written to fragments, 193 uncertain, 640 clean, 0 unanswered
- left for an agentic reviewer: 57 batch(es)

```text
requests: 451 (121 verdicts re-asked with context the model requested)
estimated input tokens: 6342229
billed input tokens: 5970129 (cost $0.2507)
measured chars per token: 3.19
```

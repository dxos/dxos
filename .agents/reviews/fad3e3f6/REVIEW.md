---
branch: dm/exciting-newton-fudstq
commit: fad3e3f6cc44cb431a415dbf4d08392934a03ca1
base: 073aef849bfc554dd5c0ed5c116c8786582cfb5e
mode: fast
createdAt: 2026-10-07T07:51:14.122Z
isFinalized: true
groups: 195
rules: [bounded-live-state, consistent-private-field-convention, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, errors-extend-base-error, flat-layer-composition, import-as-namespace-is-all-or-nothing, inline-obj-parent, namespace-export-with-internal-hiding, no-casts, no-mixed-promise-effect-lifecycle, no-sleep-in-test, operations-take-refs-not-ids, reactive-state-via-atom-bridge, test-asserts-real-behavior]
reviewId: fad3e3f6
---

_9 error(s), 23 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- fad3e3f6-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-runtime/src/testing/assistant-test-layer.ts:240
- fad3e3f6-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:32
- fad3e3f6-3 - ignored - namespace-export-with-internal-hiding - packages/core/compute/compute-runtime/src/index.ts:1
- fad3e3f6-4 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/compute-runtime/src/index.ts:13
- fad3e3f6-5 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessHandle.ts:429
- fad3e3f6-6 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1465
- fad3e3f6-7 - ignored - flat-layer-composition - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1513
- fad3e3f6-8 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.ts:90
- fad3e3f6-9 - ignored - bounded-live-state - packages/core/compute/compute-runtime/src/ProcessManager.ts:212
- fad3e3f6-10 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:159
- fad3e3f6-11 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:159
- fad3e3f6-12 - ignored - no-sleep-in-test - packages/core/compute/compute-runtime/src/QueuedRemoteControl.e2e.test.ts:356
- fad3e3f6-13 - ignored - errors-extend-base-error - packages/core/compute/compute-runtime/src/testing/LocalRemoteHost.ts:223
- fad3e3f6-14 - ignored - consistent-private-field-convention - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:381
- fad3e3f6-15 - ignored - no-casts - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1111
- fad3e3f6-16 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/DurableOperation.tst.ts:106
- fad3e3f6-17 - ignored - no-casts - packages/core/compute/compute/src/Operation.ts:178
- fad3e3f6-18 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/Operation.ts:1119
- fad3e3f6-19 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/Process.ts:525
- fad3e3f6-20 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:60
- fad3e3f6-21 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:83
- fad3e3f6-22 - ignored - inline-obj-parent - packages/plugins/plugin-connector/src/Binding.test.ts:494
- fad3e3f6-23 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-connector/src/Binding.test.ts:663
- fad3e3f6-24 - ignored - no-sleep-in-test - packages/plugins/plugin-connector/src/Binding.test.ts:879
- fad3e3f6-25 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/capabilities/check-app-scheme.ts:153
- fad3e3f6-26 - ignored - operations-take-refs-not-ids - packages/plugins/plugin-routine/src/types/RoutineOperation.ts:44
- fad3e3f6-27 - ignored - test-asserts-real-behavior - packages/plugins/plugin-transcription/src/normalization/normalization.test.ts:103
- fad3e3f6-28 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/common/capabilities.ts:304
- fad3e3f6-29 - ignored - flat-layer-composition - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:182
- fad3e3f6-30 - ignored - no-casts - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:230
- fad3e3f6-31 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:230
- fad3e3f6-32 - ignored - effect-fn-not-hand-wrapped-gen - packages/ui/react-ui-trace/src/testing/simulated-agent.ts:122

## Issues

# WARN fad3e3f6-1 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-runtime/src/testing/assistant-test-layer.ts:240`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 240-251 (`ServiceResolver.succeed(Harness.HarnessService, (context) =>`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN fad3e3f6-2 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:32`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 32-46 (`const resolveArtifactRef = (id: string): Effect.Effect<Ref.Ref<Obj.Unknown>, ...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN fad3e3f6-3 namespace-export-with-internal-hiding `packages/core/compute/compute-runtime/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.86. The likeliest place is lines 1-12 (`export * from './errors.ts';`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN fad3e3f6-4 import-as-namespace-is-all-or-nothing `packages/core/compute/compute-runtime/src/index.ts:13`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 13-27 (`export * as ProcessOperationInvoker from './ProcessOperationInvoker.ts';`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fad3e3f6-5 no-casts `packages/core/compute/compute-runtime/src/ProcessHandle.ts:429`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 429-452 (`redeliver(event: PersistedEvent, definition: Operation.Durable<I, O, any, any...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fad3e3f6-6 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1465`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 1465-1488 (`),`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN fad3e3f6-7 flat-layer-composition `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1513`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 1513-1536 (`);`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fad3e3f6-8 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:90`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 90-111 (`const EMPTY_RPC_CLIENT: RpcClient.RpcClient<any> = Effect.runSync(`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fad3e3f6-9 bounded-live-state `packages/core/compute/compute-runtime/src/ProcessManager.ts:212`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.80. The likeliest place is lines 212-235 (`readonly #finished: Process.Process[] = [];`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fad3e3f6-10 no-casts `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:159`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 159-170 (`): Promise<{ data?: O; error?: Error }> => {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN fad3e3f6-11 no-mixed-promise-effect-lifecycle `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:159`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.89. The likeliest place is lines 159-170 (`): Promise<{ data?: O; error?: Error }> => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN fad3e3f6-12 no-sleep-in-test `packages/core/compute/compute-runtime/src/QueuedRemoteControl.e2e.test.ts:356`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 356-363 (`const waitUntil = (predicate: Effect.Effect<boolean>): Effect.Effect<void> =>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fad3e3f6-13 errors-extend-base-error `packages/core/compute/compute-runtime/src/testing/LocalRemoteHost.ts:223`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.93. The likeliest place is lines 223-235 (`class ChannelDown extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN fad3e3f6-14 consistent-private-field-convention `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:381`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.81. The likeliest place is lines 381-404 (`#triggerQuery: QueryResult.QueryResult<Trigger.Trigger> | undefined;`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fad3e3f6-15 no-casts `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1111`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 1111-1122 (`const timerSpec = trigger.spec as Trigger.TimerSpec;`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN fad3e3f6-16 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/DurableOperation.tst.ts:106`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 106-117 (`expect(`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fad3e3f6-17 no-casts `packages/core/compute/compute/src/Operation.ts:178`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 178-212 (`export const lazyHandler: {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN fad3e3f6-18 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/Operation.ts:1119`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.85. The likeliest place is lines 1119-1164 (`export interface OperationService {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN fad3e3f6-19 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/Process.ts:525`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 525-536 (`export const spawn = <I, O, Rpcs extends Rpc.Any = never>(`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN fad3e3f6-20 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:60`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 60-71 (`const attachActiveHandle = (`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN fad3e3f6-21 reactive-state-via-atom-bridge `packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:83`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.87. The likeliest place is lines 83-94 (`export const useProcessEphemeralStatus = (`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN fad3e3f6-22 inline-obj-parent `packages/plugins/plugin-connector/src/Binding.test.ts:494`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.91. The likeliest place is lines 494-517 (`);`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN fad3e3f6-23 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-connector/src/Binding.test.ts:663`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 663-686 (`const synced: string[] = [];`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN fad3e3f6-24 no-sleep-in-test `packages/plugins/plugin-connector/src/Binding.test.ts:879`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 879-902 (`await EffectEx.runPromise(`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN fad3e3f6-25 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/capabilities/check-app-scheme.ts:153`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 153-162 (`props: { onOpenHere },`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN fad3e3f6-26 operations-take-refs-not-ids `packages/plugins/plugin-routine/src/types/RoutineOperation.ts:44`

System One judges this a likely violation of `operations-take-refs-not-ids` (Operations identify objects by Ref, never by a raw id string), p=0.81. The likeliest place is lines 44-55 (`export const CreateRoutine = Operation.make({`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN fad3e3f6-27 test-asserts-real-behavior `packages/plugins/plugin-transcription/src/normalization/normalization.test.ts:103`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.84. The likeliest place is lines 103-113 (`throw new Error('test');`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN fad3e3f6-28 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/common/capabilities.ts:304`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 304-315 (`export const getAtomValue = <T>(`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN fad3e3f6-29 flat-layer-composition `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:182`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 182-193 (`const baseLayer = Layer.mergeAll(`, location confidence 0.17). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fad3e3f6-30 no-casts `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:230`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 230-241 (`const processManagerRuntime: Capabilities.ProcessManagerRuntime = {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN fad3e3f6-31 effect-requirement-type-not-erased `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:230`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.85. The likeliest place is lines 230-241 (`const processManagerRuntime: Capabilities.ProcessManagerRuntime = {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN fad3e3f6-32 effect-fn-not-hand-wrapped-gen `packages/ui/react-ui-trace/src/testing/simulated-agent.ts:122`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 122-133 (`onInput: (step: AgentStep) =>`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `073aef849bfc554dd5c0ed5c116c8786582cfb5e`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 32 violations written to fragments, 332 uncertain, 1683 clean, 0 unanswered
- left for an agentic reviewer: 59 batch(es)

```text
requests: 931 (218 verdicts re-asked with context the model requested)
estimated input tokens: 11447868
billed input tokens: 10713495 (cost $0.4500)
measured chars per token: 3.21
```

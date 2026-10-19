---
branch: dm/confident-goodall-aitck0
commit: 7a5616a823bfbf294872869d6a579376d572871d
base: 17008f00b0d17326557cc171df4faf312ef19db1
mode: fast
createdAt: 2026-10-03T18:54:00.033Z
isFinalized: true
groups: 165
rules: [bounded-live-state, collect-dead-entities, consistent-private-field-convention, declare-optional-services-with-noop-layers, effect-fn-not-hand-wrapped-gen, errors-extend-base-error, flat-layer-composition, no-casts, no-mixed-promise-effect-lifecycle, no-sleep-in-test, operations-take-refs-not-ids, reactive-state-via-atom-bridge, toolbars-are-menu-actions]
reviewId: 7a5616a8
---

_13 error(s), 15 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 7a5616a8-1 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessHandle.ts:416
- 7a5616a8-2 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:429
- 7a5616a8-3 - ignored - flat-layer-composition - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1462
- 7a5616a8-4 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.ts:737
- 7a5616a8-5 - ignored - bounded-live-state - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:193
- 7a5616a8-6 - ignored - collect-dead-entities - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:193
- 7a5616a8-7 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:349
- 7a5616a8-8 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:361
- 7a5616a8-9 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:388
- 7a5616a8-10 - ignored - no-sleep-in-test - packages/core/compute/compute-runtime/src/QueuedRemoteControl.e2e.test.ts:351
- 7a5616a8-11 - ignored - errors-extend-base-error - packages/core/compute/compute-runtime/src/testing/LocalRemoteHost.ts:223
- 7a5616a8-12 - ignored - consistent-private-field-convention - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:392
- 7a5616a8-13 - ignored - no-casts - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1110
- 7a5616a8-14 - ignored - no-casts - packages/core/compute/compute/src/Operation.ts:235
- 7a5616a8-15 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/Operation.ts:1040
- 7a5616a8-16 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/OperationHandlerSet.ts:29
- 7a5616a8-17 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/OperationHandlerSet.ts:248
- 7a5616a8-18 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/operation/src/OperationInvoker.ts:59
- 7a5616a8-19 - ignored - no-casts - packages/core/compute/operation/src/OperationInvoker.ts:125
- 7a5616a8-20 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:151
- 7a5616a8-21 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:284
- 7a5616a8-22 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:60
- 7a5616a8-23 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:83
- 7a5616a8-24 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/capabilities/check-app-scheme.ts:153
- 7a5616a8-25 - ignored - operations-take-refs-not-ids - packages/sdk/app-toolkit/src/operations/LayoutOperation.ts:431
- 7a5616a8-26 - ignored - no-casts - packages/ui/react-ui-trace/src/components/TracePanel/TracePanel.stories.tsx:23
- 7a5616a8-27 - ignored - no-casts - packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:163
- 7a5616a8-28 - ignored - effect-fn-not-hand-wrapped-gen - packages/ui/react-ui-trace/src/testing/simulated-agent.ts:86

## Issues

# ERROR 7a5616a8-1 no-casts `packages/core/compute/compute-runtime/src/ProcessHandle.ts:416`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 416-439 (`const defWithSchema = definition as unknown as { input: Schema.Codec<I, unkno...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a5616a8-2 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:429`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 429-452 (`const manager = yield* ProcessManager.Service;`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a5616a8-3 flat-layer-composition `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1462`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 1462-1485 (`);`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a5616a8-4 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:737`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 737-760 (`yield* this.#store.putProcess({`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a5616a8-5 bounded-live-state `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:193`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.80. The likeliest place is lines 193-204 (`fiberCache.set(handle.pid, fiber);`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a5616a8-6 collect-dead-entities `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:193`

System One judges this a likely violation of `collect-dead-entities` (Terminated entries are retained up to a cap and then collected), p=0.84. The likeliest place is lines 193-204 (`fiberCache.set(handle.pid, fiber);`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a5616a8-7 no-mixed-promise-effect-lifecycle `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:349`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.84. The likeliest place is lines 349-360 (`};`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a5616a8-8 no-casts `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:361`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 361-372 (`};`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a5616a8-9 declare-optional-services-with-noop-layers `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:388`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.85. The likeliest place is lines 388-399 (`export const layer: Layer.Layer<`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a5616a8-10 no-sleep-in-test `packages/core/compute/compute-runtime/src/QueuedRemoteControl.e2e.test.ts:351`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 351-358 (`const waitUntil = (predicate: Effect.Effect<boolean>): Effect.Effect<void> =>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a5616a8-11 errors-extend-base-error `packages/core/compute/compute-runtime/src/testing/LocalRemoteHost.ts:223`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.94. The likeliest place is lines 223-235 (`class ChannelDown extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a5616a8-12 consistent-private-field-convention `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:392`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.80. The likeliest place is lines 392-415 (`#pendingRefreshFiber: Fiber.Fiber<void, never> | undefined;`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a5616a8-13 no-casts `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1110`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 1110-1121 (`const timerSpec = trigger.spec as Trigger.TimerSpec;`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a5616a8-14 no-casts `packages/core/compute/compute/src/Operation.ts:235`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 235-258 (`services: props.services ?? [],`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a5616a8-15 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/Operation.ts:1040`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.86. The likeliest place is lines 1040-1063 (`export interface OperationService {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a5616a8-16 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/OperationHandlerSet.ts:29`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.85. The likeliest place is lines 29-40 (`export interface OperationHandlerSet {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a5616a8-17 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/OperationHandlerSet.ts:248`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 248-262 (`const lookup = (`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a5616a8-18 no-mixed-promise-effect-lifecycle `packages/core/compute/operation/src/OperationInvoker.ts:59`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.90. The likeliest place is lines 59-70 (`) => Promise<{ data?: O; error?: Error }>;`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a5616a8-19 no-casts `packages/core/compute/operation/src/OperationInvoker.ts:125`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 125-136 (`private _getDynamicRuntime(services: readonly Context.Key<any, any>[]): Dynam...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a5616a8-20 no-casts `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:151`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 151-162 (`() => [...allMessages].sort((a, b) => (a.events[0]?.timestamp ?? 0) - (b.even...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a5616a8-21 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:284`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 284-295 (`<Button icon='ph--skip-back--regular' iconOnly label='Reset (R)' onClick={han...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a5616a8-22 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:60`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 60-71 (`const attachActiveHandle = (`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a5616a8-23 reactive-state-via-atom-bridge `packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:83`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.85. The likeliest place is lines 83-94 (`export const useProcessEphemeralStatus = (`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a5616a8-24 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/capabilities/check-app-scheme.ts:153`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 153-162 (`props: { onOpenHere },`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a5616a8-25 operations-take-refs-not-ids `packages/sdk/app-toolkit/src/operations/LayoutOperation.ts:431`

System One judges this a likely violation of `operations-take-refs-not-ids` (Operations identify objects by Ref, never by a raw id string), p=0.80. The likeliest place is lines 431-442 (`export const Expose = Operation.make({`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a5616a8-26 no-casts `packages/ui/react-ui-trace/src/components/TracePanel/TracePanel.stories.tsx:23`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 23-27 (`const messages = (subAgentDelegationFixture as unknown as Trace.Message[])`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a5616a8-27 no-casts `packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:163`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 163-189 (`const buildToolCallContext = (messages: readonly Trace.Message[]): ToolCallCo...`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a5616a8-28 effect-fn-not-hand-wrapped-gen `packages/ui/react-ui-trace/src/testing/simulated-agent.ts:86`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 86-95 (`const writeAndFlush = <T>(eventType: Trace.EventType<T>, payload: T) =>`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `17008f00b0d17326557cc171df4faf312ef19db1`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 28 violations written to fragments, 265 uncertain, 1337 clean, 0 unanswered
- left for an agentic reviewer: 67 batch(es)

```text
requests: 740 (162 verdicts re-asked with context the model requested)
estimated input tokens: 9264825
billed input tokens: 8767514 (cost $0.3682)
measured chars per token: 3.17
```

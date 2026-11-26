---
branch: dm/cross-agent-delegation
commit: 9483d301209a3dabcb7ff078f8c95630b5ec76c8
base: 4f0fbbfffadd5b0fa615a42e522a137635cef3dd
mode: fast
createdAt: 2026-11-26T19:49:11.540Z
isFinalized: true
groups: 366
rules: [atom-lifetime-bound-to-owner, bounded-live-state, call-effect-api-not-promise-bridge, declare-optional-services-with-noop-layers, dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, error-messages-carry-context, errors-extend-base-error, event-handler-naming-convention, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, jsdoc-non-obvious-identifiers, mutate-echo-arrays-with-splice, named-durations-and-budgets, namespace-export-with-internal-hiding, no-casts, no-mixed-promise-effect-lifecycle, no-retries-or-skips-for-flaky-tests, no-sleep-in-test, no-styling-wrapper-divs, no-trivial-wrappers-over-official-apis, no-try-catch-in-effect-code, operations-resolve-database-from-service, per-test-mutable-fixtures, structured-logging-not-console, subpath-lint-not-adhoc-entrypoints, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy]
reviewId: 9483d301209
---

_8 error(s), 60 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 9483d301209-1 - unresolved - subpath-lint-not-adhoc-entrypoints - packages/common/permission/package.json:25
- 9483d301209-2 - unresolved - per-test-mutable-fixtures - packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:206
- 9483d301209-3 - unresolved - flat-layer-composition - packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:330
- 9483d301209-4 - unresolved - test-real-scenario-not-narrower-proxy - packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:977
- 9483d301209-5 - unresolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-runtime/src/agent-service/AgentService.ts:65
- 9483d301209-6 - unresolved - declare-optional-services-with-noop-layers - packages/core/compute/agent-runtime/src/agent-service/AgentService.ts:218
- 9483d301209-7 - unresolved - error-messages-carry-context - packages/core/compute/agent-runtime/src/agent-service/AgentService.ts:811
- 9483d301209-8 - unresolved - test-real-scenario-not-narrower-proxy - packages/core/compute/agent-runtime/src/agent-service/guard.test.ts:22
- 9483d301209-9 - unresolved - per-test-mutable-fixtures - packages/core/compute/agent-runtime/src/agent-service/guard.test.ts:42
- 9483d301209-10 - unresolved - namespace-export-with-internal-hiding - packages/core/compute/compute-runtime/src/index.ts:1
- 9483d301209-11 - unresolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/OperationProcess.ts:160
- 9483d301209-12 - unresolved - per-test-mutable-fixtures - packages/core/compute/compute-runtime/src/permission.test.ts:84
- 9483d301209-13 - ignored - bounded-live-state - packages/core/compute/compute-runtime/src/process-store.ts:144
- 9483d301209-14 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessHandle.ts:429
- 9483d301209-15 - unresolved - per-test-mutable-fixtures - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:128
- 9483d301209-16 - unresolved - declare-optional-services-with-noop-layers - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:318
- 9483d301209-17 - unresolved - flat-layer-composition - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:431
- 9483d301209-18 - unresolved - call-effect-api-not-promise-bridge - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:666
- 9483d301209-19 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:2782
- 9483d301209-20 - ignored - bounded-live-state - packages/core/compute/compute-runtime/src/ProcessManager.ts:499
- 9483d301209-21 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.ts:945
- 9483d301209-22 - unresolved - no-sleep-in-test - packages/core/compute/compute-runtime/src/QueuedRemoteControl.e2e.test.ts:469
- 9483d301209-23 - unresolved - flat-layer-composition - packages/core/compute/compute-runtime/src/RemoteOperationInvoke.e2e.test.ts:168
- 9483d301209-24 - unresolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/script-operations.test.ts:82
- 9483d301209-25 - unresolved - flat-layer-composition - packages/core/compute/compute-runtime/src/TriggerManager.test.ts:83
- 9483d301209-26 - unresolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/TriggerManager.test.ts:119
- 9483d301209-27 - unresolved - flat-layer-composition - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.test.ts:1078
- 9483d301209-28 - unresolved - per-test-mutable-fixtures - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.test.ts:1630
- 9483d301209-29 - unresolved - mutate-echo-arrays-with-splice - packages/core/compute/compute/src/Agent.ts:202
- 9483d301209-30 - unresolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/Agent.ts:313
- 9483d301209-31 - ignored - no-casts - packages/core/compute/compute/src/Operation.ts:940
- 9483d301209-32 - unresolved - no-try-catch-in-effect-code - packages/core/compute/compute/src/Operation.ts:1160
- 9483d301209-33 - unresolved - dont-leak-internal-api-through-public-surface - packages/core/compute/compute/src/Operation.ts:1306
- 9483d301209-34 - unresolved - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/Operation.ts:1509
- 9483d301209-35 - unresolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/Process.ts:638
- 9483d301209-36 - unresolved - flat-layer-composition - packages/devtools/cli/src/util/trigger-runtime.ts:86
- 9483d301209-37 - unresolved - structured-logging-not-console - packages/devtools/devtools/src/components/ObjectsTree.tsx:135
- 9483d301209-38 - unresolved - flat-layer-composition - packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:104
- 9483d301209-39 - unresolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:248
- 9483d301209-40 - unresolved - structured-logging-not-console - packages/plugins/plugin-assistant/src/chat-model/chat-model.edge.test.ts:154
- 9483d301209-41 - unresolved - named-durations-and-budgets - packages/plugins/plugin-assistant/src/chat-model/chat-model.edge.test.ts:187
- 9483d301209-42 - unresolved - flat-layer-composition - packages/plugins/plugin-assistant/src/chat-model/chat-model.edge.test.ts:248
- 9483d301209-43 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:150
- 9483d301209-44 - unresolved - no-try-catch-in-effect-code - packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:639
- 9483d301209-45 - unresolved - no-trivial-wrappers-over-official-apis - packages/plugins/plugin-assistant/src/chat-model/outbox.test.ts:13
- 9483d301209-46 - unresolved - atom-lifetime-bound-to-owner - packages/plugins/plugin-assistant/src/chat-model/outbox.ts:49
- 9483d301209-47 - unresolved - no-try-catch-in-effect-code - packages/plugins/plugin-assistant/src/chat-model/outbox.ts:121
- 9483d301209-48 - unresolved - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:488
- 9483d301209-49 - unresolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:611
- 9483d301209-50 - unresolved - event-handler-naming-convention - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:632
- 9483d301209-51 - unresolved - declare-optional-services-with-noop-layers - packages/plugins/plugin-assistant/src/operations/run-prompt-in-chat.ts:22
- 9483d301209-52 - unresolved - inject-dependencies-via-constructor - packages/plugins/plugin-assistant/src/util/consent.ts:50
- 9483d301209-53 - unresolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/util/consent.ts:130
- 9483d301209-54 - unresolved - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-inbox/src/types/InboxOperation.ts:1
- 9483d301209-55 - unresolved - jsdoc-non-obvious-identifiers - packages/plugins/plugin-inbox/src/types/InboxOperation.ts:110
- 9483d301209-56 - unresolved - dont-leak-internal-api-through-public-surface - packages/plugins/plugin-inbox/src/types/InboxOperation.ts:241
- 9483d301209-57 - unresolved - operations-resolve-database-from-service - packages/plugins/plugin-inbox/src/types/InboxOperation.ts:241
- 9483d301209-58 - unresolved - test-asserts-real-behavior - packages/plugins/plugin-transcription/src/normalization/normalization.test.ts:80
- 9483d301209-59 - unresolved - no-retries-or-skips-for-flaky-tests - packages/plugins/plugin-transcription/src/normalization/normalization.test.ts:80
- 9483d301209-60 - unresolved - no-try-catch-in-effect-code - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:81
- 9483d301209-61 - unresolved - atom-lifetime-bound-to-owner - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:121
- 9483d301209-62 - unresolved - flat-layer-composition - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:289
- 9483d301209-63 - ignored - no-casts - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:325
- 9483d301209-64 - unresolved - effect-requirement-type-not-erased - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:337
- 9483d301209-65 - unresolved - flat-layer-composition - packages/stories/stories-assistant/src/testing/crm.ts:171
- 9483d301209-66 - unresolved - import-as-namespace-is-all-or-nothing - packages/stories/storybook-testing/src/StoryModules.ts:1
- 9483d301209-67 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:370
- 9483d301209-68 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/widgets/WidgetPanel.tsx:78

## Issues

# WARN 9483d301209-1 subpath-lint-not-adhoc-entrypoints `packages/common/permission/package.json:25`

System One judges this a likely violation of `subpath-lint-not-adhoc-entrypoints` (Expose a package's modules as namespaces via the subpath lint, not hand-added entry points), p=0.80. The likeliest place is lines 25-36 (`},`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-2 per-test-mutable-fixtures `packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:206`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.93. The likeliest place is lines 206-224 (`const delegationHarness: DelegationHarness = { pending: [], completed: [] };`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-3 flat-layer-composition `packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:330`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 330-348 (`const ScriptedTestLayer = (`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-4 test-real-scenario-not-narrower-proxy `packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:977`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.81. The likeliest place is lines 977-1000 (`'delegates work to a sub-agent and folds the result back on completion',`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-5 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts:65`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 65-90 (`export const bindSession = (`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-6 declare-optional-services-with-noop-layers `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts:218`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.92. The likeliest place is lines 218-241 (`export const layer = (opts?: Options): Layer.Layer<Agent.Service, never, Proc...`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-7 error-messages-carry-context `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts:811`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 811-828 (`currentThread: Effect.die(new Error('Agent.currentThread is not implemented.')),`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-8 test-real-scenario-not-narrower-proxy `packages/core/compute/agent-runtime/src/agent-service/guard.test.ts:22`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.81. The likeliest place is lines 22-29 (`const { text, toolCall, scriptedAiService } = ScriptedLanguageModel;`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-9 per-test-mutable-fixtures `packages/core/compute/agent-runtime/src/agent-service/guard.test.ts:42`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.82. The likeliest place is lines 42-52 (`const handlers = OperationHandlerSet.make(`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-10 namespace-export-with-internal-hiding `packages/core/compute/compute-runtime/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.87. The likeliest place is lines 1-12 (`export * from './errors.ts';`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-11 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/OperationProcess.ts:160`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 160-171 (`export const admitOperation = (op: Operation.Definition.Any, input: unknown):...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-12 per-test-mutable-fixtures `packages/core/compute/compute-runtime/src/permission.test.ts:84`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.93. The likeliest place is lines 84-88 (`const consent = {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 9483d301209-13 bounded-live-state `packages/core/compute/compute-runtime/src/process-store.ts:144`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.88. The likeliest place is lines 144-155 (`putProcess(record: PersistedProcess): Effect.Effect<void> {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 9483d301209-14 no-casts `packages/core/compute/compute-runtime/src/ProcessHandle.ts:429`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 429-452 (`redeliver(event: PersistedEvent, definition: Operation.Durable<I, O, any, any...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-15 per-test-mutable-fixtures `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:128`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.85. The likeliest place is lines 128-144 (`const SlowChildGate = {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-16 declare-optional-services-with-noop-layers `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:318`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.82. The likeliest place is lines 318-345 (`Effect.gen(function* () {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-17 flat-layer-composition `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:431`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 431-453 (`const TestLayer = ProcessOperationInvoker.layer.pipe(Layer.provideMerge(Unifi...`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-18 call-effect-api-not-promise-bridge `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:666`

System One judges this a likely violation of `call-effect-api-not-promise-bridge` (Inside Effect code, call the Effect form of an API, never its Promise twin), p=0.80. The likeliest place is lines 666-689 (`Effect.fn(`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 9483d301209-19 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:2782`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 2782-2805 (`)!;`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 9483d301209-20 bounded-live-state `packages/core/compute/compute-runtime/src/ProcessManager.ts:499`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.84. The likeliest place is lines 499-522 (`if (this.#finished.length > FINISHED_PROCESS_RETENTION) {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 9483d301209-21 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:945`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 945-968 (`return handle as unknown as Process.Process<I, O, _Rpcs>;`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-22 no-sleep-in-test `packages/core/compute/compute-runtime/src/QueuedRemoteControl.e2e.test.ts:469`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 469-476 (`const waitUntil = (predicate: Effect.Effect<boolean>): Effect.Effect<void> =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-23 flat-layer-composition `packages/core/compute/compute-runtime/src/RemoteOperationInvoke.e2e.test.ts:168`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 168-179 (`Layer.provide(`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-24 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/script-operations.test.ts:82`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 82-91 (`const delegatingRunner: Operation.ScriptRunner = {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-25 flat-layer-composition `packages/core/compute/compute-runtime/src/TriggerManager.test.ts:83`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.86. The likeliest place is lines 83-94 (`const recordingRemoteManager = () => {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-26 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/TriggerManager.test.ts:119`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 119-129 (`const withMonitor = <A, E, R>(body: (monitor: Trigger.Manager) => Effect.Effe...`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-27 flat-layer-composition `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.test.ts:1078`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 1078-1101 (`}, Effect.provide(TestLayer())),`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-28 per-test-mutable-fixtures `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.test.ts:1630`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.82. The likeliest place is lines 1630-1653 (`const trigger = Trigger.make({ runnable: Ref.make(op), enabled: true, spec: T...`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-29 mutate-echo-arrays-with-splice `packages/core/compute/compute/src/Agent.ts:202`

System One judges this a likely violation of `mutate-echo-arrays-with-splice` (Remove or reorder entries of an ECHO array with splice, never by reassigning the array), p=0.91. The likeliest place is lines 202-224 (`}`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-30 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/Agent.ts:313`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 313-329 (`export const loadTasks = (session: Session): Effect.Effect<Task.Task[], never...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 9483d301209-31 no-casts `packages/core/compute/compute/src/Operation.ts:940`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 940-963 (`export const makeScript = <const P extends Types.NoExcessProperties<ScriptPro...`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-32 no-try-catch-in-effect-code `packages/core/compute/compute/src/Operation.ts:1160`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.90. The likeliest place is lines 1160-1175 (`export const serializable = (operations: readonly Definition.Any[]): Persiste...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-33 dont-leak-internal-api-through-public-surface `packages/core/compute/compute/src/Operation.ts:1306`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.85. The likeliest place is lines 1306-1326 (`conversation?: URI.URI;`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-34 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/Operation.ts:1509`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.91. The likeliest place is lines 1509-1532 (`schedule: <I, O>(`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-35 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/Process.ts:638`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 638-656 (`export const spawn = <I, O, Rpcs extends Rpc.Any = never>(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-36 flat-layer-composition `packages/devtools/cli/src/util/trigger-runtime.ts:86`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.86. The likeliest place is lines 86-97 (`return TriggerDispatcher.layer({ timeControl: 'natural', livePollInterval })....`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-37 structured-logging-not-console `packages/devtools/devtools/src/components/ObjectsTree.tsx:135`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.94. The likeliest place is lines 135-158 (`}, [node.id, model.database, onOpen]);`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-38 flat-layer-composition `packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:104`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.86. The likeliest place is lines 104-115 (`const stack = (peer: Peer) =>`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-39 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:248`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 248-259 (`Effect.gen(function* () {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-40 structured-logging-not-console `packages/plugins/plugin-assistant/src/chat-model/chat-model.edge.test.ts:154`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.84. The likeliest place is lines 154-162 (`})),`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-41 named-durations-and-budgets `packages/plugins/plugin-assistant/src/chat-model/chat-model.edge.test.ts:187`

System One judges this a likely violation of `named-durations-and-budgets` (Write durations as unit arithmetic and time budgets as shared named strategies), p=0.92. The likeliest place is lines 187-198 (`const agent = yield* AgentServiceRuntime.bindSession(chat, {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-42 flat-layer-composition `packages/plugins/plugin-assistant/src/chat-model/chat-model.edge.test.ts:248`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 248-259 (`const stack = (client: Client, space: Space) =>`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 9483d301209-43 errors-extend-base-error `packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:150`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 150-176 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-44 no-try-catch-in-effect-code `packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:639`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.82. The likeliest place is lines 639-662 (`}`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-45 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-assistant/src/chat-model/outbox.test.ts:13`

System One judges this a likely violation of `no-trivial-wrappers-over-official-apis` (Do not extract a helper that only forwards to an official API), p=0.81. The likeliest place is lines 13-29 (`const createDispatch = () => {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-46 atom-lifetime-bound-to-owner `packages/plugins/plugin-assistant/src/chat-model/outbox.ts:49`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.95. The likeliest place is lines 49-60 (`export class Outbox<T> {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-47 no-try-catch-in-effect-code `packages/plugins/plugin-assistant/src/chat-model/outbox.ts:121`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.89. The likeliest place is lines 121-132 (`} catch (err) {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-48 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:488`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 488-509 (`const ChatContent = Util.composable<HTMLDivElement, ChatContentProps>(({ chil...`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-49 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:611`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 611-631 (`const useInPlaceUpdates = (model: FeedModel, messages: readonly Message.Messa...`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-50 event-handler-naming-convention `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:632`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.81. The likeliest place is lines 632-655 (`const getLane = useCallback((message: Message.Message) => lanes?.get(message....`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-51 declare-optional-services-with-noop-layers `packages/plugins/plugin-assistant/src/operations/run-prompt-in-chat.ts:22`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.81. The likeliest place is lines 22-33 (`const handler: Operation.WithHandler<typeof AssistantOperation.RunPromptInCha...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-52 inject-dependencies-via-constructor `packages/plugins/plugin-assistant/src/util/consent.ts:50`

System One judges this a likely violation of `inject-dependencies-via-constructor` (Take shared collaborators once, not per-method), p=0.87. The likeliest place is lines 50-61 (`export const consentLayerSpec = (manager: CapabilityManager.CapabilityManager...`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-53 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/util/consent.ts:130`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 130-143 (`export const respond = ({ chat, message, requestId, optionId }: RespondOption...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-54 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-inbox/src/types/InboxOperation.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-22 (`import * as Schema from 'effect/Schema';`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-55 jsdoc-non-obvious-identifiers `packages/plugins/plugin-inbox/src/types/InboxOperation.ts:110`

System One judges this a likely violation of `jsdoc-non-obvious-identifiers` (Document a parameter, field, or handle whose meaning isn't obvious from its name), p=0.80. The likeliest place is lines 110-135 (`export const DraftEmailAndOpen = Operation.make({`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-56 dont-leak-internal-api-through-public-surface `packages/plugins/plugin-inbox/src/types/InboxOperation.ts:241`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.81. The likeliest place is lines 241-254 (`export const ExtractInputSchema = Schema.Struct({`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-57 operations-resolve-database-from-service `packages/plugins/plugin-inbox/src/types/InboxOperation.ts:241`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.97. The likeliest place is lines 241-254 (`export const ExtractInputSchema = Schema.Struct({`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-58 test-asserts-real-behavior `packages/plugins/plugin-transcription/src/normalization/normalization.test.ts:80`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.92. The likeliest place is lines 80-91 (`describe.skip('SentenceNormalization', () => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-59 no-retries-or-skips-for-flaky-tests `packages/plugins/plugin-transcription/src/normalization/normalization.test.ts:80`

System One judges this a likely violation of `no-retries-or-skips-for-flaky-tests` (Fix a flaky test's cause; don't add retries, CI skips, or lean on quarantine), p=0.81. The likeliest place is lines 80-91 (`describe.skip('SentenceNormalization', () => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-60 no-try-catch-in-effect-code `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:81`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.87. The likeliest place is lines 81-92 (`}`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-61 atom-lifetime-bound-to-owner `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:121`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.90. The likeliest place is lines 121-132 (`export const fromStack = (`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-62 flat-layer-composition `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:289`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.86. The likeliest place is lines 289-300 (`const processManagerLayer = ProcessManager.layer({ runtimeName: Trace.CommonR...`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 9483d301209-63 no-casts `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:325`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 325-336 (`const managedRuntime = ManagedRuntime.make(runtimeLayer as Layer.Layer<any, a...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-64 effect-requirement-type-not-erased `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:337`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.89. The likeliest place is lines 337-348 (`runFork: (effect, options) => managedRuntime.runFork(effect as Effect.Effect<...`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-65 flat-layer-composition `packages/stories/stories-assistant/src/testing/crm.ts:171`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 171-182 (`export const seedCrmAgents = async ({ db, model }: { db: Database.Database; m...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-66 import-as-namespace-is-all-or-nothing `packages/stories/storybook-testing/src/StoryModules.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-12 (`export {`, location confidence 0.48). Judged with added `importers` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-67 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:370`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 370-381 (`const ToolSection = ({ label, data }: { label: string; data: unknown }) => (`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9483d301209-68 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/widgets/WidgetPanel.tsx:78`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 78-84 (`export const WidgetPanelRow = ({ icon, label, testId }: Pick<WidgetPanelProps...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `4f0fbbfffadd5b0fa615a42e522a137635cef3dd`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 68 violations written to fragments, 688 uncertain, 2590 clean, 0 unanswered
- left for an agentic reviewer: 138 batch(es)

```text
requests: 1534 (397 verdicts re-asked with context the model requested)
estimated input tokens: 16807649
billed input tokens: 15744606 (cost $0.6613)
measured chars per token: 3.20
```

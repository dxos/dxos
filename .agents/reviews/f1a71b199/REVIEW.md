---
branch: dm/friendly-maxwell-ln3vr9
commit: f1a71b199e46259db806c763769dc5e200731bc2
base: 5e9c5abd072364fc8e57985f5ded33a7dbb16beb
mode: fast
createdAt: 2026-10-22T18:17:11.890Z
isFinalized: true
groups: 268
rules: [bounded-live-state, business-logic-out-of-ui, consistent-file-naming-within-folder, declare-optional-services-with-noop-layers, dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, errors-extend-base-error, event-handler-naming-convention, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, inline-obj-parent, named-durations-and-budgets, no-casts, no-mixed-promise-effect-lifecycle, no-module-level-object-caches, no-sleep-in-test, no-styling-wrapper-divs, no-try-catch-in-effect-code, one-test-suite-per-module, per-test-mutable-fixtures, reactive-state-via-atom-bridge, story-for-new-ui-component, structural-regions-use-design-system-components, structured-logging-not-console, test-real-scenario-not-narrower-proxy]
reviewId: f1a71b199
---

_4 error(s), 43 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- f1a71b199-1 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-runtime/src/agent-service/agent-process.ts:168
- f1a71b199-2 - ignored - event-handler-naming-convention - packages/core/compute/agent-runtime/src/agent-service/agent-process.ts:661
- f1a71b199-3 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/agent-runtime/src/agent-service/index.ts:1
- f1a71b199-4 - ignored - dont-leak-internal-api-through-public-surface - packages/core/compute/agent-runtime/src/agent-service/index.ts:13
- f1a71b199-5 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-runtime/src/agent-service/light-threads.e2e.test.ts:25
- f1a71b199-6 - ignored - flat-layer-composition - packages/core/compute/agent-runtime/src/agent-service/light-threads.e2e.test.ts:73
- f1a71b199-7 - ignored - named-durations-and-budgets - packages/core/compute/agent-runtime/src/agent-service/light-threads.e2e.test.ts:207
- f1a71b199-8 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-runtime/src/agent-service/light-threads.test.ts:87
- f1a71b199-9 - ignored - flat-layer-composition - packages/core/compute/agent-runtime/src/agent-service/light-threads.test.ts:122
- f1a71b199-10 - ignored - no-sleep-in-test - packages/core/compute/agent-runtime/src/agent-service/light-threads.test.ts:297
- f1a71b199-11 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-runtime/src/agent-service/thread-scheduler.ts:122
- f1a71b199-12 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/assistant/src/session/AiSession.ts:145
- f1a71b199-13 - ignored - flat-layer-composition - packages/core/compute/assistant/src/session/AiSession.ts:409
- f1a71b199-14 - ignored - flat-layer-composition - packages/core/compute/assistant/src/session/thread-toolkit.ts:65
- f1a71b199-15 - ignored - no-module-level-object-caches - packages/core/compute/assistant/src/session/TrajectoryStore.ts:298
- f1a71b199-16 - ignored - no-try-catch-in-effect-code - packages/core/compute/compute-runtime/src/process-trace.ts:84
- f1a71b199-17 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:64
- f1a71b199-18 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:124
- f1a71b199-19 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:268
- f1a71b199-20 - ignored - structured-logging-not-console - packages/core/compute/compute/src/Trace.ts:53
- f1a71b199-21 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/Trace.ts:53
- f1a71b199-22 - ignored - one-test-suite-per-module - packages/plugins/plugin-agent/src/operations/ensure-channel-chat.test.ts:176
- f1a71b199-23 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-assistant/src/chat-model/chat-model.lanes.scripted.node.test.ts:103
- f1a71b199-24 - ignored - flat-layer-composition - packages/plugins/plugin-assistant/src/chat-model/chat-model.lanes.scripted.node.test.ts:121
- f1a71b199-25 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:132
- f1a71b199-26 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:579
- f1a71b199-27 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-assistant/src/chat-model/lanes.test.ts:1
- f1a71b199-28 - resolved - bounded-live-state - packages/plugins/plugin-assistant/src/chat-model/lanes.ts:52
- f1a71b199-29 - resolved - no-module-level-object-caches - packages/plugins/plugin-assistant/src/chat-model/lanes.ts:52
- f1a71b199-30 - resolved - inject-dependencies-via-constructor - packages/plugins/plugin-assistant/src/chat-model/lanes.ts:52
- f1a71b199-31 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-assistant/src/chat-model/thread.test.ts:377
- f1a71b199-32 - ignored - no-module-level-object-caches - packages/plugins/plugin-assistant/src/chat-model/thread.ts:222
- f1a71b199-33 - ignored - event-handler-naming-convention - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:206
- f1a71b199-34 - ignored - business-logic-out-of-ui - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:302
- f1a71b199-35 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:458
- f1a71b199-36 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:986
- f1a71b199-37 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-assistant/src/types/Settings.ts:1
- f1a71b199-38 - ignored - consistent-file-naming-within-folder - packages/stories/stories-assistant/src/stories/MultiTenantThreads.stories.tsx:44
- f1a71b199-39 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/MultiTenantThreads.stories.tsx:191
- f1a71b199-40 - ignored - consistent-file-naming-within-folder - packages/stories/stories-assistant/src/stories/Subagents.stories.tsx:23
- f1a71b199-41 - ignored - inline-obj-parent - packages/stories/stories-assistant/src/testing/decorators.tsx:411
- f1a71b199-42 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.tsx:124
- f1a71b199-43 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:126
- f1a71b199-44 - ignored - no-try-catch-in-effect-code - packages/ui/react-ui-assistant/src/widgets/LaneWidget.tsx:18
- f1a71b199-45 - ignored - structural-regions-use-design-system-components - packages/ui/react-ui-assistant/src/widgets/LaneWidget.tsx:58
- f1a71b199-46 - ignored - story-for-new-ui-component - packages/ui/react-ui-assistant/src/widgets/LaneWidget.tsx:103
- f1a71b199-47 - resolved - no-casts - packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:860

## Issues

# WARN f1a71b199-1 no-try-catch-in-effect-code `packages/core/compute/agent-runtime/src/agent-service/agent-process.ts:168`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 168-180 (`const resultPreview = (value: unknown): string | undefined => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-2 event-handler-naming-convention `packages/core/compute/agent-runtime/src/agent-service/agent-process.ts:661`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 661-684 (`yield* runLanes(`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-3 import-as-namespace-is-all-or-nothing `packages/core/compute/agent-runtime/src/agent-service/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-12 (`export * as AgentService from './AgentService.ts';`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-4 dont-leak-internal-api-through-public-surface `packages/core/compute/agent-runtime/src/agent-service/index.ts:13`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.80. The likeliest place is lines 13-19 (`type AgentProcessOptions,`, location confidence 0.72). Judged with added `importers, imports, public-api` context after a first pass of 0.66. This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-5 per-test-mutable-fixtures `packages/core/compute/agent-runtime/src/agent-service/light-threads.e2e.test.ts:25`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.86. The likeliest place is lines 25-42 (`import { type ContentBlock, Message } from '@dxos/types';`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-6 flat-layer-composition `packages/core/compute/agent-runtime/src/agent-service/light-threads.e2e.test.ts:73`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.86. The likeliest place is lines 73-89 (`const layer = () =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-7 named-durations-and-budgets `packages/core/compute/agent-runtime/src/agent-service/light-threads.e2e.test.ts:207`

System One judges this a likely violation of `named-durations-and-budgets` (Write durations as unit arithmetic and time budgets as shared named strategies), p=0.87. The likeliest place is lines 207-214 (`const answerOf = (view: Reducer.ThreadView, lane: Reducer.Lane) =>`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-8 per-test-mutable-fixtures `packages/core/compute/agent-runtime/src/agent-service/light-threads.test.ts:87`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.86. The likeliest place is lines 87-92 (`const delegationRequests: ScriptedLanguageModel.ScriptedRequest[] = [];`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-9 flat-layer-composition `packages/core/compute/agent-runtime/src/agent-service/light-threads.test.ts:122`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 122-130 (`const layer = () =>`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-10 no-sleep-in-test `packages/core/compute/agent-runtime/src/agent-service/light-threads.test.ts:297`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 297-308 (`events.filter((event) => event.payload._tag === 'message' && event.sender.rol...`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-11 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-runtime/src/agent-service/thread-scheduler.ts:122`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 122-133 (`Effect.gen(function* () {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-12 no-mixed-promise-effect-lifecycle `packages/core/compute/assistant/src/session/AiSession.ts:145`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.90. The likeliest place is lines 145-156 (`public async getHistory(): Promise<Message.Message[]> {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-13 flat-layer-composition `packages/core/compute/assistant/src/session/AiSession.ts:409`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 409-420 (`Layer.succeed(`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-14 flat-layer-composition `packages/core/compute/assistant/src/session/thread-toolkit.ts:65`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 65-76 (`DelegateToolkit,`, location confidence 0.42). Judged with added `importers` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-15 no-module-level-object-caches `packages/core/compute/assistant/src/session/TrajectoryStore.ts:298`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.90. The likeliest place is lines 298-303 (`const entryMessages = new WeakMap<Reducer.PromptEntry, Message.Message>();`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-16 no-try-catch-in-effect-code `packages/core/compute/compute-runtime/src/process-trace.ts:84`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 84-90 (`opts.sink.write(message);`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-17 declare-optional-services-with-noop-layers `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:64`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.89. The likeliest place is lines 64-75 (`remote?: Effect.Effect<RemoteOperationInvoker.Invoker>;`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f1a71b199-18 no-casts `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:124`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 124-135 (`const awaitRemoteOutput = <O>(handle: Process.Process<any, O, any>, key: stri...`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-19 no-mixed-promise-effect-lifecycle `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:268`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.86. The likeliest place is lines 268-279 (`} catch (error) {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-20 structured-logging-not-console `packages/core/compute/compute/src/Trace.ts:53`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.90. The likeliest place is lines 53-70 (`export function write<T>(eventType: EventType<T>, payload: NoInfer<T>): Effec...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-21 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/Trace.ts:53`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 53-70 (`export function write<T>(eventType: EventType<T>, payload: NoInfer<T>): Effec...`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-22 one-test-suite-per-module `packages/plugins/plugin-agent/src/operations/ensure-channel-chat.test.ts:176`

System One judges this a likely violation of `one-test-suite-per-module` (A module's tests live in its one test file; an operation's tests in a suite named after it), p=0.80. The likeliest place is lines 176-187 (`describe('AgentChannels', () => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-23 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-assistant/src/chat-model/chat-model.lanes.scripted.node.test.ts:103`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.85. The likeliest place is lines 103-114 (`const script: ScriptedLanguageModel.ScriptedTurnGenerator = (request) => {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-24 flat-layer-composition `packages/plugins/plugin-assistant/src/chat-model/chat-model.lanes.scripted.node.test.ts:121`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 121-130 (`const testLayer = () =>`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f1a71b199-25 errors-extend-base-error `packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:132`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 132-158 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-26 no-try-catch-in-effect-code `packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:579`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 579-602 (`try {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-27 per-test-mutable-fixtures `packages/plugins/plugin-assistant/src/chat-model/lanes.test.ts:1`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.87. The likeliest place is lines 1-19 (`import { describe, test } from 'vitest';`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f1a71b199-28 bounded-live-state `packages/plugins/plugin-assistant/src/chat-model/lanes.ts:52`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.81. The likeliest place is lines 52-63 (`const laneRow = (key: string, created: string, text: string): Message.Message...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-29 no-module-level-object-caches `packages/plugins/plugin-assistant/src/chat-model/lanes.ts:52`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.88. The likeliest place is lines 52-63 (`const laneRow = (key: string, created: string, text: string): Message.Message...`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-30 inject-dependencies-via-constructor `packages/plugins/plugin-assistant/src/chat-model/lanes.ts:52`

System One judges this a likely violation of `inject-dependencies-via-constructor` (Take shared collaborators once, not per-method), p=0.80. The likeliest place is lines 52-63 (`const laneRow = (key: string, created: string, text: string): Message.Message...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-31 per-test-mutable-fixtures `packages/plugins/plugin-assistant/src/chat-model/thread.test.ts:377`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.84. The likeliest place is lines 377-393 (`describe('resolveRewind', () => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-32 no-module-level-object-caches `packages/plugins/plugin-assistant/src/chat-model/thread.ts:222`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.95. The likeliest place is lines 222-230 (`const deliveryRows = new WeakMap<`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-33 event-handler-naming-convention `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:206`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.81. The likeliest place is lines 206-229 (`onEvent?.(ev);`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-34 business-logic-out-of-ui `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:302`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 302-325 (`await EffectEx.runPromise(`, location confidence 0.52). Judged with added `diff, imports, siblings` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-35 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:458`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 458-479 (`const ChatContent = Util.composable<HTMLDivElement, ChatContentProps>(({ chil...`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-36 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:986`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 986-1009 (`const ChatTaskQuestions = ({ tasks }: { tasks: readonly Task.Task[] }) => {`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-37 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-assistant/src/types/Settings.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-12 (`import * as Schema from 'effect/Schema';`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-38 consistent-file-naming-within-folder `packages/stories/stories-assistant/src/stories/MultiTenantThreads.stories.tsx:44`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.80. The likeliest place is lines 44-54 (`const meta: Meta<typeof ModuleContainer> = {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-39 error-messages-carry-context `packages/stories/stories-assistant/src/stories/MultiTenantThreads.stories.tsx:191`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.86. The likeliest place is lines 191-203 (`const submitPrompt = async (canvasElement: HTMLElement, value: string) => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-40 consistent-file-naming-within-folder `packages/stories/stories-assistant/src/stories/Subagents.stories.tsx:23`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.80. The likeliest place is lines 23-33 (`const meta: Meta<typeof ModuleContainer> = {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-41 inline-obj-parent `packages/stories/stories-assistant/src/testing/decorators.tsx:411`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.87. The likeliest place is lines 411-422 (`Obj.setParent(agent, project);`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-42 reactive-state-via-atom-bridge `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.tsx:124`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.81. The likeliest place is lines 124-135 (`);`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-43 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:126`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 126-137 (`export const PromptToolbar = memo(({ classNames, message }: MessageToolbarPro...`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-44 no-try-catch-in-effect-code `packages/ui/react-ui-assistant/src/widgets/LaneWidget.tsx:18`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.89. The likeliest place is lines 18-29 (`const parse = (text: string | null | undefined): LaneCardData | undefined => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-45 structural-regions-use-design-system-components `packages/ui/react-ui-assistant/src/widgets/LaneWidget.tsx:58`

System One judges this a likely violation of `structural-regions-use-design-system-components` (Dialog and card headers come from design-system parts, never ad hoc divs), p=0.81. The likeliest place is lines 58-69 (`return (`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN f1a71b199-46 story-for-new-ui-component `packages/ui/react-ui-assistant/src/widgets/LaneWidget.tsx:103`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.92. The likeliest place is lines 103-114 (`export const LaneCardWidget = ({ view, children }: WidgetProps) => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f1a71b199-47 no-casts `packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:860`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 860-883 (`}`, location confidence 0.16). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `5e9c5abd072364fc8e57985f5ded33a7dbb16beb`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 47 violations written to fragments, 452 uncertain, 1708 clean, 0 unanswered
- left for an agentic reviewer: 107 batch(es)

```text
requests: 966 (262 verdicts re-asked with context the model requested)
estimated input tokens: 10332484
billed input tokens: 9784136 (cost $0.4109)
measured chars per token: 3.17
```

---
branch: dm/friendly-maxwell-ln3vr9
commit: 2673c92c4829683227fe6a3eac66156d21b5bc29
base: 5e9c5abd072364fc8e57985f5ded33a7dbb16beb
mode: fast
createdAt: 2026-10-25T14:32:52.268Z
isFinalized: true
groups: 336
rules: [business-logic-out-of-ui, declare-optional-services-with-noop-layers, design-tokens-not-raw-spacing-sizing, dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, errors-extend-base-error, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, inline-obj-parent, named-durations-and-budgets, no-casts, no-mixed-promise-effect-lifecycle, no-module-level-object-caches, no-sleep-in-test, no-styling-wrapper-divs, no-try-catch-in-effect-code, one-test-suite-per-module, per-test-mutable-fixtures, reactive-state-via-atom-bridge, story-for-new-ui-component, structured-logging-not-console, test-real-scenario-not-narrower-proxy]
reviewId: 2673c92c4
---

_4 error(s), 48 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 2673c92c4-1 - ignored - test-real-scenario-not-narrower-proxy - packages/core/compute/agent-code-mode/src/producer.test.ts:65
- 2673c92c4-2 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/agent-code-mode/src/producer.ts:106
- 2673c92c4-3 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/producer.ts:295
- 2673c92c4-4 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-runtime/src/agent-service/agent-process.ts:173
- 2673c92c4-5 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-runtime/src/agent-service/agent-process.ts:348
- 2673c92c4-6 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/agent-runtime/src/agent-service/index.ts:1
- 2673c92c4-7 - ignored - dont-leak-internal-api-through-public-surface - packages/core/compute/agent-runtime/src/agent-service/index.ts:13
- 2673c92c4-8 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-runtime/src/agent-service/light-threads.e2e.test.ts:25
- 2673c92c4-9 - ignored - flat-layer-composition - packages/core/compute/agent-runtime/src/agent-service/light-threads.e2e.test.ts:73
- 2673c92c4-10 - ignored - named-durations-and-budgets - packages/core/compute/agent-runtime/src/agent-service/light-threads.e2e.test.ts:207
- 2673c92c4-11 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-runtime/src/agent-service/light-threads.test.ts:87
- 2673c92c4-12 - ignored - test-real-scenario-not-narrower-proxy - packages/core/compute/agent-runtime/src/agent-service/light-threads.test.ts:122
- 2673c92c4-13 - ignored - no-sleep-in-test - packages/core/compute/agent-runtime/src/agent-service/light-threads.test.ts:297
- 2673c92c4-14 - ignored - test-real-scenario-not-narrower-proxy - packages/core/compute/agent-runtime/src/agent-service/mcp-servers.test.ts:24
- 2673c92c4-15 - ignored - flat-layer-composition - packages/core/compute/agent-runtime/src/agent-service/mcp-servers.test.ts:67
- 2673c92c4-16 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-runtime/src/agent-service/thread-scheduler.ts:122
- 2673c92c4-17 - ignored - flat-layer-composition - packages/core/compute/assistant-toolkit/src/operations/run-instructions.ts:217
- 2673c92c4-18 - ignored - errors-extend-base-error - packages/core/compute/assistant/src/session/AiSession.ts:45
- 2673c92c4-19 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/assistant/src/session/AiSession.ts:153
- 2673c92c4-20 - ignored - flat-layer-composition - packages/core/compute/assistant/src/session/AiSession.ts:417
- 2673c92c4-21 - ignored - no-module-level-object-caches - packages/core/compute/assistant/src/session/TrajectoryStore.ts:306
- 2673c92c4-22 - ignored - flat-layer-composition - packages/core/compute/assistant/src/session/TrajectoryStore.unindexed.test.ts:80
- 2673c92c4-23 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant/src/types/Agent.ts:86
- 2673c92c4-24 - ignored - no-try-catch-in-effect-code - packages/core/compute/compute-runtime/src/process-trace.ts:84
- 2673c92c4-25 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:208
- 2673c92c4-26 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:268
- 2673c92c4-27 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:289
- 2673c92c4-28 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/Trace.ts:53
- 2673c92c4-29 - ignored - structured-logging-not-console - packages/core/compute/compute/src/Trace.ts:438
- 2673c92c4-30 - ignored - no-sleep-in-test - packages/core/echo/echo-client-e2e/src/feed-options.test.ts:207
- 2673c92c4-31 - ignored - flat-layer-composition - packages/devtools/cli/src/commands/chat/processor.ts:73
- 2673c92c4-32 - ignored - no-mixed-promise-effect-lifecycle - packages/devtools/cli/src/commands/chat/processor.ts:121
- 2673c92c4-33 - ignored - one-test-suite-per-module - packages/plugins/plugin-agent/src/operations/ensure-channel-chat.test.ts:176
- 2673c92c4-34 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-assistant/src/chat-model/chat-model.lanes.scripted.node.test.ts:103
- 2673c92c4-35 - ignored - flat-layer-composition - packages/plugins/plugin-assistant/src/chat-model/chat-model.lanes.scripted.node.test.ts:121
- 2673c92c4-36 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:132
- 2673c92c4-37 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:459
- 2673c92c4-38 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-assistant/src/chat-model/lanes.test.ts:1
- 2673c92c4-39 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-assistant/src/chat-model/thread.test.ts:377
- 2673c92c4-40 - ignored - no-module-level-object-caches - packages/plugins/plugin-assistant/src/chat-model/thread.ts:222
- 2673c92c4-41 - ignored - business-logic-out-of-ui - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:302
- 2673c92c4-42 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:456
- 2673c92c4-43 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:807
- 2673c92c4-44 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:831
- 2673c92c4-45 - ignored - business-logic-out-of-ui - packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:95
- 2673c92c4-46 - ignored - inline-obj-parent - packages/stories/stories-assistant/src/testing/decorators.tsx:411
- 2673c92c4-47 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.tsx:124
- 2673c92c4-48 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:126
- 2673c92c4-49 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:397
- 2673c92c4-50 - ignored - no-try-catch-in-effect-code - packages/ui/react-ui-assistant/src/widgets/LaneWidget.tsx:18
- 2673c92c4-51 - ignored - story-for-new-ui-component - packages/ui/react-ui-assistant/src/widgets/LaneWidget.tsx:103
- 2673c92c4-52 - ignored - no-casts - packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:860

## Issues

# WARN 2673c92c4-1 test-real-scenario-not-narrower-proxy `packages/core/compute/agent-code-mode/src/producer.test.ts:65`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.82. The likeliest place is lines 65-76 (`AssistantTestLayer({`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-2 declare-optional-services-with-noop-layers `packages/core/compute/agent-code-mode/src/producer.ts:106`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.82. The likeliest place is lines 106-117 (`options.sandbox ?? Option.getOrElse(yield* Effect.serviceOption(Sandbox.Servi...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-3 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/producer.ts:295`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.92. The likeliest place is lines 295-304 (`const tryParseJson = (text: string): unknown => {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-4 no-try-catch-in-effect-code `packages/core/compute/agent-runtime/src/agent-service/agent-process.ts:173`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 173-185 (`const resultPreview = (value: unknown): string | undefined => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-5 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-runtime/src/agent-service/agent-process.ts:348`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 348-359 (`const runEndRequestHooks = Effect.gen(function* () {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-6 import-as-namespace-is-all-or-nothing `packages/core/compute/agent-runtime/src/agent-service/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-12 (`export * as AgentService from './AgentService.ts';`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-7 dont-leak-internal-api-through-public-surface `packages/core/compute/agent-runtime/src/agent-service/index.ts:13`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.85. The likeliest place is lines 13-21 (`type AgentProcessOptions,`, location confidence 0.74). Judged with added `importers, imports, public-api` context after a first pass of 0.73. This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-8 per-test-mutable-fixtures `packages/core/compute/agent-runtime/src/agent-service/light-threads.e2e.test.ts:25`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.85. The likeliest place is lines 25-42 (`import { type ContentBlock, Message } from '@dxos/types';`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-9 flat-layer-composition `packages/core/compute/agent-runtime/src/agent-service/light-threads.e2e.test.ts:73`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.86. The likeliest place is lines 73-89 (`const layer = () =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-10 named-durations-and-budgets `packages/core/compute/agent-runtime/src/agent-service/light-threads.e2e.test.ts:207`

System One judges this a likely violation of `named-durations-and-budgets` (Write durations as unit arithmetic and time budgets as shared named strategies), p=0.88. The likeliest place is lines 207-214 (`const answerOf = (view: Reducer.ThreadView, lane: Reducer.Lane) =>`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-11 per-test-mutable-fixtures `packages/core/compute/agent-runtime/src/agent-service/light-threads.test.ts:87`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.88. The likeliest place is lines 87-92 (`const delegationRequests: ScriptedLanguageModel.ScriptedRequest[] = [];`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-12 test-real-scenario-not-narrower-proxy `packages/core/compute/agent-runtime/src/agent-service/light-threads.test.ts:122`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.81. The likeliest place is lines 122-130 (`const layer = () =>`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-13 no-sleep-in-test `packages/core/compute/agent-runtime/src/agent-service/light-threads.test.ts:297`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 297-308 (`events.filter((event) => event.payload._tag === 'message' && event.sender.rol...`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-14 test-real-scenario-not-narrower-proxy `packages/core/compute/agent-runtime/src/agent-service/mcp-servers.test.ts:24`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.85. The likeliest place is lines 24-27 (`const { text, toolCall, scriptedAiService } = ScriptedLanguageModel;`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-15 flat-layer-composition `packages/core/compute/agent-runtime/src/agent-service/mcp-servers.test.ts:67`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 67-78 (`}),`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-16 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-runtime/src/agent-service/thread-scheduler.ts:122`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 122-133 (`Effect.gen(function* () {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-17 flat-layer-composition `packages/core/compute/assistant-toolkit/src/operations/run-instructions.ts:217`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 217-228 (`const ToolExecutionService = ({ feed }: ToolExecutionServiceOptions) =>`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 2673c92c4-18 errors-extend-base-error `packages/core/compute/assistant/src/session/AiSession.ts:45`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.92. The likeliest place is lines 45-49 (`export class McpServersUnavailable extends Schema.TaggedError<McpServersUnava...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-19 no-mixed-promise-effect-lifecycle `packages/core/compute/assistant/src/session/AiSession.ts:153`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.90. The likeliest place is lines 153-164 (`public async getHistory(): Promise<Message.Message[]> {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-20 flat-layer-composition `packages/core/compute/assistant/src/session/AiSession.ts:417`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 417-428 (`Layer.succeed(`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-21 no-module-level-object-caches `packages/core/compute/assistant/src/session/TrajectoryStore.ts:306`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.93. The likeliest place is lines 306-323 (`const entryMessages = new WeakMap<Reducer.PromptEntry, Message.Message>();`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-22 flat-layer-composition `packages/core/compute/assistant/src/session/TrajectoryStore.unindexed.test.ts:80`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 80-91 (`const withSql = <A>(effect: Effect.Effect<A, never, Database.Service>) =>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-23 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant/src/types/Agent.ts:86`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 86-97 (`export const loadInstructions = (`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-24 no-try-catch-in-effect-code `packages/core/compute/compute-runtime/src/process-trace.ts:84`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.82. The likeliest place is lines 84-90 (`opts.sink.write(message);`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 2673c92c4-25 no-casts `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:208`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 208-219 (`op: Operation.Definition<I, O>,`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-26 no-mixed-promise-effect-lifecycle `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:268`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.87. The likeliest place is lines 268-279 (`} catch (error) {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-27 declare-optional-services-with-noop-layers `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:289`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.90. The likeliest place is lines 289-300 (`export const layer: Layer.Layer<Operation.Service | Service, never, Process.M...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-28 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/Trace.ts:53`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 53-70 (`export function write<T>(eventType: EventType<T>, payload: NoInfer<T>): Effec...`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-29 structured-logging-not-console `packages/core/compute/compute/src/Trace.ts:438`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.91. The likeliest place is lines 438-461 (`export const mergeSinks = (sinks: readonly Sink[]): Sink => {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-30 no-sleep-in-test `packages/core/echo/echo-client-e2e/src/feed-options.test.ts:207`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.97. The likeliest place is lines 207-218 (`const storedBlocks = async () => (await db.getFeedSyncState(feed)).totalBlocks;`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-31 flat-layer-composition `packages/devtools/cli/src/commands/chat/processor.ts:73`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 73-84 (`),`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-32 no-mixed-promise-effect-lifecycle `packages/devtools/cli/src/commands/chat/processor.ts:121`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.86. The likeliest place is lines 121-131 (`await session.open();`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-33 one-test-suite-per-module `packages/plugins/plugin-agent/src/operations/ensure-channel-chat.test.ts:176`

System One judges this a likely violation of `one-test-suite-per-module` (A module's tests live in its one test file; an operation's tests in a suite named after it), p=0.82. The likeliest place is lines 176-187 (`describe('AgentChannels', () => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-34 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-assistant/src/chat-model/chat-model.lanes.scripted.node.test.ts:103`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.84. The likeliest place is lines 103-114 (`const script: ScriptedLanguageModel.ScriptedTurnGenerator = (request) => {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-35 flat-layer-composition `packages/plugins/plugin-assistant/src/chat-model/chat-model.lanes.scripted.node.test.ts:121`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 121-130 (`const testLayer = () =>`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 2673c92c4-36 errors-extend-base-error `packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:132`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 132-158 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-37 no-try-catch-in-effect-code `packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:459`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 459-482 (`const known = new Set(this.#registry.get(this.#feedMessages).map(({ id }) => ...`, location confidence 0.18). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-38 per-test-mutable-fixtures `packages/plugins/plugin-assistant/src/chat-model/lanes.test.ts:1`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.86. The likeliest place is lines 1-19 (`import { describe, test } from 'vitest';`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-39 per-test-mutable-fixtures `packages/plugins/plugin-assistant/src/chat-model/thread.test.ts:377`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.82. The likeliest place is lines 377-393 (`describe('resolveRewind', () => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-40 no-module-level-object-caches `packages/plugins/plugin-assistant/src/chat-model/thread.ts:222`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.95. The likeliest place is lines 222-230 (`const deliveryRows = new WeakMap<`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-41 business-logic-out-of-ui `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:302`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.82. The likeliest place is lines 302-325 (`await EffectEx.runPromise(`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-42 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:456`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 456-477 (`const ChatContent = Util.composable<HTMLDivElement, ChatContentProps>(({ chil...`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-43 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:807`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 807-830 (`const drawerRef = useRef<HTMLDivElement>(null);`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-44 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:831`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 831-854 (`lazyMount={false}`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-45 business-logic-out-of-ui `packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:95`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.83. The likeliest place is lines 95-106 (`const useDraftSend = ({ space, draft, context, slashCommands, onSent }: UseDr...`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-46 inline-obj-parent `packages/stories/stories-assistant/src/testing/decorators.tsx:411`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.86. The likeliest place is lines 411-422 (`Obj.setParent(agent, project);`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-47 reactive-state-via-atom-bridge `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.tsx:124`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.83. The likeliest place is lines 124-135 (`);`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-48 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:126`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 126-137 (`export const PromptToolbar = memo(({ classNames, message }: MessageToolbarPro...`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-49 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:397`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 397-408 (`classNames={mx(`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-50 no-try-catch-in-effect-code `packages/ui/react-ui-assistant/src/widgets/LaneWidget.tsx:18`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 18-29 (`const parse = (text: string | null | undefined): LaneCardData | undefined => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2673c92c4-51 story-for-new-ui-component `packages/ui/react-ui-assistant/src/widgets/LaneWidget.tsx:103`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.91. The likeliest place is lines 103-114 (`export const LaneCardWidget = ({ view, children }: WidgetProps) => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 2673c92c4-52 no-casts `packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:860`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 860-883 (`}`, location confidence 0.17). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `5e9c5abd072364fc8e57985f5ded33a7dbb16beb`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 52 violations written to fragments, 543 uncertain, 2320 clean, 0 unanswered
- left for an agentic reviewer: 109 batch(es)

```text
requests: 1242 (321 verdicts re-asked with context the model requested)
estimated input tokens: 12376785
billed input tokens: 11605764 (cost $0.4874)
measured chars per token: 3.20
```

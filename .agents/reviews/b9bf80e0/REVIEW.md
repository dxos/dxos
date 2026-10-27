---
branch: dm/quirky-carson-ougdwa
commit: b9bf80e0db59a2738498b62e421ba97ab64333e0
base: 04d5fb15a8b5e81ebbabcfc78abdadb969765750
mode: fast
createdAt: 2026-10-27T10:17:43.495Z
isFinalized: true
groups: 402
rules: [atom-lifetime-bound-to-owner, bounded-live-state, code-not-in-strings, containers-share-core-hooks, declare-optional-services-with-noop-layers, effect-fn-not-hand-wrapped-gen, errors-extend-base-error, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, jsdoc-non-obvious-identifiers, leaf-objects-render-as-cards, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, no-casts, no-lint-suppression-to-pass, no-mixed-promise-effect-lifecycle, no-module-level-object-caches, no-sleep-in-test, no-styling-wrapper-divs, no-trivial-wrappers-over-official-apis, no-try-catch-in-effect-code, operations-resolve-database-from-service, options-object-with-defaults, per-test-mutable-fixtures, setter-must-not-own-transaction, state-owned-once, story-for-new-ui-component]
reviewId: b9bf80e0
---

_10 error(s), 50 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- b9bf80e0-1 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-code-mode/src/code-mode.test.ts:37
- b9bf80e0-2 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/code-mode.test.ts:181
- b9bf80e0-3 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/eval-tool.ts:177
- b9bf80e0-4 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/Wire.ts:13
- b9bf80e0-5 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:88
- b9bf80e0-6 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:161
- b9bf80e0-7 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:180
- b9bf80e0-8 - ignored - no-casts - packages/core/compute/agent-code-mode/src/WorkerSandbox.ts:333
- b9bf80e0-9 - ignored - flat-layer-composition - packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:169
- b9bf80e0-10 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:202
- b9bf80e0-11 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/ai/src/ExtractionModel.ts:146
- b9bf80e0-12 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/ai/src/index.ts:1
- b9bf80e0-13 - ignored - namespace-export-with-internal-hiding - packages/core/compute/ai/src/index.ts:13
- b9bf80e0-14 - ignored - flat-layer-composition - packages/core/compute/ai/src/resolvers/clairic/ClairicResolver.test.ts:63
- b9bf80e0-15 - ignored - flat-layer-composition - packages/core/compute/ai/src/resolvers/clairic/ClairicResolver.ts:103
- b9bf80e0-16 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/ai/src/resolvers/clairic/index.ts:1
- b9bf80e0-17 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/ai/src/resolvers/index.ts:1
- b9bf80e0-18 - ignored - no-casts - packages/core/compute/compute/src/Operation.test.ts:56
- b9bf80e0-19 - ignored - no-casts - packages/core/compute/compute/src/Operation.ts:178
- b9bf80e0-20 - ignored - no-try-catch-in-effect-code - packages/core/compute/compute/src/Operation.ts:851
- b9bf80e0-21 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/Operation.ts:1164
- b9bf80e0-22 - ignored - no-casts - packages/core/mesh/edge-client/src/edge-http-client.ts:570
- b9bf80e0-23 - ignored - flat-layer-composition - packages/core/mesh/edge-client/src/edge-http-client.ts:1098
- b9bf80e0-24 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-assistant/src/chat-model/chat-model.scripted.node.test.ts:56
- b9bf80e0-25 - ignored - no-trivial-wrappers-over-official-apis - packages/plugins/plugin-assistant/src/chat-model/chat-model.scripted.node.test.ts:95
- b9bf80e0-26 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:130
- b9bf80e0-27 - ignored - flat-layer-composition - packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:385
- b9bf80e0-28 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:553
- b9bf80e0-29 - ignored - declare-optional-services-with-noop-layers - packages/plugins/plugin-assistant/src/operations/run-prompt-in-chat.ts:25
- b9bf80e0-30 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-assistant/src/types/Assistant.ts:1
- b9bf80e0-31 - ignored - no-module-level-object-caches - packages/plugins/plugin-assistant/src/util/consent-guard.ts:42
- b9bf80e0-32 - ignored - state-owned-once - packages/plugins/plugin-assistant/src/util/consent-guard.ts:42
- b9bf80e0-33 - ignored - inject-dependencies-via-constructor - packages/plugins/plugin-assistant/src/util/consent-guard.ts:42
- b9bf80e0-34 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/util/consent-guard.ts:114
- b9bf80e0-35 - ignored - no-lint-suppression-to-pass - packages/plugins/plugin-debug/src/types/DebugOperation.ts:13
- b9bf80e0-36 - ignored - options-object-with-defaults - packages/plugins/plugin-debug/src/types/DebugOperation.ts:187
- b9bf80e0-37 - ignored - containers-share-core-hooks - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:301
- b9bf80e0-38 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:301
- b9bf80e0-39 - ignored - leaf-objects-render-as-cards - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:429
- b9bf80e0-40 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:693
- b9bf80e0-41 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/containers/MessageArticle/MessageArticle.tsx:72
- b9bf80e0-42 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-inbox/src/containers/MessageArticle/MessageArticle.tsx:276
- b9bf80e0-43 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-inbox/src/errors.ts:8
- b9bf80e0-44 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-inbox/src/types/InboxOperation.ts:241
- b9bf80e0-45 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-inbox/src/types/InboxPermission.ts:1
- b9bf80e0-46 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-inbox/src/types/SystemTags.ts:33
- b9bf80e0-47 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-labeler/src/constants.ts:9
- b9bf80e0-48 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-labeler/src/operations/label-mailbox.test.ts:25
- b9bf80e0-49 - ignored - bounded-live-state - packages/plugins/plugin-labeler/src/operations/label-mailbox.ts:198
- b9bf80e0-50 - resolved - no-casts - packages/plugins/plugin-tasks/src/containers/index.ts:1
- b9bf80e0-51 - ignored - story-for-new-ui-component - packages/plugins/plugin-tasks/src/containers/TaskRow/TaskRow.tsx:24
- b9bf80e0-52 - ignored - flat-layer-composition - packages/plugins/plugin-typesafe/src/capabilities/model-resolver.ts:139
- b9bf80e0-53 - ignored - atom-lifetime-bound-to-owner - packages/sdk/schema/src/TagIndex.test.ts:105
- b9bf80e0-54 - resolved - no-sleep-in-test - packages/sdk/schema/src/TagIndex.test.ts:159
- b9bf80e0-55 - ignored - atom-lifetime-bound-to-owner - packages/sdk/schema/src/TagIndex.ts:66
- b9bf80e0-56 - ignored - setter-must-not-own-transaction - packages/sdk/schema/src/TagIndex.ts:164
- b9bf80e0-57 - ignored - bounded-live-state - packages/sdk/schema/src/TagIndex.ts:212
- b9bf80e0-58 - ignored - jsdoc-non-obvious-identifiers - packages/sdk/types/src/types/ContentBlock.ts:442
- b9bf80e0-59 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.tsx:290
- b9bf80e0-60 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/util/Util.ts:7

## Issues

# WARN b9bf80e0-1 per-test-mutable-fixtures `packages/core/compute/agent-code-mode/src/code-mode.test.ts:37`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.87. The likeliest place is lines 37-47 (`class Task extends Type.makeObject<Task>(DXN.make(TASK_TYPENAME, '0.1.0'))(`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-2 code-not-in-strings `packages/core/compute/agent-code-mode/src/code-mode.test.ts:181`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.87. The likeliest place is lines 181-192 (`const tasks = await query('${TASK_TYPENAME}', { status: 'open' });`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-3 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/eval-tool.ts:177`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.90. The likeliest place is lines 177-187 (`const evalCode = (input: string): string => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b9bf80e0-4 errors-extend-base-error `packages/core/compute/agent-code-mode/src/Wire.ts:13`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 13-37 (`import { type Database, Filter, Obj, Ref, Type } from '@dxos/echo';`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-5 per-test-mutable-fixtures `packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:88`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.85. The likeliest place is lines 88-101 (`const ScoreOperation: SandboxOperation = {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-6 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:161`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 161-167 (`),`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-7 code-not-in-strings `packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:180`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.92. The likeliest place is lines 180-191 (`update(task, (task) => { task.priority = task.title.length; });`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b9bf80e0-8 no-casts `packages/core/compute/agent-code-mode/src/WorkerSandbox.ts:333`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 333-342 (`const toMessagePort = (port: WorkerThreads.MessagePort): MessagePort => port ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-9 flat-layer-composition `packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:169`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 169-185 (`const assistantTestLayerOptions = {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-10 per-test-mutable-fixtures `packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:202`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.92. The likeliest place is lines 202-220 (`const delegationHarness: DelegationHarness = { pending: [], completed: [] };`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-11 effect-fn-not-hand-wrapped-gen `packages/core/compute/ai/src/ExtractionModel.ts:146`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 146-158 (`export const extract = <const Fs extends Fields>(`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-12 import-as-namespace-is-all-or-nothing `packages/core/compute/ai/src/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.87. The likeliest place is lines 1-12 (`export * as AiModelResolver from './AiModelResolver.ts';`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-13 namespace-export-with-internal-hiding `packages/core/compute/ai/src/index.ts:13`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.89. The likeliest place is lines 13-22 (`export * as Provider from './Provider.ts';`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-14 flat-layer-composition `packages/core/compute/ai/src/resolvers/clairic/ClairicResolver.test.ts:63`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 63-74 (`const extract = (body: unknown) => {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-15 flat-layer-composition `packages/core/compute/ai/src/resolvers/clairic/ClairicResolver.ts:103`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 103-114 (`export const makeExtractionModel = <R = never>(`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-16 import-as-namespace-is-all-or-nothing `packages/core/compute/ai/src/resolvers/clairic/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.89. The likeliest place is lines 1-6 (`export * as ClairicResolver from './ClairicResolver.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-17 import-as-namespace-is-all-or-nothing `packages/core/compute/ai/src/resolvers/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.85. The likeliest place is lines 1-13 (`export * as ChatCompletionsAdapter from './ChatCompletionsAdapter.ts';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.72. This is a single-shot classifier: confirm against the rule before acting.

# ERROR b9bf80e0-18 no-casts `packages/core/compute/compute/src/Operation.test.ts:56`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 56-67 (`describe('toolName', () => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b9bf80e0-19 no-casts `packages/core/compute/compute/src/Operation.ts:178`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 178-212 (`export const lazyHandler: {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-20 no-try-catch-in-effect-code `packages/core/compute/compute/src/Operation.ts:851`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.91. The likeliest place is lines 851-882 (`icon: operation.meta.icon,`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-21 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/Operation.ts:1164`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.91. The likeliest place is lines 1164-1187 (`export interface OperationService {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b9bf80e0-22 no-casts `packages/core/mesh/edge-client/src/edge-http-client.ts:570`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 570-593 (`public async putBlob(`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-23 flat-layer-composition `packages/core/mesh/edge-client/src/edge-http-client.ts:1098`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.86. The likeliest place is lines 1098-1121 (`Effect.withSpan('EdgeHttpClient'),`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-24 per-test-mutable-fixtures `packages/plugins/plugin-assistant/src/chat-model/chat-model.scripted.node.test.ts:56`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.84. The likeliest place is lines 56-61 (`const makeGate = Effect.gen(function* () {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-25 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-assistant/src/chat-model/chat-model.scripted.node.test.ts:95`

System One judges this a likely violation of `no-trivial-wrappers-over-official-apis` (Do not extract a helper that only forwards to an official API), p=0.82. The likeliest place is lines 95-106 (`const providerFailure = (description: string) => ({`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b9bf80e0-26 errors-extend-base-error `packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:130`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 130-156 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-27 flat-layer-composition `packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:385`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 385-408 (`Effect.gen({ self: this }, function* () {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-28 no-try-catch-in-effect-code `packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:553`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 553-576 (`try {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-29 declare-optional-services-with-noop-layers `packages/plugins/plugin-assistant/src/operations/run-prompt-in-chat.ts:25`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.80. The likeliest place is lines 25-36 (`const handler: Operation.WithHandler<typeof AssistantOperation.RunPromptInCha...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-30 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-assistant/src/types/Assistant.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-20 (`import { type DXN } from '@dxos/keys';`, location confidence 0.02). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-31 no-module-level-object-caches `packages/plugins/plugin-assistant/src/util/consent-guard.ts:42`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.86. The likeliest place is lines 42-55 (`const allowed = new Map<string, Set<string>>();`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-32 state-owned-once `packages/plugins/plugin-assistant/src/util/consent-guard.ts:42`

System One judges this a likely violation of `state-owned-once` (Track state on the record that owns it, not in a side-table), p=0.82. The likeliest place is lines 42-55 (`const allowed = new Map<string, Set<string>>();`, location confidence 0.88). Judged with added `diff, importers, siblings` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-33 inject-dependencies-via-constructor `packages/plugins/plugin-assistant/src/util/consent-guard.ts:42`

System One judges this a likely violation of `inject-dependencies-via-constructor` (Take shared collaborators once, not per-method), p=0.90. The likeliest place is lines 42-55 (`const allowed = new Map<string, Set<string>>();`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-34 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/util/consent-guard.ts:114`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 114-125 (`const ask = (chat: Chat.Chat, title: string, preview: ContentBlock.Request['p...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-35 no-lint-suppression-to-pass `packages/plugins/plugin-debug/src/types/DebugOperation.ts:13`

System One judges this a likely violation of `no-lint-suppression-to-pass` (Don't add a lint-disable comment to get past a rule; fix what it points at), p=0.86. The likeliest place is lines 13-25 (`import { type Connection } from '@dxos/link';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-36 options-object-with-defaults `packages/plugins/plugin-debug/src/types/DebugOperation.ts:187`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.88. The likeliest place is lines 187-200 (`export const Undo = Operation.make({`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-37 containers-share-core-hooks `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:301`

System One judges this a likely violation of `containers-share-core-hooks` (A container builds on the shared container hooks, never its own navigation, selection or focus), p=0.87. The likeliest place is lines 301-324 (`const tile = newDraft && viewportRef.current?.querySelector(`[data-object-id=...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-38 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:301`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 301-324 (`const tile = newDraft && viewportRef.current?.querySelector(`[data-object-id=...`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-39 leaf-objects-render-as-cards `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:429`

System One judges this a likely violation of `leaf-objects-render-as-cards` (Every object inside a container is a card with the standard header), p=0.88. The likeliest place is lines 429-452 (`classNames='dx-document dx-attention-surface overflow-hidden rounded-md mt-2'`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-40 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:693`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 693-717 (`return (`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-41 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/containers/MessageArticle/MessageArticle.tsx:72`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 72-83 (`const feed = useResolveRef(mailbox?.feed);`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-42 no-try-catch-in-effect-code `packages/plugins/plugin-inbox/src/containers/MessageArticle/MessageArticle.tsx:276`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 276-287 (`);`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-43 namespace-brand-key-prefixing `packages/plugins/plugin-inbox/src/errors.ts:8`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.83. The likeliest place is lines 8-13 (`export class AccessTokenNotPopulatedError extends BaseError.extend(`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-44 operations-resolve-database-from-service `packages/plugins/plugin-inbox/src/types/InboxOperation.ts:241`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.97. The likeliest place is lines 241-254 (`export const ExtractInputSchema = Schema.Struct({`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-45 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-inbox/src/types/InboxPermission.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-12 (`//`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-46 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-inbox/src/types/SystemTags.ts:33`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.89. The likeliest place is lines 33-44 (`export const SystemTag = {`, location confidence 0.27). Judged with added `importers` context after a first pass of 0.72. This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-47 namespace-brand-key-prefixing `packages/plugins/plugin-labeler/src/constants.ts:9`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.83. The likeliest place is lines 9-14 (`export const LabelerTag = {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-48 per-test-mutable-fixtures `packages/plugins/plugin-labeler/src/operations/label-mailbox.test.ts:25`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.81. The likeliest place is lines 25-37 (`import { LabelerOperation } from '#types';`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b9bf80e0-49 bounded-live-state `packages/plugins/plugin-labeler/src/operations/label-mailbox.ts:198`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.84. The likeliest place is lines 198-209 (`status: 'todo',`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b9bf80e0-50 no-casts `packages/plugins/plugin-tasks/src/containers/index.ts:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 1-15 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-51 story-for-new-ui-component `packages/plugins/plugin-tasks/src/containers/TaskRow/TaskRow.tsx:24`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.94. The likeliest place is lines 24-35 (`export const TaskRow = ({ subject: task }: TaskRowProps) => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-52 flat-layer-composition `packages/plugins/plugin-typesafe/src/capabilities/model-resolver.ts:139`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 139-150 (`).pipe(Layer.provide(FetchHttpClient.layer));`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-53 atom-lifetime-bound-to-owner `packages/sdk/schema/src/TagIndex.test.ts:105`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.80. The likeliest place is lines 105-116 (`expect(registry.get(tagsForObject(first)).sort()).toEqual([later, urgent]);`, location confidence 0.74). Judged with added `test` context after a first pass of 0.31. This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-54 no-sleep-in-test `packages/sdk/schema/src/TagIndex.test.ts:159`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 159-170 (`const writes = [...ids.map((id) => () => tags.setTag(urgent, id)), () => tags...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-55 atom-lifetime-bound-to-owner `packages/sdk/schema/src/TagIndex.ts:66`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.89. The likeliest place is lines 66-77 (`const tagFamily = Atom.family((key: TagKey) =>`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-56 setter-must-not-own-transaction `packages/sdk/schema/src/TagIndex.ts:164`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.81. The likeliest place is lines 164-175 (`export const bind = (tagIndex: TagIndex): Accessor => {`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b9bf80e0-57 bounded-live-state `packages/sdk/schema/src/TagIndex.ts:212`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.82. The likeliest place is lines 212-223 (`index[tagId] = [objectId];`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-58 jsdoc-non-obvious-identifiers `packages/sdk/types/src/types/ContentBlock.ts:442`

System One judges this a likely violation of `jsdoc-non-obvious-identifiers` (Document a parameter, field, or handle whose meaning isn't obvious from its name), p=0.81. The likeliest place is lines 442-457 (`const Anchor = Schema.TaggedStruct('anchor', {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b9bf80e0-59 no-casts `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.tsx:290`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 290-301 (`: (index) => getId(visibleItems![index]),`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9bf80e0-60 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/util/Util.ts:7`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.87. The likeliest place is lines 7-14 (`export type { ThemedClassName } from '@dxos/ui-types';`, location confidence 0.08). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `04d5fb15a8b5e81ebbabcfc78abdadb969765750`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 60 violations written to fragments, 690 uncertain, 3085 clean, 0 unanswered
- left for an agentic reviewer: 139 batch(es)

```text
requests: 1573 (405 verdicts re-asked with context the model requested)
estimated input tokens: 13228233
billed input tokens: 12459876 (cost $0.5233)
measured chars per token: 3.18
```

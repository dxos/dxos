---
branch: dm/delegation-stories
commit: bf27320054229feb9cc8fefb3c577a39839b272c
base: ab300771b26a09774b283e6e70f038d9d8ff5bd9
mode: fast
createdAt: 2026-11-25T14:19:49.958Z
isFinalized: true
groups: 274
rules: [atom-lifetime-bound-to-owner, bounded-live-state, design-tokens-not-raw-spacing-sizing, dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, errors-extend-base-error, event-handler-naming-convention, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, inline-obj-parent, minimal-precise-tests, named-durations-and-budgets, no-casts, no-module-level-object-caches, no-sleep-in-test, no-styling-wrapper-divs, no-trivial-wrappers-over-official-apis, no-try-catch-in-effect-code, operations-resolve-database-from-service, per-test-mutable-fixtures, ref-collections-via-query, structured-logging-not-console, test-real-scenario-not-narrower-proxy, use-context-scoped-cancellation]
reviewId: bf273200542
---

_3 error(s), 39 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- bf273200542-1 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:205
- bf273200542-2 - ignored - flat-layer-composition - packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:325
- bf273200542-3 - ignored - test-real-scenario-not-narrower-proxy - packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:325
- bf273200542-4 - ignored - minimal-precise-tests - packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:981
- bf273200542-5 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-runtime/src/agent-service/AgentService.ts:64
- bf273200542-6 - ignored - flat-layer-composition - packages/core/compute/agent-runtime/src/agent-service/AgentService.ts:463
- bf273200542-7 - ignored - no-try-catch-in-effect-code - packages/core/compute/ai/src/testing/ScriptedScene.ts:435
- bf273200542-8 - ignored - structured-logging-not-console - packages/plugins/plugin-assistant/src/chat-model/chat-model.edge.test.ts:153
- bf273200542-9 - ignored - named-durations-and-budgets - packages/plugins/plugin-assistant/src/chat-model/chat-model.edge.test.ts:198
- bf273200542-10 - ignored - flat-layer-composition - packages/plugins/plugin-assistant/src/chat-model/chat-model.edge.test.ts:247
- bf273200542-11 - ignored - flat-layer-composition - packages/plugins/plugin-assistant/src/chat-model/chat-model.lanes.scripted.node.test.ts:121
- bf273200542-12 - ignored - no-casts - packages/plugins/plugin-assistant/src/chat-model/chat-model.node.test.ts:30
- bf273200542-13 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-assistant/src/chat-model/chat-model.scripted.node.test.ts:43
- bf273200542-14 - ignored - no-trivial-wrappers-over-official-apis - packages/plugins/plugin-assistant/src/chat-model/chat-model.scripted.node.test.ts:95
- bf273200542-15 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:148
- bf273200542-16 - ignored - flat-layer-composition - packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:478
- bf273200542-17 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:574
- bf273200542-18 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/chat-model/chat-name.node.test.ts:27
- bf273200542-19 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-assistant/src/chat-model/chat-name.node.test.ts:27
- bf273200542-20 - ignored - no-sleep-in-test - packages/plugins/plugin-assistant/src/chat-model/chat-name.node.test.ts:59
- bf273200542-21 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-assistant/src/chat-model/lanes.test.ts:1
- bf273200542-22 - ignored - no-sleep-in-test - packages/plugins/plugin-assistant/src/chat-model/streaming.node.test.ts:404
- bf273200542-23 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/chat-model/streaming.node.test.ts:416
- bf273200542-24 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-assistant/src/Chat.ts:1
- bf273200542-25 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:488
- bf273200542-26 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:884
- bf273200542-27 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:908
- bf273200542-28 - ignored - event-handler-naming-convention - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:1174
- bf273200542-29 - ignored - ref-collections-via-query - packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.tsx:40
- bf273200542-30 - ignored - flat-layer-composition - packages/plugins/plugin-assistant/src/hooks/useChatModel.ts:106
- bf273200542-31 - ignored - structured-logging-not-console - packages/plugins/plugin-assistant/src/hooks/useDebug.ts:28
- bf273200542-32 - ignored - no-module-level-object-caches - packages/stories/stories-assistant/src/components/ReplayPlayer.tsx:57
- bf273200542-33 - ignored - bounded-live-state - packages/stories/stories-assistant/src/components/ReplayPlayer.tsx:122
- bf273200542-34 - ignored - atom-lifetime-bound-to-owner - packages/stories/stories-assistant/src/components/ReplayPlayer.tsx:122
- bf273200542-35 - ignored - no-trivial-wrappers-over-official-apis - packages/stories/stories-assistant/src/scripts/build-plugin.ts:66
- bf273200542-36 - ignored - inline-obj-parent - packages/stories/stories-assistant/src/testing/decorators.tsx:518
- bf273200542-37 - ignored - dont-leak-internal-api-through-public-surface - packages/stories/stories-assistant/src/testing/index.ts:1
- bf273200542-38 - ignored - operations-resolve-database-from-service - packages/stories/stories-assistant/src/testing/launch-project.ts:16
- bf273200542-39 - ignored - use-context-scoped-cancellation - packages/stories/stories-assistant/src/testing/replay.ts:60
- bf273200542-40 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:122
- bf273200542-41 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-assistant/src/components/ThreadCard/ThreadCard.stories.tsx:22
- bf273200542-42 - resolved - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/ThreadCard/ThreadCard.tsx:72

## Issues

# WARN bf273200542-1 per-test-mutable-fixtures `packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:205`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.91. The likeliest place is lines 205-223 (`const delegationHarness: DelegationHarness = { pending: [], completed: [] };`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-2 flat-layer-composition `packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:325`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 325-354 (`const ScriptedTestLayer = (`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-3 test-real-scenario-not-narrower-proxy `packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:325`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.84. The likeliest place is lines 325-354 (`const ScriptedTestLayer = (`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-4 minimal-precise-tests `packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:981`

System One judges this a likely violation of `minimal-precise-tests` (Add the fewest tests that pin the change, each precise and readable), p=0.84. The likeliest place is lines 981-1004 (`yield* Effect.promise(async () => {`, location confidence 0.17). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-5 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts:64`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 64-89 (`export const bindSession = (`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-6 flat-layer-composition `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts:463`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 463-486 (`Effect.provide(databaseContext),`, location confidence 0.36). Judged with added `importers` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-7 no-try-catch-in-effect-code `packages/core/compute/ai/src/testing/ScriptedScene.ts:435`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.87. The likeliest place is lines 435-446 (`return failure(`Conversation "${name}": ${error instanceof Error ? error.mess...`, location confidence 0.71). Judged with added `test` context after a first pass of 0.60. This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-8 structured-logging-not-console `packages/plugins/plugin-assistant/src/chat-model/chat-model.edge.test.ts:153`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.84. The likeliest place is lines 153-161 (`})),`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-9 named-durations-and-budgets `packages/plugins/plugin-assistant/src/chat-model/chat-model.edge.test.ts:198`

System One judges this a likely violation of `named-durations-and-budgets` (Write durations as unit arithmetic and time budgets as shared named strategies), p=0.92. The likeliest place is lines 198-209 (`yield* Effect.promise(() =>`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-10 flat-layer-composition `packages/plugins/plugin-assistant/src/chat-model/chat-model.edge.test.ts:247`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 247-258 (`const stack = (client: Client, space: Space) =>`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-11 flat-layer-composition `packages/plugins/plugin-assistant/src/chat-model/chat-model.lanes.scripted.node.test.ts:121`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 121-130 (`const testLayer = () =>`, location confidence 0.85). Judged with added `importers` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# ERROR bf273200542-12 no-casts `packages/plugins/plugin-assistant/src/chat-model/chat-model.node.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 30-41 (`describe('ChatModel', () => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-13 per-test-mutable-fixtures `packages/plugins/plugin-assistant/src/chat-model/chat-model.scripted.node.test.ts:43`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.83. The likeliest place is lines 43-55 (`const Gate = Operation.make({`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-14 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-assistant/src/chat-model/chat-model.scripted.node.test.ts:95`

System One judges this a likely violation of `no-trivial-wrappers-over-official-apis` (Do not extract a helper that only forwards to an official API), p=0.83. The likeliest place is lines 95-106 (`const providerFailure = (description: string) => ({`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bf273200542-15 errors-extend-base-error `packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:148`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 148-174 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-16 flat-layer-composition `packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:478`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 478-501 (`}`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-17 no-try-catch-in-effect-code `packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:574`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 574-597 (`try {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-18 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/chat-model/chat-name.node.test.ts:27`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 27-40 (`const externalAgent: MakeTurnProducer = ({ feed }) =>`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-19 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-assistant/src/chat-model/chat-name.node.test.ts:27`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 27-40 (`const externalAgent: MakeTurnProducer = ({ feed }) =>`, location confidence 0.57). Judged with added `imports, test` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-20 no-sleep-in-test `packages/plugins/plugin-assistant/src/chat-model/chat-name.node.test.ts:59`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.97. The likeliest place is lines 59-66 (`const untilNamed = (chat: Agent.Session) =>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-21 per-test-mutable-fixtures `packages/plugins/plugin-assistant/src/chat-model/lanes.test.ts:1`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.88. The likeliest place is lines 1-20 (`import { describe, test } from 'vitest';`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-22 no-sleep-in-test `packages/plugins/plugin-assistant/src/chat-model/streaming.node.test.ts:404`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.85. The likeliest place is lines 404-415 (`const quiesce = Effect.promise(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-23 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/chat-model/streaming.node.test.ts:416`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 416-427 (`const makeStubSession = (`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-24 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-assistant/src/Chat.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-10 (`import { Chat as ChatParts } from './components/Chat/index.ts';`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-25 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:488`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 488-509 (`const ChatContent = Util.composable<HTMLDivElement, ChatContentProps>(({ chil...`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-26 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:884`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 884-907 (`const drawerRef = useRef<HTMLDivElement>(null);`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-27 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:908`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 908-931 (`lazyMount={false}`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-28 event-handler-naming-convention `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:1174`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.82. The likeliest place is lines 1174-1197 (`const ChatSuggestions = ({ classNames, suggestions, onSelect }: ChatSuggestio...`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-29 ref-collections-via-query `packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.tsx:40`

System One judges this a likely violation of `ref-collections-via-query` (List, count, or walk referenced objects through a query or Database.load, not by reading the ref array), p=0.88. The likeliest place is lines 40-51 (`}))}`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-30 flat-layer-composition `packages/plugins/plugin-assistant/src/hooks/useChatModel.ts:106`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 106-117 (`).pipe(Layer.provide(Layer.succeed(ServiceResolver.ServiceResolver, serviceRe...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-31 structured-logging-not-console `packages/plugins/plugin-assistant/src/hooks/useDebug.ts:28`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.92. The likeliest place is lines 28-39 (`console.log(trim``, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-32 no-module-level-object-caches `packages/stories/stories-assistant/src/components/ReplayPlayer.tsx:57`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.85. The likeliest place is lines 57-70 (`type Replay = {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bf273200542-33 bounded-live-state `packages/stories/stories-assistant/src/components/ReplayPlayer.tsx:122`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.80. The likeliest place is lines 122-136 (`const getReplay = (props: Parameters<typeof record>[0] & { archive: Serialize...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-34 atom-lifetime-bound-to-owner `packages/stories/stories-assistant/src/components/ReplayPlayer.tsx:122`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.94. The likeliest place is lines 122-136 (`const getReplay = (props: Parameters<typeof record>[0] & { archive: Serialize...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-35 no-trivial-wrappers-over-official-apis `packages/stories/stories-assistant/src/scripts/build-plugin.ts:66`

System One judges this a likely violation of `no-trivial-wrappers-over-official-apis` (Do not extract a helper that only forwards to an official API), p=0.85. The likeliest place is lines 66-69 (`const bash = (script: string, timeout?: number) =>`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-36 inline-obj-parent `packages/stories/stories-assistant/src/testing/decorators.tsx:518`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.84. The likeliest place is lines 518-529 (`Obj.setParent(agent, project);`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-37 dont-leak-internal-api-through-public-surface `packages/stories/stories-assistant/src/testing/index.ts:1`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.80. The likeliest place is lines 1-12 (`export * from './calculator.ts';`, location confidence 0.00). Judged with added `importers, imports, public-api` context after a first pass of 0.70. This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-38 operations-resolve-database-from-service `packages/stories/stories-assistant/src/testing/launch-project.ts:16`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.92. The likeliest place is lines 16-27 (`export const seedLaunchProject = async ({ db, chat }: { db: Database.Database...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-39 use-context-scoped-cancellation `packages/stories/stories-assistant/src/testing/replay.ts:60`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.89. The likeliest place is lines 60-68 (`for (let quiet = 0; quiet < SETTLE_READS;) {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-40 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:122`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 122-133 (`export const PromptToolbar = memo(({ classNames, message }: MessageToolbarPro...`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-41 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-assistant/src/components/ThreadCard/ThreadCard.stories.tsx:22`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 22-32 (`const meta = {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN bf273200542-42 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/ThreadCard/ThreadCard.tsx:72`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 72-83 (`<div`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `ab300771b26a09774b283e6e70f038d9d8ff5bd9`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 42 violations written to fragments, 475 uncertain, 1710 clean, 0 unanswered
- left for an agentic reviewer: 114 batch(es)

```text
requests: 977 (284 verdicts re-asked with context the model requested)
estimated input tokens: 9001295
billed input tokens: 8488647 (cost $0.3565)
measured chars per token: 3.18
```

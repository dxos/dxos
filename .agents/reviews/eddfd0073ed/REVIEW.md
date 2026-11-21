---
branch: worktree-discord-backindex-pipeline
commit: eddfd0073ed06c9403fbf90b5af94f6ba2d023bb
base: 120dc6cf9b0e218fb35d70338cef8e159a66e215
mode: fast
createdAt: 2026-11-19T14:40:39.192Z
isFinalized: true
groups: 335
rules: [business-logic-out-of-ui, confirm-in-dialog-notify-in-toast, declare-optional-services-with-noop-layers, design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, empty-container-uses-empty, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, leaf-owns-its-subscription, named-durations-and-budgets, no-casts, no-native-form-controls, no-styling-wrapper-divs, no-try-catch-in-effect-code, operations-resolve-database-from-service, reactive-state-via-atom-bridge, setter-must-not-own-transaction, stable-component-for-optional-content, store-events-not-projections, story-for-new-ui-component, structured-logging-not-console, subscribe-where-you-read, test-asserts-real-behavior, toolbars-are-menu-actions]
reviewId: eddfd0073ed
---

_4 error(s), 36 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- eddfd0073ed-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/crawler/src/Crawler.test.ts:31
- eddfd0073ed-2 - ignored - flat-layer-composition - packages/core/compute/crawler/src/StateStore.test.ts:139
- eddfd0073ed-3 - ignored - operations-resolve-database-from-service - packages/core/compute/pipeline-discord/src/pipeline.ts:34
- eddfd0073ed-4 - ignored - operations-resolve-database-from-service - packages/core/compute/pipeline-discord/src/stages/extract-questions.ts:18
- eddfd0073ed-5 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-discord/src/stages/extract-questions.ts:113
- eddfd0073ed-6 - ignored - structured-logging-not-console - packages/core/compute/pipeline-discord/src/testing/replay-fixture.test.ts:76
- eddfd0073ed-7 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:378
- eddfd0073ed-8 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:558
- eddfd0073ed-9 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:558
- eddfd0073ed-10 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:55
- eddfd0073ed-11 - ignored - no-native-form-controls - packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:115
- eddfd0073ed-12 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:127
- eddfd0073ed-13 - ignored - empty-container-uses-empty - packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:216
- eddfd0073ed-14 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:249
- eddfd0073ed-15 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-connector/src/components/ConnectionView/ConnectionView.tsx:246
- eddfd0073ed-16 - ignored - subscribe-where-you-read - packages/plugins/plugin-connector/src/containers/ConnectionArticle/ConnectionArticle.tsx:92
- eddfd0073ed-17 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/DebugObjectPanel/DebugObjectPanel.tsx:35
- eddfd0073ed-18 - ignored - stable-component-for-optional-content - packages/plugins/plugin-debug/src/containers/DebugObjectPanel/DebugObjectPanel.tsx:47
- eddfd0073ed-19 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/index.ts:35
- eddfd0073ed-20 - ignored - story-for-new-ui-component - packages/plugins/plugin-debug/src/containers/ObjectPanels/AccessTokenPanel.tsx:27
- eddfd0073ed-21 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-debug/src/containers/ObjectPanels/AccessTokenPanel.tsx:39
- eddfd0073ed-22 - ignored - store-events-not-projections - packages/plugins/plugin-debug/src/containers/ObjectPanels/AccessTokenPanel.tsx:51
- eddfd0073ed-23 - ignored - business-logic-out-of-ui - packages/plugins/plugin-debug/src/containers/ObjectPanels/AccessTokenPanel.tsx:51
- eddfd0073ed-24 - ignored - story-for-new-ui-component - packages/plugins/plugin-debug/src/containers/ObjectPanels/DebugSection.tsx:18
- eddfd0073ed-25 - ignored - story-for-new-ui-component - packages/plugins/plugin-debug/src/containers/ObjectPanels/TriggerStatePanel.tsx:25
- eddfd0073ed-26 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-discord/src/containers/DiscordAgentSetup/DiscordAgentSetup.tsx:80
- eddfd0073ed-27 - ignored - confirm-in-dialog-notify-in-toast - packages/plugins/plugin-discord/src/containers/DiscordAgentSetup/DiscordAgentSetup.tsx:212
- eddfd0073ed-28 - ignored - story-for-new-ui-component - packages/plugins/plugin-discord/src/containers/DiscordConnectionSetup/DiscordConnectionSetup.tsx:63
- eddfd0073ed-29 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-discord/src/containers/DiscordConnectionSetup/DiscordConnectionSetup.tsx:99
- eddfd0073ed-30 - ignored - business-logic-out-of-ui - packages/plugins/plugin-discord/src/containers/DiscordConnectionSetup/DiscordConnectionSetup.tsx:111
- eddfd0073ed-31 - ignored - no-casts - packages/plugins/plugin-discord/src/containers/index.ts:1
- eddfd0073ed-32 - ignored - flat-layer-composition - packages/plugins/plugin-discord/src/services/discord.test.ts:73
- eddfd0073ed-33 - ignored - declare-optional-services-with-noop-layers - packages/plugins/plugin-discord/src/services/discord.ts:148
- eddfd0073ed-34 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-discord/src/services/space-memory-fact-store.ts:30
- eddfd0073ed-35 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/questions-demo.test.ts:60
- eddfd0073ed-36 - ignored - test-asserts-real-behavior - packages/plugins/plugin-discord/src/testing/questions-demo.test.ts:72
- eddfd0073ed-37 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-discord/src/types/DiscordOperation.ts:1
- eddfd0073ed-38 - ignored - flat-layer-composition - packages/stories/stories-brain/src/testing/crawler-stores.ts:28
- eddfd0073ed-39 - ignored - no-casts - packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:219
- eddfd0073ed-40 - ignored - named-durations-and-budgets - packages/ui/react-ui-trace/src/hooks/useExecutionGraph.ts:25

## Issues

# WARN eddfd0073ed-1 effect-fn-not-hand-wrapped-gen `packages/core/compute/crawler/src/Crawler.test.ts:31`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 31-41 (`const runCrawl = (config: Type.Config, options?: Crawler.StreamOptions) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-2 flat-layer-composition `packages/core/compute/crawler/src/StateStore.test.ts:139`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 139-150 (`const client = SqliteClient.layer({ filename: ':memory:' }).pipe(Layer.orDie);`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-3 operations-resolve-database-from-service `packages/core/compute/pipeline-discord/src/pipeline.ts:34`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.89. The likeliest place is lines 34-45 (`export type RunOptions = {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-4 operations-resolve-database-from-service `packages/core/compute/pipeline-discord/src/stages/extract-questions.ts:18`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.90. The likeliest place is lines 18-32 (`export type ExtractQuestionsOptions = {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-5 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-discord/src/stages/extract-questions.ts:113`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 113-124 (`const upsertAsker = (`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-6 structured-logging-not-console `packages/core/compute/pipeline-discord/src/testing/replay-fixture.test.ts:76`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 76-87 (`console.log(`targets:   ${result.targets.map((target) => `${target.id}(${targ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR eddfd0073ed-7 no-casts `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:378`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 378-401 (`export const Tasks: Story = {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-8 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:558`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 558-583 (`void expect(statusPill?.textContent ?? '').not.toBe('');`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-9 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:558`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 558-583 (`void expect(statusPill?.textContent ?? '').not.toBe('');`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-10 reactive-state-via-atom-bridge `packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:55`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.86. The likeliest place is lines 55-66 (`const refresh = () => void statementCount(registry.forSpace(spaceId)).then(se...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-11 no-native-form-controls `packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:115`

System One judges this a likely violation of `no-native-form-controls` (Edit objects with the schema-driven `Form`, never a native input), p=0.87. The likeliest place is lines 115-126 (`ref={fileInput}`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-12 toolbars-are-menu-actions `packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:127`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.87. The likeliest place is lines 127-138 (`/>`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-13 empty-container-uses-empty `packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:216`

System One judges this a likely violation of `empty-container-uses-empty` (A container with nothing to show renders `Status.Empty`, not a hand-styled message), p=0.87. The likeliest place is lines 216-227 (`{entries.length === 0 ? (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-14 no-styling-wrapper-divs `packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:249`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 249-260 (`<div className='flex items-center gap-2 text-sm text-description'>`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-15 leaf-owns-its-subscription `packages/plugins/plugin-connector/src/components/ConnectionView/ConnectionView.tsx:246`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.84. The likeliest place is lines 246-257 (`bindings.map((binding) => (`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-16 subscribe-where-you-read `packages/plugins/plugin-connector/src/containers/ConnectionArticle/ConnectionArticle.tsx:92`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.91. The likeliest place is lines 92-103 (`[subject],`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-17 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/DebugObjectPanel/DebugObjectPanel.tsx:35`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 35-46 (`export const DebugObjectPanel = ({ role, companionTo, onOpen, canOpen }: Debu...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-18 stable-component-for-optional-content `packages/plugins/plugin-debug/src/containers/DebugObjectPanel/DebugObjectPanel.tsx:47`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.81. The likeliest place is lines 47-58 (`);`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR eddfd0073ed-19 no-casts `packages/plugins/plugin-debug/src/containers/index.ts:35`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 35-38 (`export const StatsPanel: ComponentType<any> = lazy(() =>`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-20 story-for-new-ui-component `packages/plugins/plugin-debug/src/containers/ObjectPanels/AccessTokenPanel.tsx:27`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.93. The likeliest place is lines 27-38 (`export const AccessTokenPanel = ({ object }: AccessTokenPanelProps) => {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-21 no-try-catch-in-effect-code `packages/plugins/plugin-debug/src/containers/ObjectPanels/AccessTokenPanel.tsx:39`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.89. The likeliest place is lines 39-50 (`}`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-22 store-events-not-projections `packages/plugins/plugin-debug/src/containers/ObjectPanels/AccessTokenPanel.tsx:51`

System One judges this a likely violation of `store-events-not-projections` (Store what happened, and compute what follows from it when it is read), p=0.81. The likeliest place is lines 51-62 (`try {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-23 business-logic-out-of-ui `packages/plugins/plugin-debug/src/containers/ObjectPanels/AccessTokenPanel.tsx:51`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.95. The likeliest place is lines 51-62 (`try {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-24 story-for-new-ui-component `packages/plugins/plugin-debug/src/containers/ObjectPanels/DebugSection.tsx:18`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.93. The likeliest place is lines 18-29 (`export const DebugSection = ({ title, onRefresh, refreshLabel, children }: De...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-25 story-for-new-ui-component `packages/plugins/plugin-debug/src/containers/ObjectPanels/TriggerStatePanel.tsx:25`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.93. The likeliest place is lines 25-36 (`export const TriggerStatePanel = ({ object }: TriggerStatePanelProps) => {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-26 extract-non-rendering-logic-from-component `packages/plugins/plugin-discord/src/containers/DiscordAgentSetup/DiscordAgentSetup.tsx:80`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 80-91 (`const triggers = useQuery(db, Filter.type(Trigger.Trigger));`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-27 confirm-in-dialog-notify-in-toast `packages/plugins/plugin-discord/src/containers/DiscordAgentSetup/DiscordAgentSetup.tsx:212`

System One judges this a likely violation of `confirm-in-dialog-notify-in-toast` (Confirm with an `AlertDialog` and report outcomes with a toast, never inline), p=0.90. The likeliest place is lines 212-223 (`<DiscordSetup.Toolbar`, location confidence 0.18). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-28 story-for-new-ui-component `packages/plugins/plugin-discord/src/containers/DiscordConnectionSetup/DiscordConnectionSetup.tsx:63`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.86. The likeliest place is lines 63-74 (`export const DiscordConnectionSetup = ({ connection }: DiscordConnectionSetup...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-29 extract-non-rendering-logic-from-component `packages/plugins/plugin-discord/src/containers/DiscordConnectionSetup/DiscordConnectionSetup.tsx:99`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 99-110 (`const stateRef = Ref.isRef(triggerView?.input?.state) ? triggerView?.input?.s...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-30 business-logic-out-of-ui `packages/plugins/plugin-discord/src/containers/DiscordConnectionSetup/DiscordConnectionSetup.tsx:111`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.82. The likeliest place is lines 111-122 (`if (!spaceId || !applicationId) {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR eddfd0073ed-31 no-casts `packages/plugins/plugin-discord/src/containers/index.ts:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 1-10 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-32 flat-layer-composition `packages/plugins/plugin-discord/src/services/discord.test.ts:73`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 73-87 (`const trackingCredentials = (apiKey: string) => {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-33 declare-optional-services-with-noop-layers `packages/plugins/plugin-discord/src/services/discord.ts:148`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.84. The likeliest place is lines 148-159 (`const makeRestLayer = (token: string, tokenKind: TokenKind): Layer.Layer<Disc...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-34 setter-must-not-own-transaction `packages/plugins/plugin-discord/src/services/space-memory-fact-store.ts:30`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.82. The likeliest place is lines 30-37 (`setCursor: (source, hash) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-35 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/questions-demo.test.ts:60`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 60-71 (`for (const question of questions) {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-36 test-asserts-real-behavior `packages/plugins/plugin-discord/src/testing/questions-demo.test.ts:72`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.88. The likeliest place is lines 72-78 (`expect(Array.isArray(questions)).toBe(true);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-37 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-discord/src/types/DiscordOperation.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-12 (`import * as Schema from 'effect/Schema';`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-38 flat-layer-composition `packages/stories/stories-brain/src/testing/crawler-stores.ts:28`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 28-43 (`const crawlerStoresLayer = (): Layer.Layer<CrawlerStoreServices> =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR eddfd0073ed-39 no-casts `packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:219`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 219-242 (`const parseAgentRequestEnd = (data: unknown): AgentRequestEndData | undefined...`, location confidence 0.12). This is a single-shot classifier: confirm against the rule before acting.

# WARN eddfd0073ed-40 named-durations-and-budgets `packages/ui/react-ui-trace/src/hooks/useExecutionGraph.ts:25`

System One judges this a likely violation of `named-durations-and-budgets` (Write durations as unit arithmetic and time budgets as shared named strategies), p=0.80. The likeliest place is lines 25-31 (`const SPAN_TIMEOUT_CHECK_INTERVAL_MS = 60_000;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `120dc6cf9b0e218fb35d70338cef8e159a66e215`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 40 violations written to fragments, 621 uncertain, 2458 clean, 0 unanswered
- left for an agentic reviewer: 129 batch(es)

```text
requests: 1339 (382 verdicts re-asked with context the model requested)
estimated input tokens: 8967588
billed input tokens: 8365756 (cost $0.3514)
measured chars per token: 3.22
```

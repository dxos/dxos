---
branch: worktree-discord-backindex-pipeline
commit: 29ac9385f789e1e9427841fff54838aac322a9b4
base: 120dc6cf9b0e218fb35d70338cef8e159a66e215
mode: fast
createdAt: 2026-11-19T14:01:45.040Z
isFinalized: true
groups: 281
rules: [business-logic-out-of-ui, confirm-in-dialog-notify-in-toast, declare-optional-services-with-noop-layers, empty-container-uses-empty, error-messages-carry-context, extract-non-rendering-logic-from-component, flat-layer-composition, leaf-owns-its-subscription, namespace-brand-key-prefixing, no-casts, no-native-form-controls, no-styling-wrapper-divs, no-try-catch-in-effect-code, no-unused-new-api, reactive-state-via-atom-bridge, reuse-shared-test-layer, store-events-not-projections, story-for-new-ui-component, subscribe-where-you-read, toolbars-are-menu-actions]
reviewId: 29ac9385f78
---

_3 error(s), 30 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 29ac9385f78-1 - ignored - flat-layer-composition - packages/core/compute/crawler/src/StateStore.test.ts:139
- 29ac9385f78-2 - ignored - error-messages-carry-context - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:91
- 29ac9385f78-3 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:378
- 29ac9385f78-4 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:558
- 29ac9385f78-5 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:55
- 29ac9385f78-6 - ignored - no-native-form-controls - packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:115
- 29ac9385f78-7 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:127
- 29ac9385f78-8 - ignored - empty-container-uses-empty - packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:216
- 29ac9385f78-9 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:249
- 29ac9385f78-10 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-connector/src/components/ConnectionView/ConnectionView.tsx:246
- 29ac9385f78-11 - ignored - subscribe-where-you-read - packages/plugins/plugin-connector/src/containers/ConnectionArticle/ConnectionArticle.tsx:68
- 29ac9385f78-12 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/DebugObjectPanel/DebugObjectPanel.tsx:35
- 29ac9385f78-13 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/index.ts:35
- 29ac9385f78-14 - ignored - story-for-new-ui-component - packages/plugins/plugin-debug/src/containers/ObjectPanels/AccessTokenPanel.tsx:27
- 29ac9385f78-15 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-debug/src/containers/ObjectPanels/AccessTokenPanel.tsx:39
- 29ac9385f78-16 - ignored - store-events-not-projections - packages/plugins/plugin-debug/src/containers/ObjectPanels/AccessTokenPanel.tsx:51
- 29ac9385f78-17 - ignored - business-logic-out-of-ui - packages/plugins/plugin-debug/src/containers/ObjectPanels/AccessTokenPanel.tsx:51
- 29ac9385f78-18 - resolved - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/ObjectPanels/DebugSection.tsx:17
- 29ac9385f78-19 - ignored - story-for-new-ui-component - packages/plugins/plugin-debug/src/containers/ObjectPanels/DebugSection.tsx:17
- 29ac9385f78-20 - ignored - story-for-new-ui-component - packages/plugins/plugin-debug/src/containers/ObjectPanels/TriggerStatePanel.tsx:25
- 29ac9385f78-21 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-discord/src/containers/DiscordAgentSetup/DiscordAgentSetup.tsx:80
- 29ac9385f78-22 - ignored - confirm-in-dialog-notify-in-toast - packages/plugins/plugin-discord/src/containers/DiscordAgentSetup/DiscordAgentSetup.tsx:212
- 29ac9385f78-23 - ignored - story-for-new-ui-component - packages/plugins/plugin-discord/src/containers/DiscordConnectionSetup/DiscordConnectionSetup.tsx:61
- 29ac9385f78-24 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-discord/src/containers/DiscordConnectionSetup/DiscordConnectionSetup.tsx:97
- 29ac9385f78-25 - ignored - business-logic-out-of-ui - packages/plugins/plugin-discord/src/containers/DiscordConnectionSetup/DiscordConnectionSetup.tsx:109
- 29ac9385f78-26 - resolved - empty-container-uses-empty - packages/plugins/plugin-discord/src/containers/DiscordConnectionSetup/DiscordConnectionSetup.tsx:265
- 29ac9385f78-27 - resolved - no-styling-wrapper-divs - packages/plugins/plugin-discord/src/containers/DiscordConnectionSetup/DiscordConnectionSetup.tsx:397
- 29ac9385f78-28 - ignored - no-unused-new-api - packages/plugins/plugin-discord/src/containers/DiscordConnectionSetup/index.ts:1
- 29ac9385f78-29 - ignored - reuse-shared-test-layer - packages/plugins/plugin-discord/src/operations/crawl.test.ts:47
- 29ac9385f78-30 - ignored - flat-layer-composition - packages/plugins/plugin-discord/src/services/discord.test.ts:73
- 29ac9385f78-31 - ignored - declare-optional-services-with-noop-layers - packages/plugins/plugin-discord/src/services/discord.ts:148
- 29ac9385f78-32 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-discord/src/types/DiscordOperation.ts:157
- 29ac9385f78-33 - ignored - no-casts - packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:219

## Issues

# WARN 29ac9385f78-1 flat-layer-composition `packages/core/compute/crawler/src/StateStore.test.ts:139`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 139-150 (`const client = SqliteClient.layer({ filename: ':memory:' }).pipe(Layer.orDie);`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-2 error-messages-carry-context `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:91`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 91-107 (`const typePrompt = async (canvasElement: HTMLElement, text: string) => {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 29ac9385f78-3 no-casts `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:378`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 378-401 (`export const Tasks: Story = {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-4 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:558`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 558-583 (`void expect(statusPill?.textContent ?? '').not.toBe('');`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-5 reactive-state-via-atom-bridge `packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:55`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.83. The likeliest place is lines 55-66 (`const refresh = () => void statementCount(registry.forSpace(spaceId)).then(se...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-6 no-native-form-controls `packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:115`

System One judges this a likely violation of `no-native-form-controls` (Edit objects with the schema-driven `Form`, never a native input), p=0.89. The likeliest place is lines 115-126 (`ref={fileInput}`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-7 toolbars-are-menu-actions `packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:127`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 127-138 (`/>`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-8 empty-container-uses-empty `packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:216`

System One judges this a likely violation of `empty-container-uses-empty` (A container with nothing to show renders `Status.Empty`, not a hand-styled message), p=0.87. The likeliest place is lines 216-227 (`{entries.length === 0 ? (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-9 no-styling-wrapper-divs `packages/plugins/plugin-brain/src/containers/MemoryArticle/MemoryArticle.tsx:249`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 249-260 (`<div className='flex items-center gap-2 text-sm text-description'>`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-10 leaf-owns-its-subscription `packages/plugins/plugin-connector/src/components/ConnectionView/ConnectionView.tsx:246`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.80. The likeliest place is lines 246-257 (`bindings.map((binding) => (`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-11 subscribe-where-you-read `packages/plugins/plugin-connector/src/containers/ConnectionArticle/ConnectionArticle.tsx:68`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.90. The likeliest place is lines 68-79 (`void invokePromise(SpaceOperation.RemoveObjects, { objects: [binding] }, { sp...`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-12 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/DebugObjectPanel/DebugObjectPanel.tsx:35`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 35-46 (`export const DebugObjectPanel = ({ role, companionTo, onOpen, canOpen }: Debu...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 29ac9385f78-13 no-casts `packages/plugins/plugin-debug/src/containers/index.ts:35`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 35-38 (`export const StatsPanel: ComponentType<any> = lazy(() =>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-14 story-for-new-ui-component `packages/plugins/plugin-debug/src/containers/ObjectPanels/AccessTokenPanel.tsx:27`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.91. The likeliest place is lines 27-38 (`export const AccessTokenPanel = ({ object }: AccessTokenPanelProps) => {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-15 no-try-catch-in-effect-code `packages/plugins/plugin-debug/src/containers/ObjectPanels/AccessTokenPanel.tsx:39`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.87. The likeliest place is lines 39-50 (`}`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-16 store-events-not-projections `packages/plugins/plugin-debug/src/containers/ObjectPanels/AccessTokenPanel.tsx:51`

System One judges this a likely violation of `store-events-not-projections` (Store what happened, and compute what follows from it when it is read), p=0.83. The likeliest place is lines 51-62 (`try {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-17 business-logic-out-of-ui `packages/plugins/plugin-debug/src/containers/ObjectPanels/AccessTokenPanel.tsx:51`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.95. The likeliest place is lines 51-62 (`try {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-18 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/ObjectPanels/DebugSection.tsx:17`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.97. The likeliest place is lines 17-28 (`export const DebugSection = ({ title, onRefresh, refreshLabel, children }: De...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-19 story-for-new-ui-component `packages/plugins/plugin-debug/src/containers/ObjectPanels/DebugSection.tsx:17`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.93. The likeliest place is lines 17-28 (`export const DebugSection = ({ title, onRefresh, refreshLabel, children }: De...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-20 story-for-new-ui-component `packages/plugins/plugin-debug/src/containers/ObjectPanels/TriggerStatePanel.tsx:25`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.93. The likeliest place is lines 25-36 (`export const TriggerStatePanel = ({ object }: TriggerStatePanelProps) => {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-21 extract-non-rendering-logic-from-component `packages/plugins/plugin-discord/src/containers/DiscordAgentSetup/DiscordAgentSetup.tsx:80`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 80-91 (`const triggers = useQuery(db, Filter.type(Trigger.Trigger));`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-22 confirm-in-dialog-notify-in-toast `packages/plugins/plugin-discord/src/containers/DiscordAgentSetup/DiscordAgentSetup.tsx:212`

System One judges this a likely violation of `confirm-in-dialog-notify-in-toast` (Confirm with an `AlertDialog` and report outcomes with a toast, never inline), p=0.90. The likeliest place is lines 212-223 (`<DiscordSetup.Toolbar`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-23 story-for-new-ui-component `packages/plugins/plugin-discord/src/containers/DiscordConnectionSetup/DiscordConnectionSetup.tsx:61`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.86. The likeliest place is lines 61-72 (`export const DiscordConnectionSetup = ({ connection }: DiscordConnectionSetup...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-24 extract-non-rendering-logic-from-component `packages/plugins/plugin-discord/src/containers/DiscordConnectionSetup/DiscordConnectionSetup.tsx:97`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 97-108 (`const stateRef = Ref.isRef(triggerView?.input?.state) ? triggerView?.input?.s...`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-25 business-logic-out-of-ui `packages/plugins/plugin-discord/src/containers/DiscordConnectionSetup/DiscordConnectionSetup.tsx:109`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 109-120 (`if (!spaceId || !applicationId) {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-26 empty-container-uses-empty `packages/plugins/plugin-discord/src/containers/DiscordConnectionSetup/DiscordConnectionSetup.tsx:265`

System One judges this a likely violation of `empty-container-uses-empty` (A container with nothing to show renders `Status.Empty`, not a hand-styled message), p=0.85. The likeliest place is lines 265-276 (`{managed.length === 0 ? (`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-27 no-styling-wrapper-divs `packages/plugins/plugin-discord/src/containers/DiscordConnectionSetup/DiscordConnectionSetup.tsx:397`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.97. The likeliest place is lines 397-408 (`{state?.lastRun`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-28 no-unused-new-api `packages/plugins/plugin-discord/src/containers/DiscordConnectionSetup/index.ts:1`

System One judges this a likely violation of `no-unused-new-api` (Don't add or export API that nothing calls), p=0.80. The likeliest place is lines 1-6 (`export { DiscordConnectionSetup as default } from './DiscordConnectionSetup.t...`, location confidence 1.00). Judged with added `diff, importers, public-api` context after a first pass of 0.59. This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-29 reuse-shared-test-layer `packages/plugins/plugin-discord/src/operations/crawl.test.ts:47`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.80. The likeliest place is lines 47-60 (`const fakeDiscord = (history: Map<string, DiscordService.Message[]>, reads: R...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-30 flat-layer-composition `packages/plugins/plugin-discord/src/services/discord.test.ts:73`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 73-87 (`const trackingCredentials = (apiKey: string) => {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-31 declare-optional-services-with-noop-layers `packages/plugins/plugin-discord/src/services/discord.ts:148`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.84. The likeliest place is lines 148-159 (`const makeRestLayer = (token: string, tokenKind: TokenKind): Layer.Layer<Disc...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 29ac9385f78-32 namespace-brand-key-prefixing `packages/plugins/plugin-discord/src/types/DiscordOperation.ts:157`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.84. The likeliest place is lines 157-169 (`export const BackIndexAnnotation = Annotation.make({`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 29ac9385f78-33 no-casts `packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:219`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 219-242 (`const parseAgentRequestEnd = (data: unknown): AgentRequestEndData | undefined...`, location confidence 0.12). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `120dc6cf9b0e218fb35d70338cef8e159a66e215`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 33 violations written to fragments, 514 uncertain, 1942 clean, 0 unanswered
- left for an agentic reviewer: 120 batch(es)

```text
requests: 1072 (310 verdicts re-asked with context the model requested)
estimated input tokens: 7507739
billed input tokens: 7036706 (cost $0.2955)
measured chars per token: 3.20
```

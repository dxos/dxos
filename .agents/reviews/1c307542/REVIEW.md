---
branch: dm/vibrant-ride-5a4dy4
commit: 1c3075425bc9b1cb701e89898dae907fbf966774
base: 82a9c4e26496367531f97f4b8d145b384d0fdc4a
mode: fast
createdAt: 2026-09-27T16:01:19.355Z
isFinalized: true
groups: 315
rules: [comment-hygiene, design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, extract-non-rendering-logic-from-component, no-casts, no-hand-rolled-lists, no-styling-wrapper-divs, subscribe-where-you-read, toolbars-are-menu-actions]
reviewId: 1c307542
---

_7 error(s), 25 warning(s)._

# ERROR 1c307542-1 no-casts `packages/devtools/cli/src/util/runtime.ts:74`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 74-85 (`return result as Effect.Effect<unknown>;`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c307542-2 comment-hygiene `packages/plugins/plugin-assistant/src/plugin.ts:47`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 47-58 (`Plugin.addModule(AssistantState),`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c307542-3 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:102`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 102-113 (`useEffect(() => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c307542-4 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-bluesky/src/operations/sync.ts:48`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.93. The likeliest place is lines 48-59 (`const syncBinding = ({ binding }: { binding: Cursor.ExternalCursor }) =>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c307542-5 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-bluesky/src/services/BlueskyApi.ts:217`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 217-228 (`const runRequest = <T>(request: HttpClientRequest.HttpClientRequest, schema: ...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c307542-6 no-hand-rolled-lists `packages/plugins/plugin-doctor/src/containers/DiagnosticsPanel/DiagnosticsPanel.tsx:209`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.82. The likeliest place is lines 209-217 (`{result.issues.map((issue) => (`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1c307542-7 no-casts `packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:23`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 23-26 (`const generator = random as any as ValueGenerator;`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c307542-8 extract-non-rendering-logic-from-component `packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:39`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 39-50 (`let cancelled = false;`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c307542-9 no-styling-wrapper-divs `packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:75`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 75-86 (`<div className='relative flex dx-fill'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1c307542-10 no-casts `packages/plugins/plugin-explorer/src/testing/relations.ts:99`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 99-110 (`export const connectionsToEdges = (connections: Obj.Any[]): BundleEdge[] => {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c307542-11 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/capabilities/link-resolver.ts:61`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 61-72 (`const fetchFromGitHub: GitHubCapabilities.GitHubLinkSource = (link, { db }) =>`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c307542-12 subscribe-where-you-read `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:57`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.82. The likeliest place is lines 57-68 (`const CallTranscriptionView = ({ meeting, transcript }: CallTranscriptionView...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c307542-13 extract-non-rendering-logic-from-component `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:69`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 69-80 (`if (!transcriptionManagerProvider || !space || !feed) {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c307542-14 no-styling-wrapper-divs `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:117`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 117-128 (`return (`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c307542-15 toolbars-are-menu-actions `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:117`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.93. The likeliest place is lines 117-128 (`return (`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c307542-16 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-onboarding/src/operations/shared.ts:74`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 74-85 (`export const beginOAuthFlow = (`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c307542-17 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:26`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 26-37 (`const resolveLink = (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1c307542-18 no-casts `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:146`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 146-157 (`);`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c307542-19 error-messages-carry-context `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:533`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.86. The likeliest place is lines 533-544 (`throw new Error('Chat not found.');`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c307542-20 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:122`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 122-133 (`useEffect(() => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c307542-21 error-messages-carry-context `packages/plugins/plugin-sandbox/src/services/layer.ts:80`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 80-92 (`const edgeContext = (capabilities: CapabilityManager.CapabilityManager) => ()...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c307542-22 error-messages-carry-context `packages/plugins/plugin-sandbox/src/services/sandbox-url.ts:27`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.87. The likeliest place is lines 27-41 (`export const getSandboxServiceUrl = (config: Config): string => {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1c307542-23 no-casts `packages/plugins/plugin-script/src/hooks/useCreateAndDeployScriptTemplates.ts:40`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 40-51 (`scriptTemplates.map(async (template) => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1c307542-24 no-casts `packages/plugins/plugin-script/src/skills/functions/deploy.ts:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 37-48 (`yield* Effect.promise(() => initializeBundler({ wasmUrl }));`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1c307542-25 no-casts `packages/plugins/plugin-script/src/util/deploy.ts:49`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 49-60 (`if (!ownerDid) {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c307542-26 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:78`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 78-89 (`const { values: statuses, rest } = useMemo(() => parseEnumTerms(filterText, S...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c307542-27 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:330`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 330-341 (`}`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c307542-28 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Gantt/Gantt.stories.tsx:386`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 386-413 (`const Layout = ({ chart, data }: { chart: ReactNode; data: unknown }) => (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c307542-29 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-trace/src/components/Gantt/Gantt.stories.tsx:841`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 841-864 (`export const ManyLanes: Story = {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c307542-30 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:307`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 307-330 (`return (`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c307542-31 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:351`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 351-374 (`const GanttLegend = composable<HTMLDivElement, GanttLegendProps>(({ children,...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1c307542-32 extract-non-rendering-logic-from-component `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:545`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 545-568 (`for (const list of byLane.values()) {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

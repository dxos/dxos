---
branch: dm/pensive-shannon-yysj9j
commit: 5e3e00c0bdd2a81ba67260ee1faa1b294dbb88e7
base: 7107ac7507756a4b6cecd1fa39982a14e8a4fee5
mode: default
createdAt: 2026-10-13T05:46:36.683Z
isFinalized: true
groups: 94
rules: [barrel-imports-not-internal-paths, business-logic-out-of-ui, canonical-api-surface, comment-hygiene, declare-optional-services-with-noop-layers, design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, extract-non-rendering-logic-from-component, import-as-namespace-is-all-or-nothing, key-chords-live-in-the-table, namespace-export-with-internal-hiding, no-casts, no-invented-theme-tokens, no-styling-wrapper-divs, no-trivial-wrappers-over-official-apis, subscribe-where-you-read, test-asserts-real-behavior, toolbars-are-menu-actions]
reviewId: 5e3e00c0
---

_9 error(s), 38 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 5e3e00c0-1 - unresolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/protocol.test.ts:70
- 5e3e00c0-2 - unresolved - barrel-imports-not-internal-paths - packages/core/compute/compute-runtime/src/protocol.ts:13
- 5e3e00c0-3 - unresolved - canonical-api-surface - packages/core/compute/compute-runtime/src/protocol.ts:13
- 5e3e00c0-4 - resolved - no-casts - packages/core/compute/compute-runtime/src/protocol.ts:491
- 5e3e00c0-5 - unresolved - test-asserts-real-behavior - packages/core/echo/echo-client/src/proxy-db/mutable-schema.test.ts:42
- 5e3e00c0-6 - unresolved - no-casts - packages/core/echo/echo-client/src/proxy-db/mutable-schema.test.ts:114
- 5e3e00c0-7 - unresolved - comment-hygiene - packages/plugins/plugin-agent/src/components/AgentState/AgentState.tsx:72
- 5e3e00c0-8 - unresolved - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:51
- 5e3e00c0-9 - unresolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:181
- 5e3e00c0-10 - unresolved - no-styling-wrapper-divs - packages/plugins/plugin-attention/src/stories/SelectionState.stories.tsx:130
- 5e3e00c0-11 - unresolved - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:47
- 5e3e00c0-12 - unresolved - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:53
- 5e3e00c0-13 - unresolved - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:341
- 5e3e00c0-14 - unresolved - no-casts - packages/plugins/plugin-deck/src/testing/story-plugin.tsx:172
- 5e3e00c0-15 - unresolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/operations/pull-request.ts:22
- 5e3e00c0-16 - unresolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/services/github-api.ts:257
- 5e3e00c0-17 - unresolved - no-casts - packages/plugins/plugin-github/src/services/github-api.ts:577
- 5e3e00c0-18 - unresolved - no-styling-wrapper-divs - packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:139
- 5e3e00c0-19 - unresolved - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:139
- 5e3e00c0-20 - unresolved - subscribe-where-you-read - packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:190
- 5e3e00c0-21 - unresolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:237
- 5e3e00c0-22 - unresolved - barrel-imports-not-internal-paths - packages/plugins/plugin-space/src/operations/add-type.ts:1
- 5e3e00c0-23 - unresolved - declare-optional-services-with-noop-layers - packages/plugins/plugin-space/src/operations/add-type.ts:40
- 5e3e00c0-24 - unresolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:71
- 5e3e00c0-25 - unresolved - toolbars-are-menu-actions - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:155
- 5e3e00c0-26 - unresolved - namespace-export-with-internal-hiding - packages/sdk/app-toolkit/src/index.ts:1
- 5e3e00c0-27 - unresolved - no-casts - packages/sdk/app-toolkit/src/ui/components/AppSurface/AppSurface.test.ts:324
- 5e3e00c0-28 - unresolved - no-casts - packages/sdk/app-toolkit/src/ui/components/AppSurface/AppSurface.ts:713
- 5e3e00c0-29 - unresolved - import-as-namespace-is-all-or-nothing - packages/sdk/app-toolkit/src/ui/components/HomeSection/index.ts:1
- 5e3e00c0-30 - unresolved - import-as-namespace-is-all-or-nothing - packages/sdk/app-toolkit/src/ui/components/NotFoundArticle/index.ts:1
- 5e3e00c0-31 - unresolved - import-as-namespace-is-all-or-nothing - packages/sdk/app-toolkit/src/ui/components/ObjectCombobox/index.ts:1
- 5e3e00c0-32 - unresolved - import-as-namespace-is-all-or-nothing - packages/sdk/app-toolkit/src/ui/components/SettingsScope/index.ts:1
- 5e3e00c0-33 - unresolved - no-trivial-wrappers-over-official-apis - packages/sdk/shell/src/stories/Invitations.stories.tsx:13
- 5e3e00c0-34 - unresolved - no-casts - packages/sdk/shell/src/stories/Invitations.stories.tsx:32
- 5e3e00c0-35 - unresolved - key-chords-live-in-the-table - packages/ui/react-ui-canvas/src/components/Layers/Layers.tsx:166
- 5e3e00c0-36 - unresolved - extract-non-rendering-logic-from-component - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:115
- 5e3e00c0-37 - unresolved - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:269
- 5e3e00c0-38 - unresolved - no-casts - packages/ui/react-ui-form/src/components/fields/RefArrayField.tsx:80
- 5e3e00c0-39 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui-introspect/src/components/ToolList/ToolList.tsx:67
- 5e3e00c0-40 - unresolved - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-list/src/components/Listbox/Listbox.stories.tsx:118
- 5e3e00c0-41 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui-list/src/components/OrderedList/OrderedList.stories.tsx:156
- 5e3e00c0-42 - unresolved - extract-non-rendering-logic-from-component - packages/ui/react-ui-rdf/src/components/FactViewer/FactViewer.tsx:85
- 5e3e00c0-43 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:78
- 5e3e00c0-44 - unresolved - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:78
- 5e3e00c0-45 - unresolved - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx:138
- 5e3e00c0-46 - unresolved - no-invented-theme-tokens - packages/ui/ui-template/src/react/testing/MultiSelectList.tsx:46
- 5e3e00c0-47 - unresolved - no-styling-wrapper-divs - packages/ui/ui-template/src/react/testing/Workbench.tsx:54

## Issues

# WARN 5e3e00c0-1 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/protocol.test.ts:70`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 70-81 (`test('provides Hypergraph.Service to a handler that declares it', async ({ ex...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-2 barrel-imports-not-internal-paths `packages/core/compute/compute-runtime/src/protocol.ts:13`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.80. The likeliest place is lines 13-24 (`import * as Credential from '@dxos/compute/Credential';`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-3 canonical-api-surface `packages/core/compute/compute-runtime/src/protocol.ts:13`

System One judges this a likely violation of `canonical-api-surface` (Import the canonical public export, never an internal path), p=0.83. The likeliest place is lines 13-24 (`import * as Credential from '@dxos/compute/Credential';`, location confidence 0.61). Judged with added `imports, package, public-api` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5e3e00c0-4 no-casts `packages/core/compute/compute-runtime/src/protocol.ts:491`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 491-502 (`const result: Record<string, unknown> = { ...(value as any) };`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-5 test-asserts-real-behavior `packages/core/echo/echo-client/src/proxy-db/mutable-schema.test.ts:42`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.89. The likeliest place is lines 42-53 (`test.skip('set EchoSchema as echo object field', async () => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5e3e00c0-6 no-casts `packages/core/echo/echo-client/src/proxy-db/mutable-schema.test.ts:114`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 114-125 (`expect(Type.getSchema(Obj.getType(object)!).ast).to.deep.eq(Type.getSchema(sc...`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-7 comment-hygiene `packages/plugins/plugin-agent/src/components/AgentState/AgentState.tsx:72`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 72-81 (`AgentStateRoot.displayName = 'AgentState.Root';`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-8 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:51`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 51-66 (`const styles = {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-9 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:181`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 181-192 (`useEffect(() => {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-10 no-styling-wrapper-divs `packages/plugins/plugin-attention/src/stories/SelectionState.stories.tsx:130`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 130-141 (`<div className='w-56 shrink-0 flex flex-col overflow-hidden'>`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-11 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:47`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.91. The likeliest place is lines 47-58 (`if (!hubClient) {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-12 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:53`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 53-66 (`const DefaultStory = () => {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-13 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:341`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 341-364 (`id: 'storyArticleCompanion',`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5e3e00c0-14 no-casts `packages/plugins/plugin-deck/src/testing/story-plugin.tsx:172`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 172-183 (`const subject = (data as any)?.subject;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-15 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/operations/pull-request.ts:22`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 22-33 (`export const githubConnection = () =>`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-16 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/services/github-api.ts:257`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 257-283 (`const githubRequest = <T>(build: () => HttpClientRequest.HttpClientRequest, s...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5e3e00c0-17 no-casts `packages/plugins/plugin-github/src/services/github-api.ts:577`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 577-604 (`export const updateIssue = (`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-18 no-styling-wrapper-divs `packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:139`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 139-150 (`return (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-19 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:139`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 139-150 (`return (`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-20 subscribe-where-you-read `packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:190`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.87. The likeliest place is lines 190-201 (`<Form.Content>`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-21 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:237`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 237-248 (`const [activeViewers, setActiveViewers] = useState(viewers ? getActiveViewers...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-22 barrel-imports-not-internal-paths `packages/plugins/plugin-space/src/operations/add-type.ts:1`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.84. The likeliest place is lines 1-15 (`import * as Effect from 'effect/Effect';`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-23 declare-optional-services-with-noop-layers `packages/plugins/plugin-space/src/operations/add-type.ts:40`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.82. The likeliest place is lines 40-51 (`const plugins = yield* Effect.serviceOption(Plugin.Service);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-24 extract-non-rendering-logic-from-component `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:71`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 71-82 (`useEffect(() => {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-25 toolbars-are-menu-actions `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:155`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.85. The likeliest place is lines 155-166 (`<Button.Root icon='ph--plus--regular' iconOnly label='Add layer' onClick={han...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-26 namespace-export-with-internal-hiding `packages/sdk/app-toolkit/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.93. The likeliest place is lines 1-14 (`export * from './account/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5e3e00c0-27 no-casts `packages/sdk/app-toolkit/src/ui/components/AppSurface/AppSurface.test.ts:324`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 324-332 (`expect(definition.filter!({ subject: objectA, attendableId: 'id' }, 'org.dxos...`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5e3e00c0-28 no-casts `packages/sdk/app-toolkit/src/ui/components/AppSurface/AppSurface.ts:713`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 713-728 (`export const deckCompanion = (variant: string): Role.Role<{ id?: string; subj...`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-29 import-as-namespace-is-all-or-nothing `packages/sdk/app-toolkit/src/ui/components/HomeSection/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-6 (`export * as HomeSection from './HomeSection.tsx';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.71. This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-30 import-as-namespace-is-all-or-nothing `packages/sdk/app-toolkit/src/ui/components/NotFoundArticle/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as NotFoundArticle from './NotFoundArticle.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-31 import-as-namespace-is-all-or-nothing `packages/sdk/app-toolkit/src/ui/components/ObjectCombobox/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as ObjectCombobox from './ObjectCombobox.tsx';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-32 import-as-namespace-is-all-or-nothing `packages/sdk/app-toolkit/src/ui/components/SettingsScope/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-6 (`export * as SettingsScope from './SettingsScope.tsx';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-33 no-trivial-wrappers-over-official-apis `packages/sdk/shell/src/stories/Invitations.stories.tsx:13`

System One judges this a likely violation of `no-trivial-wrappers-over-official-apis` (Do not extract a helper that only forwards to an official API), p=0.81. The likeliest place is lines 13-31 (`import { useClient } from '@dxos/react-client';`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5e3e00c0-34 no-casts `packages/sdk/shell/src/stories/Invitations.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 32-43 (`const Panel = ({ id, panel, setPanel }: { id: number; panel?: PanelType; setP...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5e3e00c0-35 key-chords-live-in-the-table `packages/ui/react-ui-canvas/src/components/Layers/Layers.tsx:166`

System One judges this a likely violation of `key-chords-live-in-the-table` (Every chord is a KEY_BINDINGS entry, matched and labelled from it), p=0.81. The likeliest place is lines 166-177 (`<OrderedList.Content`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-36 extract-non-rendering-logic-from-component `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:115`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 115-126 (`}`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-37 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:269`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 269-280 (`<Select.Content>`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5e3e00c0-38 no-casts `packages/ui/react-ui-form/src/components/fields/RefArrayField.tsx:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 80-91 (`});`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-39 no-styling-wrapper-divs `packages/ui/react-ui-introspect/src/components/ToolList/ToolList.tsx:67`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 67-81 (`<div className='flex flex-col grow overflow-hidden'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-40 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-list/src/components/Listbox/Listbox.stories.tsx:118`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 118-130 (`const meta = {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-41 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/OrderedList/OrderedList.stories.tsx:156`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 156-167 (`const ScrollableStory = () => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-42 extract-non-rendering-logic-from-component `packages/ui/react-ui-rdf/src/components/FactViewer/FactViewer.tsx:85`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 85-96 (`const FactViewerRoot = forwardRef<HTMLDivElement, FactViewerRootProps>(`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-43 no-styling-wrapper-divs `packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:78`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 78-84 (`const Host = ({ width, children }: PropsWithChildren<Pick<StoryArgs, 'width'>...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-44 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:78`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 78-84 (`const Host = ({ width, children }: PropsWithChildren<Pick<StoryArgs, 'width'>...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-45 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx:138`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 138-161 (`return undefined;`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-46 no-invented-theme-tokens `packages/ui/ui-template/src/react/testing/MultiSelectList.tsx:46`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.85. The likeliest place is lines 46-57 (`<Listbox.Item`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5e3e00c0-47 no-styling-wrapper-divs `packages/ui/ui-template/src/react/testing/Workbench.tsx:54`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 54-63 (`))}`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `7107ac7507756a4b6cecd1fa39982a14e8a4fee5`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 47 violations written to fragments, 514 uncertain, 3668 clean, 0 unanswered
- left for an agentic reviewer: 87 batch(es)
- not reviewed: five `system-one: off` groups (19, 28, 31, 33, 36) and the uncertain pairs were not sent to subagents; `isFinalized: true` marks the artifact finalized, not complete review coverage

```text
requests: 1766 (314 verdicts re-asked with context the model requested)
estimated input tokens: 13035407
billed input tokens: 12397625 (cost $0.5207)
measured chars per token: 3.15
```

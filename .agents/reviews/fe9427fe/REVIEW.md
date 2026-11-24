---
branch: main-kf588t
commit: fe9427fe5945aa6ab4246dd001611a000ad3bedf
base: 341bb91bea2b43152acc9688ecaa64879138e035
mode: fast
createdAt: 2026-11-24T12:52:42.452Z
isFinalized: true
groups: 170
rules: [atom-lifetime-bound-to-owner, design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, extract-non-rendering-logic-from-component, flat-layer-composition, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, no-casts, no-hand-rolled-lists, no-styling-wrapper-divs, no-try-catch-in-effect-code, one-operation-per-navigation-intent, stable-component-for-optional-content, story-for-new-ui-component, subscribe-where-you-read, use-context-scoped-cancellation]
reviewId: fe9427fe
---

_1 error(s), 27 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- fe9427fe-1 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-commerce/src/util/errors.ts:1
- fe9427fe-2 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-commerce/src/util/renderViaCrx.ts:76
- fe9427fe-3 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-connector/src/Binding.ts:244
- fe9427fe-4 - ignored - flat-layer-composition - packages/plugins/plugin-connector/src/Binding.ts:660
- fe9427fe-5 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-connector/src/SyncTemplate.ts:69
- fe9427fe-6 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-duffel/src/services/DuffelClient.ts:20
- fe9427fe-7 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/operations/import-pull-request.test.ts:42
- fe9427fe-8 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/operations/pull-request.ts:26
- fe9427fe-9 - ignored - flat-layer-composition - packages/plugins/plugin-github/src/operations/pull-request.ts:111
- fe9427fe-10 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-inspector/src/index.ts:1
- fe9427fe-11 - ignored - atom-lifetime-bound-to-owner - packages/plugins/plugin-inspector/src/InspectorPlugin.tsx:34
- fe9427fe-12 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inspector/src/Layout.tsx:97
- fe9427fe-13 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-inspector/src/Layout.tsx:155
- fe9427fe-14 - ignored - no-hand-rolled-lists - packages/plugins/plugin-inspector/src/Layout.tsx:167
- fe9427fe-15 - ignored - stable-component-for-optional-content - packages/plugins/plugin-inspector/src/Layout.tsx:344
- fe9427fe-16 - ignored - stable-component-for-optional-content - packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemColumns.tsx:44
- fe9427fe-17 - ignored - story-for-new-ui-component - packages/plugins/plugin-navtree/src/components/Sidebar/L0ItemActiveTabIndicator.tsx:10
- fe9427fe-18 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:190
- fe9427fe-19 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:378
- fe9427fe-20 - ignored - stable-component-for-optional-content - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:97
- fe9427fe-21 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:205
- fe9427fe-22 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:205
- fe9427fe-23 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-navtree/src/constants.ts:1
- fe9427fe-24 - ignored - one-operation-per-navigation-intent - packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:158
- fe9427fe-25 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:314
- fe9427fe-26 - ignored - subscribe-where-you-read - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:36
- fe9427fe-27 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:48
- fe9427fe-28 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-sheet/src/model/useSheetModel.ts:29

## Issues

# WARN fe9427fe-1 namespace-brand-key-prefixing `packages/plugins/plugin-commerce/src/util/errors.ts:1`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.83. The likeliest place is lines 1-8 (`import { BaseError } from '@dxos/errors';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN fe9427fe-2 use-context-scoped-cancellation `packages/plugins/plugin-commerce/src/util/renderViaCrx.ts:76`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.82. The likeliest place is lines 76-87 (`export const renderViaCrx = (url: string, options: RenderOptions = {}): Effec...`, location confidence 0.40). Judged with added `diff, importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN fe9427fe-3 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-connector/src/Binding.ts:244`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 244-268 (`export const findTrigger = (connection: Connection.Connection) =>`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN fe9427fe-4 flat-layer-composition `packages/plugins/plugin-connector/src/Binding.ts:660`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 660-676 (`Effect.provide(`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN fe9427fe-5 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-connector/src/SyncTemplate.ts:69`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 69-81 (`const resolveConnection = (subject: Obj.Unknown) =>`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN fe9427fe-6 no-try-catch-in-effect-code `packages/plugins/plugin-duffel/src/services/DuffelClient.ts:20`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.82. The likeliest place is lines 20-31 (`export const duffelErrorMessage = (status: number, text: string): string => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN fe9427fe-7 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/operations/import-pull-request.test.ts:42`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.91. The likeliest place is lines 42-51 (`const fetchRejectingToken = (status: number, tokens: string[]) => (_owner: st...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN fe9427fe-8 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/operations/pull-request.ts:26`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 26-37 (`export const githubConnection = (): Effect.Effect<`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN fe9427fe-9 flat-layer-composition `packages/plugins/plugin-github/src/operations/pull-request.ts:111`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 111-122 (`fetch(owner, repo, number).pipe(Effect.provide(Layer.succeed(GitHubApi.GitHub...`, location confidence 0.48). Judged with added `importers` context after a first pass of 0.71. This is a single-shot classifier: confirm against the rule before acting.

# WARN fe9427fe-10 namespace-export-with-internal-hiding `packages/plugins/plugin-inspector/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.82. The likeliest place is lines 1-10 (`export * from './capabilities.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN fe9427fe-11 atom-lifetime-bound-to-owner `packages/plugins/plugin-inspector/src/InspectorPlugin.tsx:34`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.96. The likeliest place is lines 34-45 (`Effect.gen(function* () {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN fe9427fe-12 no-styling-wrapper-divs `packages/plugins/plugin-inspector/src/Layout.tsx:97`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.97. The likeliest place is lines 97-106 (`const Frame = ({ header, actions, children }: FrameProps) => (`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN fe9427fe-13 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-inspector/src/Layout.tsx:155`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 155-166 (`<Frame`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN fe9427fe-14 no-hand-rolled-lists `packages/plugins/plugin-inspector/src/Layout.tsx:167`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.83. The likeliest place is lines 167-178 (`{rows.map((row) => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN fe9427fe-15 stable-component-for-optional-content `packages/plugins/plugin-inspector/src/Layout.tsx:344`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.81. The likeliest place is lines 344-355 (`const SamplePicker = ({ plugin, space, sample, onSample }: SamplePickerProps)...`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN fe9427fe-16 stable-component-for-optional-content `packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemColumns.tsx:44`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.82. The likeliest place is lines 44-55 (`) : allActions.length > 1 ? (`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN fe9427fe-17 story-for-new-ui-component `packages/plugins/plugin-navtree/src/components/Sidebar/L0ItemActiveTabIndicator.tsx:10`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.92. The likeliest place is lines 10-18 (`export const L0ItemActiveTabIndicator = ({ classNames }: Util.ThemedClassName...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fe9427fe-18 no-casts `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:190`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 190-201 (`});`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN fe9427fe-19 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:378`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 378-389 (`<div className='grid place-items-center' data-testid='spacePlugin.addSpace'>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN fe9427fe-20 stable-component-for-optional-content `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:97`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.80. The likeliest place is lines 97-108 (`<Layout.Flex`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN fe9427fe-21 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:205`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 205-216 (`className='grid w-full items-center px-2 dx-app-drag dx-density-lg'`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN fe9427fe-22 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:205`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 205-216 (`className='grid w-full items-center px-2 dx-app-drag dx-density-lg'`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN fe9427fe-23 namespace-brand-key-prefixing `packages/plugins/plugin-navtree/src/constants.ts:1`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.94. The likeliest place is lines 1-16 (`import { DXN } from '@dxos/keys';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN fe9427fe-24 one-operation-per-navigation-intent `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:158`

System One judges this a likely violation of `one-operation-per-navigation-intent` (One operation call carries a navigation intent; don't chain operations that race), p=0.89. The likeliest place is lines 158-169 (`: 'closed'`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN fe9427fe-25 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:314`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 314-325 (`const workspaceChildren = useAtomValue(builder.graph.connections(tab, 'child'));`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN fe9427fe-26 subscribe-where-you-read `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:36`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.82. The likeliest place is lines 36-47 (`export const PipelineColumn = ({ data: column, location, classNames, debug }:...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN fe9427fe-27 extract-non-rendering-logic-from-component `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:48`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 48-59 (`Hooks.useAsyncEffect(async () => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN fe9427fe-28 use-context-scoped-cancellation `packages/plugins/plugin-sheet/src/model/useSheetModel.ts:29`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.84. The likeliest place is lines 29-43 (`const t = setTimeout(async () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `341bb91bea2b43152acc9688ecaa64879138e035`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 28 violations written to fragments, 270 uncertain, 995 clean, 0 unanswered
- left for an agentic reviewer: 100 batch(es)

```text
requests: 543 (159 verdicts re-asked with context the model requested)
estimated input tokens: 3619818
billed input tokens: 3425086 (cost $0.1439)
measured chars per token: 3.17
```

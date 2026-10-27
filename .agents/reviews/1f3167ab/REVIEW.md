---
branch: dm/eloquent-galileo-2ixpw5
commit: 1f3167ab4bee162997652ae4de370729c66aac35
base: 04d5fb15a8b5e81ebbabcfc78abdadb969765750
mode: fast
createdAt: 2026-10-27T05:36:09.882Z
isFinalized: true
groups: 275
rules: [barrel-imports-not-internal-paths, collections-use-standard-containers, containers-share-core-hooks, design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, event-handler-naming-convention, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, namespace-brand-key-prefixing, no-casts, no-styling-wrapper-divs, no-try-catch-in-effect-code, operations-resolve-database-from-service, stable-component-for-optional-content, story-for-new-ui-component, toolbars-are-menu-actions]
reviewId: 1f3167ab
---

_1 error(s), 25 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 1f3167ab-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/worker/features.ts:68
- 1f3167ab-2 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-projects/src/components/FeatureCanvas/FeatureCanvas.stories.tsx:102
- 1f3167ab-3 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/components/FeatureCanvas/FeatureCanvas.tsx:197
- 1f3167ab-4 - ignored - collections-use-standard-containers - packages/plugins/plugin-projects/src/components/FeatureCard/FeatureCard.stories.tsx:116
- 1f3167ab-5 - resolved - no-styling-wrapper-divs - packages/plugins/plugin-projects/src/components/FeatureCard/FeatureCard.stories.tsx:116
- 1f3167ab-6 - ignored - event-handler-naming-convention - packages/plugins/plugin-projects/src/components/FeatureCard/RequirementEditor.tsx:29
- 1f3167ab-7 - ignored - story-for-new-ui-component - packages/plugins/plugin-projects/src/components/FeatureCard/RequirementEditor.tsx:82
- 1f3167ab-8 - ignored - containers-share-core-hooks - packages/plugins/plugin-projects/src/components/FeatureKanban/FeatureKanban.tsx:151
- 1f3167ab-9 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/components/FeatureKanban/FeatureKanban.tsx:163
- 1f3167ab-10 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-projects/src/containers/FeatureCardContent/FeatureCardContent.stories.tsx:30
- 1f3167ab-11 - ignored - stable-component-for-optional-content - packages/plugins/plugin-projects/src/containers/FeatureCardContent/FeatureCardContent.tsx:18
- 1f3167ab-12 - ignored - story-for-new-ui-component - packages/plugins/plugin-projects/src/containers/FeatureCompanion/FeatureCompanion.tsx:38
- 1f3167ab-13 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-projects/src/containers/FeatureCompanion/FeatureCompanion.tsx:74
- 1f3167ab-14 - ignored - no-casts - packages/plugins/plugin-projects/src/containers/index.ts:34
- 1f3167ab-15 - resolved - no-styling-wrapper-divs - packages/plugins/plugin-projects/src/containers/ProjectFeatures/ProjectFeatures.stories.tsx:32
- 1f3167ab-16 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-projects/src/containers/ProjectFeatures/ProjectFeatures.stories.tsx:32
- 1f3167ab-17 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-projects/src/containers/ProjectFeatures/ProjectFeatures.tsx:230
- 1f3167ab-18 - ignored - stable-component-for-optional-content - packages/plugins/plugin-projects/src/containers/ProjectFeatures/ProjectFeatures.tsx:266
- 1f3167ab-19 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-projects/src/hooks/useFeatureGraph.ts:26
- 1f3167ab-20 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-projects/src/meta.ts:1
- 1f3167ab-21 - ignored - flat-layer-composition - packages/plugins/plugin-projects/src/operations/feature/feature.test.ts:28
- 1f3167ab-22 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-projects/src/testing/FeatureSeed.ts:39
- 1f3167ab-23 - ignored - barrel-imports-not-internal-paths - packages/plugins/plugin-projects/src/types/Feature.ts:1
- 1f3167ab-24 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-projects/src/types/FeatureMapView.ts:1
- 1f3167ab-25 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-projects/src/types/FeatureSpec.ts:1
- 1f3167ab-26 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-projects/src/types/LegacyFeature.ts:1

## Issues

# WARN 1f3167ab-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/worker/features.ts:68`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 68-79 (`export const FeaturesPartial: SampleSpace.Partial<FeaturesResult, FeaturesInp...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1f3167ab-2 no-styling-wrapper-divs `packages/plugins/plugin-projects/src/components/FeatureCanvas/FeatureCanvas.stories.tsx:102`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 102-113 (`max={10}`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1f3167ab-3 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/components/FeatureCanvas/FeatureCanvas.tsx:197`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 197-208 (`atomRegistry.subscribe(atoms.selection, (selection) => {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1f3167ab-4 collections-use-standard-containers `packages/plugins/plugin-projects/src/components/FeatureCard/FeatureCard.stories.tsx:116`

System One judges this a likely violation of `collections-use-standard-containers` (A collection of objects renders in a standard container — list, masonry, kanban, or canvas), p=0.90. The likeliest place is lines 116-127 (`const DefaultStory = ({ ids, features = SAMPLE_FEATURES, variant, onOpen }: S...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1f3167ab-5 no-styling-wrapper-divs `packages/plugins/plugin-projects/src/components/FeatureCard/FeatureCard.stories.tsx:116`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 116-127 (`const DefaultStory = ({ ids, features = SAMPLE_FEATURES, variant, onOpen }: S...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1f3167ab-6 event-handler-naming-convention `packages/plugins/plugin-projects/src/components/FeatureCard/RequirementEditor.tsx:29`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 29-40 (`const CommitField = ({ value, label, testId, autoFocus, onCommit }: CommitFie...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1f3167ab-7 story-for-new-ui-component `packages/plugins/plugin-projects/src/components/FeatureCard/RequirementEditor.tsx:82`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.85. The likeliest place is lines 82-93 (`export const RequirementEditor = ({ requirements, onChange }: RequirementEdit...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1f3167ab-8 containers-share-core-hooks `packages/plugins/plugin-projects/src/components/FeatureKanban/FeatureKanban.tsx:151`

System One judges this a likely violation of `containers-share-core-hooks` (A container builds on the shared container hooks, never its own navigation, selection or focus), p=0.83. The likeliest place is lines 151-162 (`export const FeatureKanban = Util.composable<HTMLDivElement, FeatureKanbanPro...`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1f3167ab-9 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/components/FeatureKanban/FeatureKanban.tsx:163`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 163-174 (`const [featuresAtom] = useState(() => Atom.make<readonly FeatureModel[]>(feat...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1f3167ab-10 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-projects/src/containers/FeatureCardContent/FeatureCardContent.stories.tsx:30`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 30-41 (`const DefaultStory = () => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1f3167ab-11 stable-component-for-optional-content `packages/plugins/plugin-projects/src/containers/FeatureCardContent/FeatureCardContent.tsx:18`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.81. The likeliest place is lines 18-31 (`export const FeatureCardContent = ({ subject }: FeatureCardContentProps) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1f3167ab-12 story-for-new-ui-component `packages/plugins/plugin-projects/src/containers/FeatureCompanion/FeatureCompanion.tsx:38`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.91. The likeliest place is lines 38-49 (`export const FeatureCompanion = ({ role, project, attendableId }: FeatureComp...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1f3167ab-13 toolbars-are-menu-actions `packages/plugins/plugin-projects/src/containers/FeatureCompanion/FeatureCompanion.tsx:74`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 74-85 (`<Panel.Root role={role} data-testid='feature-companion'>`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1f3167ab-14 no-casts `packages/plugins/plugin-projects/src/containers/index.ts:34`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 34-37 (`export const ProjectArticle: ComponentType<any> = lazy(() =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1f3167ab-15 no-styling-wrapper-divs `packages/plugins/plugin-projects/src/containers/ProjectFeatures/ProjectFeatures.stories.tsx:32`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 32-43 (`const DefaultStory = ({ attendableId }: StoryArgs) => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1f3167ab-16 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-projects/src/containers/ProjectFeatures/ProjectFeatures.stories.tsx:32`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 32-43 (`const DefaultStory = ({ attendableId }: StoryArgs) => {`, location confidence 0.75). Judged with added `siblings, test` context after a first pass of 0.74. This is a single-shot classifier: confirm against the rule before acting.

# WARN 1f3167ab-17 toolbars-are-menu-actions `packages/plugins/plugin-projects/src/containers/ProjectFeatures/ProjectFeatures.tsx:230`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.86. The likeliest place is lines 230-241 (`data-testid='feature-map.zoom-out'`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1f3167ab-18 stable-component-for-optional-content `packages/plugins/plugin-projects/src/containers/ProjectFeatures/ProjectFeatures.tsx:266`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.84. The likeliest place is lines 266-277 (`) : mode === 'kanban' ? (`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1f3167ab-19 no-try-catch-in-effect-code `packages/plugins/plugin-projects/src/hooks/useFeatureGraph.ts:26`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.81. The likeliest place is lines 26-38 (`const sourceOf = <R extends Relation.Unknown>(relation: R): Relation.SourceOf...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1f3167ab-20 namespace-brand-key-prefixing `packages/plugins/plugin-projects/src/meta.ts:1`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.80. The likeliest place is lines 1-16 (`import * as Plugin from '@dxos/app-framework/Plugin';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1f3167ab-21 flat-layer-composition `packages/plugins/plugin-projects/src/operations/feature/feature.test.ts:28`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 28-39 (`const testLayer = () =>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1f3167ab-22 operations-resolve-database-from-service `packages/plugins/plugin-projects/src/testing/FeatureSeed.ts:39`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.89. The likeliest place is lines 39-50 (`export const seed = (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1f3167ab-23 barrel-imports-not-internal-paths `packages/plugins/plugin-projects/src/types/Feature.ts:1`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.82. The likeliest place is lines 1-12 (`import * as Schema from 'effect/Schema';`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1f3167ab-24 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-projects/src/types/FeatureMapView.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-14 (`import * as Schema from 'effect/Schema';`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1f3167ab-25 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-projects/src/types/FeatureSpec.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.86. The likeliest place is lines 1-9 (`import type * as Feature from './Feature.ts';`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1f3167ab-26 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-projects/src/types/LegacyFeature.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-16 (`import * as Schema from 'effect/Schema';`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `04d5fb15a8b5e81ebbabcfc78abdadb969765750`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 26 violations written to fragments, 409 uncertain, 1939 clean, 0 unanswered
- left for an agentic reviewer: 105 batch(es)

```text
requests: 996 (267 verdicts re-asked with context the model requested)
estimated input tokens: 6189034
billed input tokens: 5684623 (cost $0.2388)
measured chars per token: 3.27
```

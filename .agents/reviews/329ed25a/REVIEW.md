---
branch: claude/projects-plugins-ontology-hlljzm
commit: 329ed25a4a1aa283ba670b11c79382ef2810f315
base: a7beb5124a8f975005450c4602de29c85b964e12
mode: fast
createdAt: 2026-10-19T07:10:05.263Z
isFinalized: true
groups: 254
rules: [atom-lifetime-bound-to-owner, effect-fn-not-hand-wrapped-gen, import-as-namespace-is-all-or-nothing, no-casts, no-echo-internal-in-sdk, no-styling-wrapper-divs, one-test-suite-per-module, operations-resolve-database-from-service, story-for-new-ui-component]
reviewId: 329ed25a
---

_1 error(s), 14 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 329ed25a-1 - unresolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-projects/src/capabilities/create-object.ts:30
- 329ed25a-2 - unresolved - no-styling-wrapper-divs - packages/plugins/plugin-projects/src/components/FeatureCanvas/FeatureCanvas.tsx:42
- 329ed25a-3 - unresolved - atom-lifetime-bound-to-owner - packages/plugins/plugin-projects/src/components/FeatureCanvas/FeatureCanvas.tsx:106
- 329ed25a-4 - unresolved - no-styling-wrapper-divs - packages/plugins/plugin-projects/src/components/FeatureCard/FeatureBoard.tsx:44
- 329ed25a-5 - unresolved - no-styling-wrapper-divs - packages/plugins/plugin-projects/src/components/FeatureCard/FeatureCard.stories.tsx:24
- 329ed25a-6 - unresolved - no-styling-wrapper-divs - packages/plugins/plugin-projects/src/components/FeatureCard/FeatureCard.tsx:149
- 329ed25a-7 - unresolved - story-for-new-ui-component - packages/plugins/plugin-projects/src/containers/FeatureCardContent/FeatureCardContent.tsx:18
- 329ed25a-8 - unresolved - no-casts - packages/plugins/plugin-projects/src/containers/index.ts:11
- 329ed25a-9 - unresolved - no-styling-wrapper-divs - packages/plugins/plugin-projects/src/containers/ShowcaseArticle/ShowcaseArticle.tsx:58
- 329ed25a-10 - unresolved - story-for-new-ui-component - packages/plugins/plugin-projects/src/containers/ShowcaseCardContent/ShowcaseCardContent.tsx:18
- 329ed25a-11 - unresolved - one-test-suite-per-module - packages/plugins/plugin-projects/src/operations/feature/feature.test.ts:42
- 329ed25a-12 - unresolved - operations-resolve-database-from-service - packages/plugins/plugin-projects/src/testing/FeatureSeed.ts:36
- 329ed25a-13 - unresolved - no-echo-internal-in-sdk - packages/plugins/plugin-projects/src/types/Feature.ts:1
- 329ed25a-14 - unresolved - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-projects/src/types/FeatureMap.ts:1
- 329ed25a-15 - unresolved - atom-lifetime-bound-to-owner - packages/ui/react-ui-canvas/src/model/projections/dynamic.ts:157

## Issues

# WARN 329ed25a-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-projects/src/capabilities/create-object.ts:30`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 30-41 (`export default Capability.makeModule(`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 329ed25a-2 no-styling-wrapper-divs `packages/plugins/plugin-projects/src/components/FeatureCanvas/FeatureCanvas.tsx:42`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 42-52 (`const FeatureNodeView = ({ node }: NodeViewProps) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 329ed25a-3 atom-lifetime-bound-to-owner `packages/plugins/plugin-projects/src/components/FeatureCanvas/FeatureCanvas.tsx:106`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.91. The likeliest place is lines 106-117 (`export const FeatureCanvas = ({ features, positions = {}, onPositionsChange }...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 329ed25a-4 no-styling-wrapper-divs `packages/plugins/plugin-projects/src/components/FeatureCard/FeatureBoard.tsx:44`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 44-55 (`return (`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 329ed25a-5 no-styling-wrapper-divs `packages/plugins/plugin-projects/src/components/FeatureCard/FeatureCard.stories.tsx:24`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 24-35 (`const DefaultStory = ({ ids, expanded, onSelectDependency }: StoryArgs) => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 329ed25a-6 no-styling-wrapper-divs `packages/plugins/plugin-projects/src/components/FeatureCard/FeatureCard.tsx:149`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 149-160 (`{relation && <Tag.Tag hue={RELATION_HUE[relation]}>{t(`feature-relation.${rel...`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 329ed25a-7 story-for-new-ui-component `packages/plugins/plugin-projects/src/containers/FeatureCardContent/FeatureCardContent.tsx:18`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.86. The likeliest place is lines 18-23 (`export const FeatureCardContent = ({ subject }: FeatureCardContentProps) => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 329ed25a-8 no-casts `packages/plugins/plugin-projects/src/containers/index.ts:11`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 11-14 (`export const FeatureArticle: ComponentType<any> = lazy(() =>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 329ed25a-9 no-styling-wrapper-divs `packages/plugins/plugin-projects/src/containers/ShowcaseArticle/ShowcaseArticle.tsx:58`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 58-69 (`<ScrollArea.Viewport classNames='flex flex-col gap-4 p-4'>`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 329ed25a-10 story-for-new-ui-component `packages/plugins/plugin-projects/src/containers/ShowcaseCardContent/ShowcaseCardContent.tsx:18`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.87. The likeliest place is lines 18-29 (`export const ShowcaseCardContent = ({ subject }: ShowcaseCardContentProps) => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 329ed25a-11 one-test-suite-per-module `packages/plugins/plugin-projects/src/operations/feature/feature.test.ts:42`

System One judges this a likely violation of `one-test-suite-per-module` (A module's tests live in its one test file; an operation's tests in a suite named after it), p=0.86. The likeliest place is lines 42-53 (`describe('feature operations', () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 329ed25a-12 operations-resolve-database-from-service `packages/plugins/plugin-projects/src/testing/FeatureSeed.ts:36`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.91. The likeliest place is lines 36-47 (`export const seed = (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 329ed25a-13 no-echo-internal-in-sdk `packages/plugins/plugin-projects/src/types/Feature.ts:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.80. The likeliest place is lines 1-12 (`import * as Schema from 'effect/Schema';`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 329ed25a-14 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-projects/src/types/FeatureMap.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-13 (`import * as Schema from 'effect/Schema';`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 329ed25a-15 atom-lifetime-bound-to-owner `packages/ui/react-ui-canvas/src/model/projections/dynamic.ts:157`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.86. The likeliest place is lines 157-168 (`export const createDynamicProjection = ({`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `a7beb5124a8f975005450c4602de29c85b964e12`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 15 violations written to fragments, 302 uncertain, 2005 clean, 0 unanswered
- left for an agentic reviewer: 82 batch(es)

```text
requests: 944 (223 verdicts re-asked with context the model requested)
estimated input tokens: 4506068
billed input tokens: 4097792 (cost $0.1721)
measured chars per token: 3.30
```

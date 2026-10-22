---
branch: dm/compassionate-carson-l2p1l5
commit: ab8475a302b174ca1219167eac706ecbcad96b65
base: 9d66bcd4eb0db0a525c2eaa101acbf7111984262
mode: fast
createdAt: 2026-10-22T11:41:32.873Z
isFinalized: true
groups: 133
rules: [design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, namespace-brand-key-prefixing, no-hand-rolled-lists, no-styling-wrapper-divs, story-for-new-ui-component]
reviewId: ab8475a3
---

_0 error(s), 11 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- ab8475a3-1 - resolved - no-styling-wrapper-divs - packages/plugins/plugin-code/src/components/ApiSurface/ApiSurface.tsx:99
- ab8475a3-2 - resolved - story-for-new-ui-component - packages/plugins/plugin-code/src/components/ApiSurface/ApiSurface.tsx:148
- ab8475a3-3 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-code/src/components/ChangelogGraph/decision-model.ts:110
- ab8475a3-4 - resolved - story-for-new-ui-component - packages/plugins/plugin-code/src/components/DataModelGraph/DataModelGraph.tsx:134
- ab8475a3-5 - resolved - no-styling-wrapper-divs - packages/plugins/plugin-code/src/components/DecisionLog/DecisionLog.tsx:25
- ab8475a3-6 - resolved - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-code/src/components/DecisionLog/DecisionLog.tsx:25
- ab8475a3-7 - resolved - no-hand-rolled-lists - packages/plugins/plugin-code/src/components/DecisionLog/DecisionLog.tsx:101
- ab8475a3-8 - resolved - story-for-new-ui-component - packages/plugins/plugin-code/src/components/DecisionLog/DecisionLog.tsx:119
- ab8475a3-9 - resolved - story-for-new-ui-component - packages/plugins/plugin-code/src/components/DefinitionGraph/DefinitionGraph.tsx:99
- ab8475a3-10 - resolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/components/DefinitionGraph/DefinitionGraph.tsx:99
- ab8475a3-11 - resolved - story-for-new-ui-component - packages/plugins/plugin-code/src/components/LatticeGraph/LatticeGraph.tsx:98

## Issues

# WARN ab8475a3-1 no-styling-wrapper-divs `packages/plugins/plugin-code/src/components/ApiSurface/ApiSurface.tsx:99`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 99-110 (`<div className='flex flex-col min-w-0'>`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN ab8475a3-2 story-for-new-ui-component `packages/plugins/plugin-code/src/components/ApiSurface/ApiSurface.tsx:148`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.92. The likeliest place is lines 148-159 (`export const ApiSurface = ({ content }: ApiSurfaceProps) => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN ab8475a3-3 namespace-brand-key-prefixing `packages/plugins/plugin-code/src/components/ChangelogGraph/decision-model.ts:110`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.86. The likeliest place is lines 110-121 (`kind: 'decision',`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN ab8475a3-4 story-for-new-ui-component `packages/plugins/plugin-code/src/components/DataModelGraph/DataModelGraph.tsx:134`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.91. The likeliest place is lines 134-145 (`export const DataModelGraph = ({ content }: DataModelGraphProps) => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN ab8475a3-5 no-styling-wrapper-divs `packages/plugins/plugin-code/src/components/DecisionLog/DecisionLog.tsx:25`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 25-36 (`const DecisionRow = ({ decision, selected }: { decision: DecisionModel; selec...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN ab8475a3-6 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-code/src/components/DecisionLog/DecisionLog.tsx:25`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 25-36 (`const DecisionRow = ({ decision, selected }: { decision: DecisionModel; selec...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN ab8475a3-7 no-hand-rolled-lists `packages/plugins/plugin-code/src/components/DecisionLog/DecisionLog.tsx:101`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.90. The likeliest place is lines 101-107 (`<DecisionRow key={decision.id} decision={decision} selected={decision.id === ...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN ab8475a3-8 story-for-new-ui-component `packages/plugins/plugin-code/src/components/DecisionLog/DecisionLog.tsx:119`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.93. The likeliest place is lines 119-130 (`export const DecisionLog = ({ content, selected }: DecisionLogProps) => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN ab8475a3-9 story-for-new-ui-component `packages/plugins/plugin-code/src/components/DefinitionGraph/DefinitionGraph.tsx:99`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.91. The likeliest place is lines 99-110 (`export const DefinitionGraph = ({ content, exclude = [], defaultAcceptance = ...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN ab8475a3-10 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/components/DefinitionGraph/DefinitionGraph.tsx:99`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 99-110 (`export const DefinitionGraph = ({ content, exclude = [], defaultAcceptance = ...`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN ab8475a3-11 story-for-new-ui-component `packages/plugins/plugin-code/src/components/LatticeGraph/LatticeGraph.tsx:98`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.90. The likeliest place is lines 98-109 (`export const LatticeGraph = ({`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `9d66bcd4eb0db0a525c2eaa101acbf7111984262`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 11 violations written to fragments, 146 uncertain, 826 clean, 0 unanswered
- left for an agentic reviewer: 56 batch(es)

```text
requests: 406 (80 verdicts re-asked with context the model requested)
estimated input tokens: 2346497
billed input tokens: 2231934 (cost $0.0937)
measured chars per token: 3.15
```

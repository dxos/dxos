---
branch: claude/sheet-cards-layout-d2f233
commit: 6e56cd8d697f51136b1617660a7be88d32c3cde4
base: 4fc0dc012d7365e4b9b3b3a72de0c49db75f0000
mode: fast
createdAt: 2026-11-20T18:26:08.167Z
isFinalized: true
groups: 133
rules: [design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, namespace-export-with-internal-hiding, no-casts, no-styling-wrapper-divs, no-try-catch-in-effect-code, reactive-state-via-atom-bridge, stable-component-for-optional-content, themed-primitives-take-classNames]
reviewId: 6e56cd8d697
---

_2 error(s), 9 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 6e56cd8d697-1 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-preview/src/cards/JsonCard.tsx:11
- 6e56cd8d697-2 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/components/SheetContent/fit.tsx:61
- 6e56cd8d697-3 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:163
- 6e56cd8d697-4 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:391
- 6e56cd8d697-5 - ignored - themed-primitives-take-classNames - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:403
- 6e56cd8d697-6 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-sheet/src/components/SheetContent/util.ts:147
- 6e56cd8d697-7 - ignored - stable-component-for-optional-content - packages/plugins/plugin-sheet/src/components/SheetPreview/SheetPreview.tsx:23
- 6e56cd8d697-8 - ignored - no-casts - packages/plugins/plugin-sheet/src/containers/index.ts:1
- 6e56cd8d697-9 - ignored - namespace-export-with-internal-hiding - packages/ui/react-ui-grid/src/index.ts:1
- 6e56cd8d697-10 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Card/Card.stories.tsx:96
- 6e56cd8d697-11 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/Card/Card.stories.tsx:337

## Issues

# WARN 6e56cd8d697-1 no-try-catch-in-effect-code `packages/plugins/plugin-preview/src/cards/JsonCard.tsx:11`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.84. The likeliest place is lines 11-22 (`export const JsonCard = ({ data }: { data: unknown }) => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6e56cd8d697-2 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/components/SheetContent/fit.tsx:61`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 61-72 (`export const FitBox = ({ width, height, children }: FitBoxProps) => {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 6e56cd8d697-3 no-casts `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:163`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 163-174 (`[model, editing],`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6e56cd8d697-4 extract-non-rendering-logic-from-component `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:391`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 391-402 (`},`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6e56cd8d697-5 themed-primitives-take-classNames `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:403`

System One judges this a likely violation of `themed-primitives-take-classNames` (Style a themed primitive through `classNames`, never `className`), p=0.80. The likeliest place is lines 403-414 (`useSelectThreadOnCellFocus();`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6e56cd8d697-6 reactive-state-via-atom-bridge `packages/plugins/plugin-sheet/src/components/SheetContent/util.ts:147`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.88. The likeliest place is lines 147-158 (`export const useSheetModelDxGridProps = (`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6e56cd8d697-7 stable-component-for-optional-content `packages/plugins/plugin-sheet/src/components/SheetPreview/SheetPreview.tsx:23`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.93. The likeliest place is lines 23-34 (`export const SheetPreview = ({ sheet, graph, chartTypes }: SheetPreviewProps)...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 6e56cd8d697-8 no-casts `packages/plugins/plugin-sheet/src/containers/index.ts:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 1-12 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6e56cd8d697-9 namespace-export-with-internal-hiding `packages/ui/react-ui-grid/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.96. The likeliest place is lines 1-11 (`export { defaultColSize, defaultRowSize } from '@dxos/lit-grid';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6e56cd8d697-10 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Card/Card.stories.tsx:96`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 96-107 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6e56cd8d697-11 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/Card/Card.stories.tsx:337`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 337-348 (`export const WrappingTitle: Story = {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `4fc0dc012d7365e4b9b3b3a72de0c49db75f0000`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 11 violations written to fragments, 201 uncertain, 803 clean, 0 unanswered
- left for an agentic reviewer: 70 batch(es)

```text
requests: 437 (122 verdicts re-asked with context the model requested)
estimated input tokens: 2602419
billed input tokens: 2509920 (cost $0.1054)
measured chars per token: 3.11
```

### Triage

All eleven findings are ignored. Each points at code that predates this branch or follows the local convention:

- 1: the `try` guards `JSON.stringify` in a React component, which is not Effect code.
- 2, 3, 4, 6: `FitBox`, `handleBlur`, the grid-instance effect and `useSheetModelDxGridProps` are unchanged from main.
- 5: `Grid.Content` takes `className` on main too; it is the lit grid's own prop.
- 7: the chart and grid previews are different components, chosen by whether the sheet has a chart.
- 8: every container in that file is a `lazy` export typed `ComponentType<any>`.
- 9: the barrel already re-exports each module by wildcard; `fit` follows its siblings.
- 10, 11: the flagged story lines are unchanged; this branch adds one poster story.

---
branch: claude/sheet-cards-layout-d2f233
commit: 3f77a56eb4c4dfd2ef4d37094de838132ed6b2a6
base: 4fc0dc012d7365e4b9b3b3a72de0c49db75f0000
mode: fast
createdAt: 2026-11-20T18:46:05.910Z
isFinalized: true
groups: 133
rules: [design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, namespace-export-with-internal-hiding, no-casts, no-styling-wrapper-divs, no-try-catch-in-effect-code, reactive-state-via-atom-bridge, stable-component-for-optional-content, themed-primitives-take-classNames]
reviewId: 3f77a56eb4c
---

_3 error(s), 10 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 3f77a56eb4c-1 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-preview/src/cards/JsonCard.tsx:14
- 3f77a56eb4c-2 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-preview/src/cards/JsonCard.tsx:38
- 3f77a56eb4c-3 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/components/SheetContent/fit.tsx:61
- 3f77a56eb4c-4 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:163
- 3f77a56eb4c-5 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:187
- 3f77a56eb4c-6 - ignored - themed-primitives-take-classNames - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:427
- 3f77a56eb4c-7 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/SheetContent/util.ts:59
- 3f77a56eb4c-8 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-sheet/src/components/SheetContent/util.ts:147
- 3f77a56eb4c-9 - ignored - stable-component-for-optional-content - packages/plugins/plugin-sheet/src/components/SheetPreview/SheetPreview.tsx:23
- 3f77a56eb4c-10 - ignored - no-casts - packages/plugins/plugin-sheet/src/containers/index.ts:1
- 3f77a56eb4c-11 - ignored - namespace-export-with-internal-hiding - packages/ui/react-ui-grid/src/index.ts:1
- 3f77a56eb4c-12 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Card/Card.stories.tsx:96
- 3f77a56eb4c-13 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/Card/Card.stories.tsx:337

## Issues

# WARN 3f77a56eb4c-1 no-try-catch-in-effect-code `packages/plugins/plugin-preview/src/cards/JsonCard.tsx:14`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 14-25 (`export const JsonCard = ({ data }: { data: unknown }) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3f77a56eb4c-2 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-preview/src/cards/JsonCard.tsx:38`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 38-45 (`<Card.Poster position='end' classNames='bg-group-surface'>`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3f77a56eb4c-3 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/components/SheetContent/fit.tsx:61`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 61-72 (`export const FitBox = ({ width, height, children }: FitBoxProps) => {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3f77a56eb4c-4 no-casts `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:163`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 163-174 (`[model, editing],`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3f77a56eb4c-5 extract-non-rendering-logic-from-component `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:187`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 187-198 (`const publishedSelection = useRef<string>(undefined);`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3f77a56eb4c-6 themed-primitives-take-classNames `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:427`

System One judges this a likely violation of `themed-primitives-take-classNames` (Style a themed primitive through `classNames`, never `className`), p=0.84. The likeliest place is lines 427-438 (`onFocus={handleFocus}`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3f77a56eb4c-7 no-casts `packages/plugins/plugin-sheet/src/components/SheetContent/util.ts:59`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 59-70 (`export const projectCellProps = (model: SheetModel, col: number, row: number)...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3f77a56eb4c-8 reactive-state-via-atom-bridge `packages/plugins/plugin-sheet/src/components/SheetContent/util.ts:147`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.89. The likeliest place is lines 147-158 (`export const useSheetModelDxGridProps = (`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3f77a56eb4c-9 stable-component-for-optional-content `packages/plugins/plugin-sheet/src/components/SheetPreview/SheetPreview.tsx:23`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.93. The likeliest place is lines 23-34 (`export const SheetPreview = ({ sheet, graph, chartTypes }: SheetPreviewProps)...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3f77a56eb4c-10 no-casts `packages/plugins/plugin-sheet/src/containers/index.ts:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 1-12 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3f77a56eb4c-11 namespace-export-with-internal-hiding `packages/ui/react-ui-grid/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.96. The likeliest place is lines 1-11 (`export { defaultColSize, defaultRowSize } from '@dxos/lit-grid';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3f77a56eb4c-12 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Card/Card.stories.tsx:96`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 96-107 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3f77a56eb4c-13 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/Card/Card.stories.tsx:337`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 337-348 (`export const WrappingTitle: Story = {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `4fc0dc012d7365e4b9b3b3a72de0c49db75f0000`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 13 violations written to fragments, 205 uncertain, 834 clean, 0 unanswered
- left for an agentic reviewer: 71 batch(es)

```text
requests: 453 (116 verdicts re-asked with context the model requested)
estimated input tokens: 2636168
billed input tokens: 2537541 (cost $0.1066)
measured chars per token: 3.12
```

### Triage

The eleven findings carried from `6e56cd8d697` stay ignored for the reasons given there: each points at code unchanged from main or at the file's existing convention.

- 2: `max-h-[200px]` matches `Card.Poster`'s fixed 200px cap in `card.css`, so the dump scrolls inside the poster instead of being clipped by it; the design system has no token for that cap.
- 7: `projectCellProps` gained only `export`; its body, cast-free, is unchanged from main.

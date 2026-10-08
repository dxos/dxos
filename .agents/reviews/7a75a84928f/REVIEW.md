---
branch: claude/canvas-style-property-sync-f6db46
commit: 7a75a84928f6e6d999f9b649dd5bb7c2d6ef5aa6
base: 3c4d73d4a0e727f910b272d1b5e07f969268f5ff
mode: fast
createdAt: 2026-10-08T16:59:41.863Z
isFinalized: true
groups: 143
rules: [design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, key-chords-live-in-the-table, no-styling-wrapper-divs, prefer-branded-types-over-raw-primitives, story-for-new-ui-component]
reviewId: 7a75a84928f
---

_1 error(s), 11 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 7a75a84928f-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx:71
- 7a75a84928f-2 - ignored - key-chords-live-in-the-table - packages/ui/react-ui-canvas/src/components/Layers/Layers.tsx:151
- 7a75a84928f-3 - ignored - story-for-new-ui-component - packages/ui/react-ui-canvas/src/components/Properties/LayerField.tsx:15
- 7a75a84928f-4 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Properties/Properties.stories.tsx:65
- 7a75a84928f-5 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas/src/components/Properties/Properties.stories.tsx:65
- 7a75a84928f-6 - resolved - prefer-branded-types-over-raw-primitives - packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.stories.tsx:18
- 7a75a84928f-7 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.stories.tsx:18
- 7a75a84928f-8 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.stories.tsx:18
- 7a75a84928f-9 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:549
- 7a75a84928f-10 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:781
- 7a75a84928f-11 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:41
- 7a75a84928f-12 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:61

## Issues

# WARN 7a75a84928f-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx:71`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 71-82 (`return () => next.dispose();`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a75a84928f-2 key-chords-live-in-the-table `packages/ui/react-ui-canvas/src/components/Layers/Layers.tsx:151`

System One judges this a likely violation of `key-chords-live-in-the-table` (Every chord is a KEY_BINDINGS entry, matched and labelled from it), p=0.85. The likeliest place is lines 151-162 (`classNames='py-[var(--dx-gutter)]'`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a75a84928f-3 story-for-new-ui-component `packages/ui/react-ui-canvas/src/components/Properties/LayerField.tsx:15`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.83. The likeliest place is lines 15-26 (`export const LayerField: FormFieldRenderer = ({ type, label, jsonPath, readon...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a75a84928f-4 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Properties/Properties.stories.tsx:65`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 65-77 (`return (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The story's two-column frame (panel beside its JSON state) is harness layout; react-ui has no Flex/Grid primitive, and Container is a subgrid for content, not a story frame.

# WARN 7a75a84928f-5 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas/src/components/Properties/Properties.stories.tsx:65`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 65-77 (`return (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a75a84928f-6 prefer-branded-types-over-raw-primitives `packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.stories.tsx:18`

System One judges this a likely violation of `prefer-branded-types-over-raw-primitives` (Type a domain value with its existing branded type, not a raw string), p=0.80. The likeliest place is lines 18-29 (`const DefaultStory = ({ indeterminate, readonly }: StoryArgs) => {`, location confidence 0.87). Judged with added `importers, imports` context after a first pass of 0.46. This is a single-shot classifier: confirm against the rule before acting.

**Resolved:** The story holds `StyleHue`, not `string`.

# WARN 7a75a84928f-7 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.stories.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 18-29 (`const DefaultStory = ({ indeterminate, readonly }: StoryArgs) => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The story's two-column frame (grid beside its JSON state) is harness layout; react-ui has no Flex/Grid primitive for it.

# WARN 7a75a84928f-8 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.stories.tsx:18`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 18-29 (`const DefaultStory = ({ indeterminate, readonly }: StoryArgs) => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The width sizes the story's frame, not a component.

# WARN 7a75a84928f-9 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:549`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 549-560 (`<LabelPart node={node} editing={editing} label={title} />`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a75a84928f-10 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:781`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 781-804 (`let best: { id: ElementId; opacity: number } | undefined;`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a75a84928f-11 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:41`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 41-52 (`hasClipboard: true,`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The column stacking the three toolbars is harness layout; react-ui has no Flex/Column primitive for it.

# WARN 7a75a84928f-12 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:61`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 61-70 (`const meta: Meta = {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The width sizes the story's frame (`withLayout`), not a component.

## Appendix

### System One pass

- model: jev-latest
- base for context: `3c4d73d4a0e727f910b272d1b5e07f969268f5ff`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 12 violations written to fragments, 188 uncertain, 1061 clean, 0 unanswered
- left for an agentic reviewer: 56 batch(es)

```text
requests: 540 (130 verdicts re-asked with context the model requested)
estimated input tokens: 4383873
billed input tokens: 4243532 (cost $0.1782)
measured chars per token: 3.10
```

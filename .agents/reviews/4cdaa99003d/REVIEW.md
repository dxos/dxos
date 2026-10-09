---
branch: claude/canvas-style-property-sync-f6db46
commit: 4cdaa99003d2115bc548a41b3a6de9b7ba53b42a
base: 3c4d73d4a0e727f910b272d1b5e07f969268f5ff
mode: fast
createdAt: 2026-10-08T17:28:21.242Z
isFinalized: true
groups: 189
rules: [design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, key-chords-live-in-the-table, no-casts, no-styling-wrapper-divs, story-for-new-ui-component]
reviewId: 4cdaa99003d
---

_4 error(s), 17 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 4cdaa99003d-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx:71
- 4cdaa99003d-2 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sequencer/src/components/CellGrid/CellGrid.stories.tsx:141
- 4cdaa99003d-3 - resolved - no-casts - packages/plugins/plugin-sequencer/src/components/CellGrid/CellGrid.stories.tsx:177
- 4cdaa99003d-4 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sequencer/src/components/CellGrid/CellGrid.tsx:156
- 4cdaa99003d-5 - ignored - story-for-new-ui-component - packages/plugins/plugin-sequencer/src/components/CellGrid/headers/Ruler.tsx:24
- 4cdaa99003d-6 - ignored - story-for-new-ui-component - packages/plugins/plugin-sequencer/src/components/CellGrid/headers/TrackHeader.tsx:27
- 4cdaa99003d-7 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sequencer/src/components/SequenceGrid/SequenceGrid.tsx:529
- 4cdaa99003d-8 - ignored - no-casts - packages/plugins/plugin-sequencer/src/components/SequenceGrid/SequenceGrid.tsx:565
- 4cdaa99003d-9 - ignored - no-casts - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:86
- 4cdaa99003d-10 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:302
- 4cdaa99003d-11 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:470
- 4cdaa99003d-12 - ignored - key-chords-live-in-the-table - packages/ui/react-ui-canvas/src/components/Layers/Layers.tsx:151
- 4cdaa99003d-13 - ignored - story-for-new-ui-component - packages/ui/react-ui-canvas/src/components/Properties/LayerField.tsx:15
- 4cdaa99003d-14 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Properties/Properties.stories.tsx:65
- 4cdaa99003d-15 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas/src/components/Properties/Properties.stories.tsx:65
- 4cdaa99003d-16 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.stories.tsx:18
- 4cdaa99003d-17 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.stories.tsx:18
- 4cdaa99003d-18 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:549
- 4cdaa99003d-19 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:781
- 4cdaa99003d-20 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:41
- 4cdaa99003d-21 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:61

## Issues

# WARN 4cdaa99003d-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx:71`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 71-82 (`return () => next.dispose();`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4cdaa99003d-2 extract-non-rendering-logic-from-component `packages/plugins/plugin-sequencer/src/components/CellGrid/CellGrid.stories.tsx:141`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 141-152 (`useEffect(() => {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing code this PR only moved from `react-ui-canvas/src/archive` into plugin-sequencer, unchanged.

# ERROR 4cdaa99003d-3 no-casts `packages/plugins/plugin-sequencer/src/components/CellGrid/CellGrid.stories.tsx:177`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 177-185 (`rows={rows}`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

**Resolved:** The story types its cells as one `StoryData` union, so the renderers and atoms need no cast.

# WARN 4cdaa99003d-4 extract-non-rendering-logic-from-component `packages/plugins/plugin-sequencer/src/components/CellGrid/CellGrid.tsx:156`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 156-167 (`useEffect(() => {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing code this PR only moved from `react-ui-canvas/src/archive` into plugin-sequencer, unchanged.

# WARN 4cdaa99003d-5 story-for-new-ui-component `packages/plugins/plugin-sequencer/src/components/CellGrid/headers/Ruler.tsx:24`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.91. The likeliest place is lines 24-35 (`export const Ruler = ({ viewport, headers, width, majorEvery = 4, classNames ...`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Moved unchanged; the `CellGrid` stories render the ruler as part of the grid.

# WARN 4cdaa99003d-6 story-for-new-ui-component `packages/plugins/plugin-sequencer/src/components/CellGrid/headers/TrackHeader.tsx:27`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 27-38 (`export const TrackHeader = ({ viewport, headers, rows, height, classNames }: ...`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Moved unchanged; the `CellGrid` stories render the track header as part of the grid.

# WARN 4cdaa99003d-7 extract-non-rendering-logic-from-component `packages/plugins/plugin-sequencer/src/components/SequenceGrid/SequenceGrid.tsx:529`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 529-540 (`useEffect(() => {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing; this PR changes only the file's import of `CellGrid`.

# ERROR 4cdaa99003d-8 no-casts `packages/plugins/plugin-sequencer/src/components/SequenceGrid/SequenceGrid.tsx:565`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 565-576 (`<CellGrid`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** False positive: the file has no cast; this PR changes only its import of `CellGrid`.

# ERROR 4cdaa99003d-9 no-casts `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:86`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 86-97 (`export const ScoreArticle = ({ role, subject, attendableId }: ScoreArticlePro...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** False positive: the file has no cast; this PR changes only its import of `ToggleMode`.

# WARN 4cdaa99003d-10 extract-non-rendering-logic-from-component `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:302`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 302-313 (`}`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing; this PR changes only the file's import of `ToggleMode`.

# WARN 4cdaa99003d-11 no-styling-wrapper-divs `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:470`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 470-481 (`<div`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing layout; this PR changes only the file's import of `ToggleMode`.

# ERROR 4cdaa99003d-12 key-chords-live-in-the-table `packages/ui/react-ui-canvas/src/components/Layers/Layers.tsx:151`

System One judges this a likely violation of `key-chords-live-in-the-table` (Every chord is a KEY_BINDINGS entry, matched and labelled from it), p=0.85. The likeliest place is lines 151-162 (`padBlock`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4cdaa99003d-13 story-for-new-ui-component `packages/ui/react-ui-canvas/src/components/Properties/LayerField.tsx:15`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.83. The likeliest place is lines 15-26 (`export const LayerField: FormFieldRenderer = ({ type, label, jsonPath, readon...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4cdaa99003d-14 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Properties/Properties.stories.tsx:65`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 65-77 (`return (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4cdaa99003d-15 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas/src/components/Properties/Properties.stories.tsx:65`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 65-77 (`return (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4cdaa99003d-16 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.stories.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 18-29 (`const DefaultStory = ({ indeterminate, readonly }: StoryArgs) => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4cdaa99003d-17 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.stories.tsx:18`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 18-29 (`const DefaultStory = ({ indeterminate, readonly }: StoryArgs) => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4cdaa99003d-18 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:549`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 549-560 (`<LabelPart node={node} editing={editing} label={title} />`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4cdaa99003d-19 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:781`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 781-804 (`let best: { id: ElementId; opacity: number } | undefined;`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4cdaa99003d-20 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:41`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 41-52 (`hasClipboard: true,`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4cdaa99003d-21 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:61`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 61-70 (`const meta: Meta = {`, location confidence 0.74). Judged with added `package, siblings` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `3c4d73d4a0e727f910b272d1b5e07f969268f5ff`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 21 violations written to fragments, 287 uncertain, 1731 clean, 0 unanswered
- left for an agentic reviewer: 62 batch(es)

```text
requests: 850 (188 verdicts re-asked with context the model requested)
estimated input tokens: 6184552
billed input tokens: 5994537 (cost $0.2518)
measured chars per token: 3.10
```

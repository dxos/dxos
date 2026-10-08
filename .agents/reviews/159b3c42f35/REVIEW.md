---
branch: claude/canvas-style-property-sync-f6db46
commit: 159b3c42f35d9eb5b1fc54728625122517a5e43c
base: 3c4d73d4a0e727f910b272d1b5e07f969268f5ff
mode: fast
createdAt: 2026-10-08T14:57:02.918Z
isFinalized: true
groups: 101
rules: [dependency-direction, design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, key-chords-live-in-the-table, no-styling-wrapper-divs, story-for-new-ui-component]
reviewId: 159b3c42f35
---

_1 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 159b3c42f35-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx:71
- 159b3c42f35-2 - ignored - dependency-direction - packages/plugins/plugin-canvas/src/model/content.ts:25
- 159b3c42f35-3 - ignored - key-chords-live-in-the-table - packages/ui/react-ui-canvas/src/components/Layers/Layers.tsx:62
- 159b3c42f35-4 - ignored - story-for-new-ui-component - packages/ui/react-ui-canvas/src/components/Properties/LayerField.tsx:15
- 159b3c42f35-5 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas/src/components/Properties/Properties.stories.tsx:51
- 159b3c42f35-6 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:534
- 159b3c42f35-7 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:778

## Issues

# WARN 159b3c42f35-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx:71`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 71-82 (`return () => next.dispose();`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing: the canvas binding effect predates this PR, which only adds the layers panel to the article.

# WARN 159b3c42f35-2 dependency-direction `packages/plugins/plugin-canvas/src/model/content.ts:25`

System One judges this a likely violation of `dependency-direction` (Lower-level packages never import from higher-level ones), p=0.81. The likeliest place is lines 25-32 (`type StyleMap,`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** plugin-canvas already depends on the engine's `/scene` exports; the layer schema is one more of them.

# ERROR 159b3c42f35-3 key-chords-live-in-the-table `packages/ui/react-ui-canvas/src/components/Layers/Layers.tsx:62`

System One judges this a likely violation of `key-chords-live-in-the-table` (Every chord is a KEY_BINDINGS entry, matched and labelled from it), p=0.87. The likeliest place is lines 62-73 (`aria-label='Layer name'`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Enter and Escape in the rename input are the text field's commit and cancel, not canvas shortcuts, so they are not `KEY_BINDINGS` entries.

# WARN 159b3c42f35-4 story-for-new-ui-component `packages/ui/react-ui-canvas/src/components/Properties/LayerField.tsx:15`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.82. The likeliest place is lines 15-26 (`export const LayerField: FormFieldRenderer = ({ type, label, jsonPath, readon...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Covered by the new `Properties` stories, whose Test asserts the layer combobox.

# WARN 159b3c42f35-5 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas/src/components/Properties/Properties.stories.tsx:51`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 51-62 (`const DefaultStory = ({ select }: StoryArgs) => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The class sizes the story's frame, not a component.

# WARN 159b3c42f35-6 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:534`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 534-545 (`<LabelPart node={node} editing={editing} label={title} />`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing portal body layout; unchanged by this PR.

# WARN 159b3c42f35-7 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:778`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 778-801 (`let best: { id: ElementId; opacity: number } | undefined;`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing focus memo; unchanged by this PR.

## Appendix

### System One pass

- model: jev-latest
- base for context: `3c4d73d4a0e727f910b272d1b5e07f969268f5ff`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 7 violations written to fragments, 119 uncertain, 642 clean, 0 unanswered
- left for an agentic reviewer: 45 batch(es)

```text
requests: 311 (63 verdicts re-asked with context the model requested)
estimated input tokens: 2782917
billed input tokens: 2680959 (cost $0.1126)
measured chars per token: 3.11
```

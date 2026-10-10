---
branch: claude/canvas-style-property-sync-f6db46
commit: 8e7aa5a6c0a2f2d134aeb2e380c4acff2a4d70cf
base: 0e28f43bf843c6770b2d290a234f5c942ce2e547
mode: fast
createdAt: 2026-10-08T14:18:16.893Z
isFinalized: true
groups: 155
rules: [extract-non-rendering-logic-from-component, import-as-namespace-is-all-or-nothing, named-react-imports, no-sleep-in-test, no-styling-wrapper-divs, story-for-new-ui-component]
reviewId: 8e7aa5a6c0a
---

_0 error(s), 9 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 8e7aa5a6c0a-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx:71
- 8e7aa5a6c0a-2 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-canvas/src/containers/CanvasArticle/NodeTypePlugin.stories.tsx:44
- 8e7aa5a6c0a-3 - ignored - no-sleep-in-test - packages/plugins/plugin-canvas/src/model/store.test.ts:88
- 8e7aa5a6c0a-4 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-uml/src/types/ClassNode.ts:1
- 8e7aa5a6c0a-5 - ignored - story-for-new-ui-component - packages/ui/react-ui-canvas/src/components/Properties/ClassField.tsx:18
- 8e7aa5a6c0a-6 - ignored - story-for-new-ui-component - packages/ui/react-ui-canvas/src/components/Properties/SceneField.tsx:15
- 8e7aa5a6c0a-7 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.tsx:1
- 8e7aa5a6c0a-8 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:522
- 8e7aa5a6c0a-9 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:251

## Issues

# WARN 8e7aa5a6c0a-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx:71`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 71-82 (`return () => next.dispose();`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing: the canvas binding effect predates this PR, which only changed the property overrides.

# WARN 8e7aa5a6c0a-2 no-styling-wrapper-divs `packages/plugins/plugin-canvas/src/containers/CanvasArticle/NodeTypePlugin.stories.tsx:44`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 44-57 (`const TaskNodeView = ({ node, editing }: NodeViewProps) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** A node view fills its frame (`dx-cover`), as the UML class view does; the story's mock type follows the same shape contract.

# WARN 8e7aa5a6c0a-3 no-sleep-in-test `packages/plugins/plugin-canvas/src/model/store.test.ts:88`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.96. The likeliest place is lines 88-99 (`await new Promise((resolve) => setTimeout(resolve, 100));`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing test (from #13778): it asserts a load that must never resolve, which has no event to await.

# WARN 8e7aa5a6c0a-4 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-uml/src/types/ClassNode.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-14 (`import * as Schema from 'effect/Schema';`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The module is already marked `@import-as-namespace` and is imported only as a namespace.

# WARN 8e7aa5a6c0a-5 story-for-new-ui-component `packages/ui/react-ui-canvas/src/components/Properties/ClassField.tsx:18`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.88. The likeliest place is lines 18-29 (`export const ClassField: FormFieldRenderer = ({ type, label, jsonPath, readon...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** A form field renderer, exercised through the properties panel in the SceneView stories (Scenes).

# WARN 8e7aa5a6c0a-6 story-for-new-ui-component `packages/ui/react-ui-canvas/src/components/Properties/SceneField.tsx:15`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.87. The likeliest place is lines 15-23 (`export const SceneField: FormFieldRenderer = (props) => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** A form field renderer, exercised through the properties panel in the SceneView stories (Scenes).

# WARN 8e7aa5a6c0a-7 named-react-imports `packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.tsx:1`

System One judges this a likely violation of `named-react-imports` (Import React members by name, never through a `React.` namespace), p=0.97. The likeliest place is lines 1-19 (`import React from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The file imports only the default `React` for JSX; it uses no `React.*` hook.

# WARN 8e7aa5a6c0a-8 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:522`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 522-533 (`<LabelPart node={node} editing={editing} label={title} />`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing portal body layout; this PR did not change that element.

# WARN 8e7aa5a6c0a-9 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:251`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 251-274 (`const timeout = setTimeout(() => onCameraChange(camera), CAMERA_SETTLE_MS);`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing camera-report effect; unchanged by this PR.

## Appendix

### System One pass

- model: jev-latest
- base for context: `0e28f43bf843c6770b2d290a234f5c942ce2e547`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 9 violations written to fragments, 216 uncertain, 1335 clean, 0 unanswered
- left for an agentic reviewer: 61 batch(es)

```text
requests: 635 (143 verdicts re-asked with context the model requested)
estimated input tokens: 4683439
billed input tokens: 4435275 (cost $0.1863)
measured chars per token: 3.17
```

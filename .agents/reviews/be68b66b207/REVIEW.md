---
branch: claude/canvas-style-property-sync-f6db46
commit: be68b66b207c51d69dd3a9bf1f3b96cfa2eeb57e
base: fe8283496f0b5cc38b83acc32159464615afbc09
mode: fast
createdAt: 2026-10-07T22:49:57.471Z
isFinalized: true
groups: 99
rules: [extract-non-rendering-logic-from-component, named-react-imports, no-styling-wrapper-divs]
reviewId: be68b66b207
---

_0 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- be68b66b207-1 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.tsx:1
- be68b66b207-2 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:481
- be68b66b207-3 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:228
- be68b66b207-4 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:187
- be68b66b207-5 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:52

## Issues

# WARN be68b66b207-1 named-react-imports `packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.tsx:1`

System One judges this a likely violation of `named-react-imports` (Import React members by name, never through a `React.` namespace), p=0.97. The likeliest place is lines 1-19 (`import React from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN be68b66b207-2 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:481`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 481-492 (`</span>`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN be68b66b207-3 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:228`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 228-251 (`useLayoutEffect(() => {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN be68b66b207-4 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:187`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 187-198 (`const fiber = Effect.runFork(`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN be68b66b207-5 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:52`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 52-62 (`<NavigationToolbar actions={actions} />`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### Triage

- be68b66b207-1 ignored: `StyleGrid.tsx` imports React as the JSX runtime, as every component file in the package does; its hooks are named imports.
- be68b66b207-2 ignored: the positioned div is the nested scene's transform layer (it carries `portalTransform`), not a styling wrapper.
- be68b66b207-3 ignored: the camera restore and fit effects belong to `SceneView.Root`'s lifecycle; a hook would move the same lines.
- be68b66b207-4 ignored: the flagged story logic predates this PR.
- be68b66b207-5 ignored: the toolbar story's layout column predates this PR, which only dropped the depth readout from it.

### System One pass

- model: jev-latest
- base for context: `fe8283496f0b5cc38b83acc32159464615afbc09`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 148 uncertain, 713 clean, 0 unanswered
- left for an agentic reviewer: 56 batch(es)

```text
requests: 369 (101 verdicts re-asked with context the model requested)
estimated input tokens: 3003187
billed input tokens: 2902905 (cost $0.1219)
measured chars per token: 3.10
```

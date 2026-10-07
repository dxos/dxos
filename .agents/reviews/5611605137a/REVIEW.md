---
branch: claude/canvas-style-property-sync-f6db46
commit: 5611605137a1166f829a9437b4bddaa492d8e5d8
base: 18f1c9ebdd406f55b44a20a0fe3932a38f68f62c
mode: fast
createdAt: 2026-10-07T04:54:20.693Z
isFinalized: true
groups: 147
rules: [extract-non-rendering-logic-from-component, named-react-imports, no-styling-wrapper-divs, story-for-new-ui-component]
reviewId: 5611605137a
---

_0 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 5611605137a-1 - ignored - story-for-new-ui-component - packages/ui/react-ui-canvas/src/components/LatticeGrid/LatticeGrid.tsx:25
- 5611605137a-2 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.tsx:1
- 5611605137a-3 - resolved - story-for-new-ui-component - packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.tsx:46
- 5611605137a-4 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:336
- 5611605137a-5 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:187
- 5611605137a-6 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:52

## Issues

# WARN 5611605137a-1 story-for-new-ui-component `packages/ui/react-ui-canvas/src/components/LatticeGrid/LatticeGrid.tsx:25`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.90. The likeliest place is lines 25-36 (`export const LatticeGrid = memo(({ spec, bounds, unit }: LatticeGridProps) => {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5611605137a-2 named-react-imports `packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.tsx:1`

System One judges this a likely violation of `named-react-imports` (Import React members by name, never through a `React.` namespace), p=0.96. The likeliest place is lines 1-19 (`import React from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5611605137a-3 story-for-new-ui-component `packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.tsx:46`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.88. The likeliest place is lines 46-57 (`export const StyleGrid = ({ hue, tone = DEFAULT_TONE, indeterminate, readonly...`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5611605137a-4 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:336`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 336-347 (`export const ClassNodeView = ({ node, editing }: NodeViewProps) => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5611605137a-5 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:187`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 187-198 (`const fiber = Effect.runFork(`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5611605137a-6 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:52`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 52-61 (`<ActionToolbar actions={actions} nodes={defaultNodeRegistry} capabilities={fr...`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### Triage

- 5611605137a-1 ignored: `LatticeGrid` renders only inside the canvas; the SceneView Lattice story covers it.
- 5611605137a-2 ignored: false positive; `StyleGrid.tsx` imports React for JSX and names no `React.` member.
- 5611605137a-3 resolved: added `StyleGrid.stories.tsx`.
- 5611605137a-4 ignored: `ClassNodeView` predates this PR and is unchanged by it.
- 5611605137a-5 ignored: the `Scored` story's effect fork predates this PR and is unchanged by it.
- 5611605137a-6 ignored: the Toolbar story's column wrapper predates this PR; only its toggles changed.

### System One pass

- model: jev-latest
- base for context: `18f1c9ebdd406f55b44a20a0fe3932a38f68f62c`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 182 uncertain, 1372 clean, 0 unanswered
- left for an agentic reviewer: 52 batch(es)

```text
requests: 614 (130 verdicts re-asked with context the model requested)
estimated input tokens: 4534789
billed input tokens: 4342356 (cost $0.1824)
measured chars per token: 3.13
```

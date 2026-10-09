---
branch: claude/canvas-style-property-sync-f6db46
commit: 64804b77f686cf9d130fe66ea96dfd5db79bf6fa
base: 5af9e928bfaf0449e692406fb4c12a4984cdf1e3
mode: fast
createdAt: 2026-10-09T19:17:16.193Z
isFinalized: true
groups: 60
rules: [extract-non-rendering-logic-from-component, key-chords-live-in-the-table, named-react-imports, story-for-new-ui-component]
reviewId: 64804b77f68
---

_1 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 64804b77f68-1 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/DockToggle/DockToggle.tsx:1
- 64804b77f68-2 - resolved - story-for-new-ui-component - packages/ui/react-ui-canvas/src/components/DockToggle/DockToggle.tsx:16
- 64804b77f68-3 - ignored - key-chords-live-in-the-table - packages/ui/react-ui-canvas/src/components/Layers/Layers.tsx:155
- 64804b77f68-4 - resolved - story-for-new-ui-component - packages/ui/react-ui-canvas/src/components/SceneView/Dock.tsx:83
- 64804b77f68-5 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:782

## Issues

# WARN 64804b77f68-1 named-react-imports `packages/ui/react-ui-canvas/src/components/DockToggle/DockToggle.tsx:1`

System One judges this a likely violation of `named-react-imports` (Import React members by name, never through a `React.` namespace), p=0.97. The likeliest place is lines 1-9 (`import React from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 64804b77f68-2 story-for-new-ui-component `packages/ui/react-ui-canvas/src/components/DockToggle/DockToggle.tsx:16`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.87. The likeliest place is lines 16-29 (`export const DockToggle = ({ docked, onDockedChange }: DockToggleProps) => (`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

**Resolved:** Covered by the `SceneView` `Docked` story, whose play test exercises the dock's sections, a collapse, and the toggle that floats the panels.

# ERROR 64804b77f68-3 key-chords-live-in-the-table `packages/ui/react-ui-canvas/src/components/Layers/Layers.tsx:155`

System One judges this a likely violation of `key-chords-live-in-the-table` (Every chord is a KEY_BINDINGS entry, matched and labelled from it), p=0.86. The likeliest place is lines 155-166 (`<OrderedList.Content`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 64804b77f68-4 story-for-new-ui-component `packages/ui/react-ui-canvas/src/components/SceneView/Dock.tsx:83`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.82. The likeliest place is lines 83-94 (`export const Dock = () => {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

**Resolved:** Covered by the `SceneView` `Docked` story, whose play test exercises the dock's sections, a collapse, and the toggle that floats the panels.

# WARN 64804b77f68-5 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:782`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 782-805 (`let best: { id: ElementId; opacity: number } | undefined;`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `5af9e928bfaf0449e692406fb4c12a4984cdf1e3`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 124 uncertain, 167 clean, 0 unanswered
- left for an agentic reviewer: 46 batch(es)

```text
requests: 187 (85 verdicts re-asked with context the model requested)
estimated input tokens: 1788347
billed input tokens: 1792851 (cost $0.0753)
measured chars per token: 2.99
```

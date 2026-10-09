---
branch: claude/canvas-style-property-sync-f6db46
commit: b0c48016f4ec8bea66c590fd4dc30fb953587c63
base: 5af9e928bfaf0449e692406fb4c12a4984cdf1e3
mode: fast
createdAt: 2026-10-09T19:15:12.490Z
isFinalized: true
groups: 61
rules: [extract-non-rendering-logic-from-component, key-chords-live-in-the-table, named-react-imports, no-styling-wrapper-divs, story-for-new-ui-component]
reviewId: b0c48016f4e
---

_1 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- b0c48016f4e-1 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/DockToggle/DockToggle.tsx:1
- b0c48016f4e-2 - resolved - story-for-new-ui-component - packages/ui/react-ui-canvas/src/components/DockToggle/DockToggle.tsx:16
- b0c48016f4e-3 - ignored - key-chords-live-in-the-table - packages/ui/react-ui-canvas/src/components/Layers/Layers.tsx:155
- b0c48016f4e-4 - resolved - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/SceneView/Dock.tsx:83
- b0c48016f4e-5 - resolved - story-for-new-ui-component - packages/ui/react-ui-canvas/src/components/SceneView/Dock.tsx:83
- b0c48016f4e-6 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:782

## Issues

# WARN b0c48016f4e-1 named-react-imports `packages/ui/react-ui-canvas/src/components/DockToggle/DockToggle.tsx:1`

System One judges this a likely violation of `named-react-imports` (Import React members by name, never through a `React.` namespace), p=0.97. The likeliest place is lines 1-9 (`import React from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** False positive: the default `React` import is for JSX; members are imported by name.

# WARN b0c48016f4e-2 story-for-new-ui-component `packages/ui/react-ui-canvas/src/components/DockToggle/DockToggle.tsx:16`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 16-29 (`export const DockToggle = ({ docked, onDockedChange }: DockToggleProps) => (`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

**Resolved:** The `SceneView` `Docked` story's play test floats the panels through the toggle.

# ERROR b0c48016f4e-3 key-chords-live-in-the-table `packages/ui/react-ui-canvas/src/components/Layers/Layers.tsx:155`

System One judges this a likely violation of `key-chords-live-in-the-table` (Every chord is a KEY_BINDINGS entry, matched and labelled from it), p=0.86. The likeliest place is lines 155-166 (`<OrderedList.Content`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing Enter handler; this change only passes `scroll` to the list.

# WARN b0c48016f4e-4 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneView/Dock.tsx:83`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 83-94 (`export const Dock = () => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

**Resolved:** The dock column is the `ScrollArea.Root` itself; the wrapper div is gone.

# WARN b0c48016f4e-5 story-for-new-ui-component `packages/ui/react-ui-canvas/src/components/SceneView/Dock.tsx:83`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.86. The likeliest place is lines 83-94 (`export const Dock = () => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

**Resolved:** The `SceneView` `Docked` story's play test covers the dock: its sections, a collapse, and floating.

# WARN b0c48016f4e-6 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:782`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 782-805 (`let best: { id: ElementId; opacity: number } | undefined;`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** Pre-existing focus memo; this change does not touch it.

## Appendix

### System One pass

- model: jev-latest
- base for context: `5af9e928bfaf0449e692406fb4c12a4984cdf1e3`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 117 uncertain, 141 clean, 0 unanswered
- left for an agentic reviewer: 44 batch(es)

```text
requests: 172 (82 verdicts re-asked with context the model requested)
estimated input tokens: 1660415
billed input tokens: 1658468 (cost $0.0697)
measured chars per token: 3.00
```

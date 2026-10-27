---
branch: dm/canvas-svg-renderer
commit: f94b8c6b9171ceeb3c431c5c88f7eba74fb4e7b7
base: a843e27d387463aa920acf45457e5e35947571fa
mode: fast
createdAt: 2026-10-19T18:03:39.718Z
isFinalized: true
groups: 153
rules: [no-casts, no-styling-wrapper-divs]
reviewId: f94b8c6b
---

_1 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- f94b8c6b-1 - ignored - no-casts - packages/common/diagram/src/uml-grid.ts:423
- f94b8c6b-2 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:1092

## Issues

# ERROR f94b8c6b-1 no-casts `packages/common/diagram/src/uml-grid.ts:423`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 423-434 (`const to = rects.get(relation.to)!;`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN f94b8c6b-2 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:1092`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 1092-1115 (`{Object.keys(child.nodes).length} nodes · {Object.keys(child.links).length} l...`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `a843e27d387463aa920acf45457e5e35947571fa`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 178 uncertain, 739 clean, 0 unanswered
- left for an agentic reviewer: 78 batch(es)

```text
requests: 396 (114 verdicts re-asked with context the model requested)
estimated input tokens: 4122367
billed input tokens: 3963647 (cost $0.1665)
measured chars per token: 3.12
```

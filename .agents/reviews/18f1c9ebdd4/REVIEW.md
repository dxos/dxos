---
branch: claude/canvas-style-property-sync-f6db46
commit: 18f1c9ebdd406f55b44a20a0fe3932a38f68f62c
base: 88d7714d032359edaad176b7b93ffbce6ff15b0a
mode: fast
createdAt: 2026-10-06T15:40:20.109Z
isFinalized: true
groups: 99
rules: [no-styling-wrapper-divs]
reviewId: 18f1c9ebdd4
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 18f1c9ebdd4-1 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Palette/Palette.tsx:79
- 18f1c9ebdd4-2 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:52

## Issues

# WARN 18f1c9ebdd4-1 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Palette/Palette.tsx:79`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 79-90 (`export const Palette = ({ tool, nodes, links, capabilities, onToolChange }: P...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 18f1c9ebdd4-2 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:52`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 52-57 (`</CameraToolbar>`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `88d7714d032359edaad176b7b93ffbce6ff15b0a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 130 uncertain, 731 clean, 0 unanswered
- left for an agentic reviewer: 51 batch(es)

```text
requests: 345 (74 verdicts re-asked with context the model requested)
estimated input tokens: 2618417
billed input tokens: 2498817 (cost $0.1050)
measured chars per token: 3.14
```

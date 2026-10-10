---
branch: claude/react-ui-next-design-4db6eb
commit: 4829c5fd6a085f21b35184fa8235e7ec9d6f7e77
base: 47c3ff7f1c2fcb2247b71a0911fcc7b666c73742
mode: fast
createdAt: 2026-10-04T13:22:17.357Z
isFinalized: true
groups: 43
rules: [no-styling-wrapper-divs]
reviewId: 4829c5fd6a0
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 4829c5fd6a0-1 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:40

## Issues

# WARN 4829c5fd6a0-1 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:40`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 40-51 (`const Pane = ({ prefix, mode, width, native }: PaneProps) => (`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `47c3ff7f1c2fcb2247b71a0911fcc7b666c73742`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 15 uncertain, 23 clean, 0 unanswered
- left for an agentic reviewer: 19 batch(es)

```text
requests: 24 (8 verdicts re-asked with context the model requested)
estimated input tokens: 142646
billed input tokens: 139380 (cost $0.0059)
measured chars per token: 3.07
```

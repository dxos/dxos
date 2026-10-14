---
branch: claude/react-ui-next-design-4db6eb
commit: 5594031ab92247c91c387af4f0ca1a3a3899ce2a
base: 4a515a486c52686f1de565880fcacb70ac08a80c
mode: fast
createdAt: 2026-10-06T07:03:47.131Z
isFinalized: true
groups: 60
rules: [no-styling-wrapper-divs]
reviewId: 5594031ab92
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 5594031ab92-1 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx:68

## Issues

# WARN 5594031ab92-1 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx:68`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 68-79 (`const DefaultStory = () => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `4a515a486c52686f1de565880fcacb70ac08a80c`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 71 uncertain, 76 clean, 0 unanswered
- left for an agentic reviewer: 43 batch(es)

```text
requests: 91 (41 verdicts re-asked with context the model requested)
estimated input tokens: 507657
billed input tokens: 500259 (cost $0.0210)
measured chars per token: 3.04
```

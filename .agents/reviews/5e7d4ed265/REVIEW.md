---
branch: claude/ai-service-mock-storybook-90afd6
commit: 5e7d4ed265492720e0e27f4b02833862032f3c4a
base: c7f301c3c97a6ab1280d6e5e071601f853b3ccb8
mode: fast
createdAt: 2026-09-27T20:25:28.007Z
isFinalized: true
groups: 41
rules: [no-styling-wrapper-divs]
reviewId: 5e7d4ed265
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 5e7d4ed265-1 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/playground/experimental.stories.tsx:144

## Issues

# WARN 5e7d4ed265-1 no-styling-wrapper-divs `packages/ui/react-ui/src/playground/experimental.stories.tsx:144`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 144-155 (`<div className='grid grid-cols-[min-content_1fr] gap-1'>`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `c7f301c3c97a6ab1280d6e5e071601f853b3ccb8`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 11 uncertain, 25 clean, 0 unanswered

```text
requests: 21 (5 verdicts re-asked with context the model requested)
estimated input tokens: 104251
billed input tokens: 106219 (cost $0.0045)
measured chars per token: 2.94
```

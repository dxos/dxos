---
branch: claude/ai-service-mock-storybook-90afd6
commit: c7f301c3c97a6ab1280d6e5e071601f853b3ccb8
base: 9c6b52066b1fef0f43b9351073a04d30f096cf41
mode: fast
createdAt: 2026-09-27T20:08:09.166Z
isFinalized: true
groups: 41
rules: [no-styling-wrapper-divs]
reviewId: c7f301c3c9
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- c7f301c3c9-1 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/playground/experimental.stories.tsx:61

## Issues

# WARN c7f301c3c9-1 no-styling-wrapper-divs `packages/ui/react-ui/src/playground/experimental.stories.tsx:61`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 61-72 (`const Toolbar = ({ children, size = 'md' }: PropsWithChildren<{ size?: Size }...`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `9c6b52066b1fef0f43b9351073a04d30f096cf41`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 9 uncertain, 27 clean, 0 unanswered

```text
requests: 18 (3 verdicts re-asked with context the model requested)
estimated input tokens: 84585
billed input tokens: 85809 (cost $0.0036)
measured chars per token: 2.96
```

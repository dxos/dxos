---
branch: claude/ai-service-mock-storybook-90afd6
commit: 40b2a8e832d3991890f94b39ccfd5a07c16fd2b1
base: 91d8fd72b2f298150d6a1aefb53b2c9c819d406f
mode: fast
createdAt: 2026-09-28T07:12:00.221Z
isFinalized: true
groups: 57
rules: [no-styling-wrapper-divs]
reviewId: 40b2a8e832
---

_0 error(s), 1 warning(s)._

# WARN 40b2a8e832-1 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components.tsx:39`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 39-50 (`export const Toolbar = ({ children, size = 'md' }: PropsWithChildren<{ size?:...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

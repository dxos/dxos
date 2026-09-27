---
branch: claude/ai-service-mock-storybook-90afd6
commit: 9c6b52066b1fef0f43b9351073a04d30f096cf41
base: b3e304f94044029e65bb8fcdfed4907ad984119d
mode: fast
createdAt: 2026-09-27T19:53:14.150Z
isFinalized: true
groups: 54
rules: [no-styling-wrapper-divs]
reviewId: 9c6b52066b
---

_0 error(s), 1 warning(s)._

# WARN 9c6b52066b-1 no-styling-wrapper-divs `packages/ui/react-ui/src/playground/experimental.stories.tsx:49`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 49-60 (`const Toolbar = ({ children, size = 'md' }: PropsWithChildren<{ size?: Size }...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

---
branch: claude/ai-service-mock-storybook-90afd6
commit: b3e304f94044029e65bb8fcdfed4907ad984119d
base: 7e95a014fc1ddd747c29ed6112ee3a7335ed3bbb
mode: fast
createdAt: 2026-09-27T16:39:51.389Z
isFinalized: true
groups: 71
rules: [effect-fn-not-hand-wrapped-gen, no-casts, no-styling-wrapper-divs]
reviewId: b3e304f940
---

_1 error(s), 2 warning(s)._

# WARN b3e304f940-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/walkthrough/generate.ts:82`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 82-93 (`export const generateWalkthrough = <R = never>({`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b3e304f940-2 no-casts `packages/plugins/plugin-github/src/walkthrough/plan.test.ts:134`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 134-143 (`)!;`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN b3e304f940-3 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:432`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 432-443 (`and it spans the artifacts column (a PR chip is only row 1) but stops short o...`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

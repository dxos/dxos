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

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- b3e304f940-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/walkthrough/generate.ts:82
- b3e304f940-2 - ignored - no-casts - packages/plugins/plugin-github/src/walkthrough/plan.test.ts:134
- b3e304f940-3 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:432

## Issues

# WARN b3e304f940-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/walkthrough/generate.ts:82`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 82-93 (`export const generateWalkthrough = <R = never>({`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b3e304f940-2 no-casts `packages/plugins/plugin-github/src/walkthrough/plan.test.ts:134`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 134-143 (`)!;`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN b3e304f940-3 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:432`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 432-443 (`and it spans the artifacts column (a PR chip is only row 1) but stops short o...`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `7e95a014fc1ddd747c29ed6112ee3a7335ed3bbb`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 169 uncertain, 297 clean, 0 unanswered

```text
requests: 270 (113 verdicts re-asked with context the model requested)
estimated input tokens: 1759967
billed input tokens: 1696449 (cost $0.0713)
measured chars per token: 3.11
```

---
branch: claude/echo-session-pickup-77c9b6
commit: 20f8a6ff95b21ad444733ee420eca12e0f43d443
base: 788aace754a80ceba49711f3147594d4e56cc2bb
mode: fast
createdAt: 2026-09-30T19:04:48.210Z
isFinalized: true
groups: 68
rules: [namespace-export-with-internal-hiding, no-casts, no-styling-wrapper-divs]
reviewId: 20f8a6ff95b
---

_1 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 20f8a6ff95b-1 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:677
- 20f8a6ff95b-2 - ignored - no-casts - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1967
- 20f8a6ff95b-3 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:500
- 20f8a6ff95b-4 - ignored - namespace-export-with-internal-hiding - packages/ui/ui-types/src/index.ts:13

## Issues

# WARN 20f8a6ff95b-1 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:677`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 677-697 (`{framed ? (`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 20f8a6ff95b-2 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1967`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 1967-1990 (`press(rows().find(({ title }) => title === 'Ship the spring release')!.row, '...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 20f8a6ff95b-3 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:500`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 500-515 (`const TaskListGroupLabel = composable<HTMLDivElement>(({ children, ...props }...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 20f8a6ff95b-4 namespace-export-with-internal-hiding `packages/ui/ui-types/src/index.ts:13`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.89. The likeliest place is lines 13-18 (`export * from './palette.ts';`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `788aace754a80ceba49711f3147594d4e56cc2bb`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 123 uncertain, 135 clean, 0 unanswered
- left for an agentic reviewer: 48 batch(es)

```text
requests: 185 (72 verdicts re-asked with context the model requested)
estimated input tokens: 2069532
billed input tokens: 2097195 (cost $0.0881)
measured chars per token: 2.96
```

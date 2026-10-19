---
branch: dm/nice-babbage-bt66pz
commit: 0389cc07d36758c66bba0de4b5fb56a2c277aba3
base: 752c4a9e90053ae1ab9b39329fb668cd70ae6f38
mode: fast
createdAt: 2026-10-01T07:42:21.022Z
isFinalized: true
groups: 68
rules: [extract-non-rendering-logic-from-component, no-styling-wrapper-divs]
reviewId: 0389cc07
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 0389cc07-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:122
- 0389cc07-2 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:92
- 0389cc07-3 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:332

## Issues

# WARN 0389cc07-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:122`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 122-133 (`useEffect(() => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0389cc07-2 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:92`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 92-103 (`const text = rest.trim();`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0389cc07-3 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:332`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 332-343 (`</Panel.Root>`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `752c4a9e90053ae1ab9b39329fb668cd70ae6f38`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 145 uncertain, 223 clean, 0 unanswered
- left for an agentic reviewer: 47 batch(es)

```text
requests: 220 (94 verdicts re-asked with context the model requested)
estimated input tokens: 1450838
billed input tokens: 1387350 (cost $0.0583)
measured chars per token: 3.14
```

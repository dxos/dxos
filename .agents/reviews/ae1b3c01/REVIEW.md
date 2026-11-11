---
branch: dm/awesome-feynman-neepp5
commit: ae1b3c01127c376d706bb35afddfc05ae1b1c403
base: 524906089ef496b70bf7b8012df48a700816940a
mode: fast
createdAt: 2026-11-11T15:26:14.176Z
isFinalized: true
groups: 81
rules: [card-content-in-middle-column, extract-non-rendering-logic-from-component]
reviewId: ae1b3c01
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- ae1b3c01-1 - ignored - card-content-in-middle-column - packages/plugins/plugin-code/src/components/DefinitionGraph/DefinitionGraph.tsx:82
- ae1b3c01-2 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/components/DefinitionGraph/DefinitionGraph.tsx:265

## Issues

# WARN ae1b3c01-1 card-content-in-middle-column `packages/plugins/plugin-code/src/components/DefinitionGraph/DefinitionGraph.tsx:82`

System One judges this a likely violation of `card-content-in-middle-column` (A card whose header uses the rails is a `grid` card, so its rows start in the middle column under the title), p=0.92. The likeliest place is lines 82-93 (`>`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN ae1b3c01-2 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/components/DefinitionGraph/DefinitionGraph.tsx:265`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 265-276 (`...exclude,`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `524906089ef496b70bf7b8012df48a700816940a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 63 uncertain, 142 clean, 0 unanswered
- left for an agentic reviewer: 42 batch(es)

```text
requests: 109 (31 verdicts re-asked with context the model requested)
estimated input tokens: 624027
billed input tokens: 590492 (cost $0.0248)
measured chars per token: 3.17
```

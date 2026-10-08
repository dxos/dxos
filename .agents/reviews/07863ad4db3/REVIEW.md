---
branch: claude/kanban-pivot-column-select-02c6b5
commit: 07863ad4db302cffdf618f1ca14fbb22fe71177b
base: 3e73e53653746fa003aa739e332ff7fdcffdd678
mode: fast
createdAt: 2026-10-05T15:15:05.196Z
isFinalized: true
groups: 42
rules: [extract-non-rendering-logic-from-component]
reviewId: 07863ad4db3
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 07863ad4db3-1 - resolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/capabilities/PivotColumnField.tsx:18

## Issues

# WARN 07863ad4db3-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/capabilities/PivotColumnField.tsx:18`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 18-29 (`export const PivotColumnField = ({ data, ...inputProps }: PivotColumnFieldPro...`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `3e73e53653746fa003aa739e332ff7fdcffdd678`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 15 uncertain, 22 clean, 0 unanswered
- left for an agentic reviewer: 19 batch(es)

```text
requests: 26 (13 verdicts re-asked with context the model requested)
estimated input tokens: 93201
billed input tokens: 85901 (cost $0.0036)
measured chars per token: 3.25
```

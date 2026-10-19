---
branch: claude/fix-react-ui-canvas-e2e
commit: cd0d304660883916fefe4425d07254db58130bba
base: 867016bc48ab3629f3d343be0a469b80b88eb1d4
mode: fast
createdAt: 2026-10-19T09:47:53.013Z
isFinalized: true
groups: 64
rules: [extract-non-rendering-logic-from-component]
reviewId: cd0d3046
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- cd0d3046-1 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/Canvas/Canvas.tsx:1529

## Issues

# WARN cd0d3046-1 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/Canvas/Canvas.tsx:1529`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 1529-1552 (`const focus = useMemo(() => {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `867016bc48ab3629f3d343be0a469b80b88eb1d4`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 43 uncertain, 11 clean, 0 unanswered
- left for an agentic reviewer: 52 batch(es)

```text
requests: 68 (26 verdicts re-asked with context the model requested)
estimated input tokens: 1557911
billed input tokens: 1630168 (cost $0.0685)
measured chars per token: 2.87
```

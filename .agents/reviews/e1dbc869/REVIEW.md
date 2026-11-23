---
branch: dm/zealous-bohr-833aun
commit: e1dbc869120eaade7eca35dff43fd390a1b069d6
base: 11efa0079a28071146f23ac827865c9e94fb73d1
mode: fast
createdAt: 2026-10-27T16:11:32.208Z
isFinalized: true
groups: 69
rules: [comment-hygiene]
reviewId: e1dbc869
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- e1dbc869-1 - ignored - comment-hygiene - packages/ui/react-ui-editor/src/components/EditorToolbar/headings.ts:43

## Issues

# WARN e1dbc869-1 comment-hygiene `packages/ui/react-ui-editor/src/components/EditorToolbar/headings.ts:43`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.89. The likeliest place is lines 43-54 (`applyActive: true,`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `11efa0079a28071146f23ac827865c9e94fb73d1`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 103 uncertain, 120 clean, 0 unanswered
- left for an agentic reviewer: 48 batch(es)

```text
requests: 145 (52 verdicts re-asked with context the model requested)
estimated input tokens: 882610
billed input tokens: 855658 (cost $0.0359)
measured chars per token: 3.09
```

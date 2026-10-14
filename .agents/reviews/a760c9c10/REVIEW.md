---
branch: HEAD
commit: a760c9c104366675892b9962f1554af9f2dc36b3
base: d2a6aad85defc0e0d3d9e779d1113052d3e2fce5
mode: fast
createdAt: 2026-10-05T18:20:14.802Z
isFinalized: true
groups: 46
rules: [no-casts]
reviewId: a760c9c10
---

_1 error(s), 0 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- a760c9c10-1 - resolved - no-casts - packages/ui/ui-editor/src/extensions/language/markdown/image.test.ts:14

## Issues

# ERROR a760c9c10-1 no-casts `packages/ui/ui-editor/src/extensions/language/markdown/image.test.ts:14`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 14-27 (`const createView = (doc: string, extensions: any[]) => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `d2a6aad85defc0e0d3d9e779d1113052d3e2fce5`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 43 uncertain, 61 clean, 0 unanswered
- left for an agentic reviewer: 29 batch(es)

```text
requests: 64 (21 verdicts re-asked with context the model requested)
estimated input tokens: 332472
billed input tokens: 316478 (cost $0.0133)
measured chars per token: 3.15
```

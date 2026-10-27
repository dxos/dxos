---
branch: dm/clever-albattani-dc52qu
commit: a379c7990def6be8b69bd90d73e51a27f61c3591
base: f299590426e4b317c83757b4bf83c0051f27b0a7
mode: fast
createdAt: 2026-10-25T06:17:38.906Z
isFinalized: true
groups: 79
rules: [per-test-mutable-fixtures]
reviewId: a379c799
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- a379c799-1 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-assistant/src/operations/analyze-turn.test.ts:45

## Issues

# WARN a379c799-1 per-test-mutable-fixtures `packages/plugins/plugin-assistant/src/operations/analyze-turn.test.ts:45`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.83. The likeliest place is lines 45-53 (`type Captured = {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `f299590426e4b317c83757b4bf83c0051f27b0a7`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 150 uncertain, 197 clean, 0 unanswered
- left for an agentic reviewer: 60 batch(es)

```text
requests: 207 (105 verdicts re-asked with context the model requested)
estimated input tokens: 1054193
billed input tokens: 971875 (cost $0.0408)
measured chars per token: 3.25
```

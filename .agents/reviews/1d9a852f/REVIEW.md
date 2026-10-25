---
branch: dm/clever-albattani-dc52qu
commit: 1d9a852ff7c9c26d5fc3d7b7ff86c72fa349f517
base: f299590426e4b317c83757b4bf83c0051f27b0a7
mode: fast
createdAt: 2026-10-25T06:01:41.058Z
isFinalized: true
groups: 74
rules: [per-test-mutable-fixtures]
reviewId: 1d9a852f
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 1d9a852f-1 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-assistant/src/operations/analyze-turn.test.ts:45

## Issues

# WARN 1d9a852f-1 per-test-mutable-fixtures `packages/plugins/plugin-assistant/src/operations/analyze-turn.test.ts:45`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.85. The likeliest place is lines 45-53 (`type Captured = {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `f299590426e4b317c83757b4bf83c0051f27b0a7`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 93 uncertain, 125 clean, 0 unanswered
- left for an agentic reviewer: 52 batch(es)

```text
requests: 127 (75 verdicts re-asked with context the model requested)
estimated input tokens: 621780
billed input tokens: 570416 (cost $0.0240)
measured chars per token: 3.27
```

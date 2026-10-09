---
branch: dm/festive-franklin-9qkkkk
commit: 2bf01bc257ec9baf3499857fa358149458a3a610
base: 09fc1f582637df35eebcb5547291b66a73c5a62a
mode: fast
createdAt: 2026-10-09T06:47:18.732Z
isFinalized: true
groups: 45
rules: [no-casts]
reviewId: 2bf01bc2
---

_1 error(s), 0 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 2bf01bc2-1 - ignored - no-casts - packages/plugins/plugin-tldraw/src/model/scene.test.ts:94

## Issues

# ERROR 2bf01bc2-1 no-casts `packages/plugins/plugin-tldraw/src/model/scene.test.ts:94`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 94-105 (`}),`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `09fc1f582637df35eebcb5547291b66a73c5a62a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 37 uncertain, 35 clean, 0 unanswered
- left for an agentic reviewer: 30 batch(es)

```text
requests: 47 (24 verdicts re-asked with context the model requested)
estimated input tokens: 348759
billed input tokens: 373299 (cost $0.0157)
measured chars per token: 2.80
```

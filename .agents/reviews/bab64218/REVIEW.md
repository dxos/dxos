---
branch: dm/adoring-pasteur-hzmwaz
commit: bab642180022cd66cbd39b23c5242f74996c4ca2
base: 300f4dfd9f13e8ee9f2256cbdc84902795f48c53
mode: fast
createdAt: 2026-10-02T12:17:28.175Z
isFinalized: true
groups: 141
rules: [no-casts, no-sleep-in-test]
reviewId: bab64218
---

_1 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- bab64218-1 - ignored - no-sleep-in-test - packages/core/echo/echo-sqlite/src/database.test.ts:67
- bab64218-2 - ignored - no-casts - packages/core/echo/echo-sqlite/src/database.test.ts:662

## Issues

# WARN bab64218-1 no-sleep-in-test `packages/core/echo/echo-sqlite/src/database.test.ts:67`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 67-73 (`const until = async (condition: () => boolean) => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bab64218-2 no-casts `packages/core/echo/echo-sqlite/src/database.test.ts:662`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 662-673 (`yield* Database.add(Obj.make(TestSchema.Person, { name: 'Alice' }));`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `300f4dfd9f13e8ee9f2256cbdc84902795f48c53`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 98 uncertain, 1028 clean, 0 unanswered
- left for an agentic reviewer: 40 batch(es)

```text
requests: 399 (64 verdicts re-asked with context the model requested)
estimated input tokens: 1951635
billed input tokens: 1795305 (cost $0.0754)
measured chars per token: 3.26
```

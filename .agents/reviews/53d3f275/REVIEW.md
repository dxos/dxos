---
branch: dm/vibrant-gates-u8vy5m
commit: 53d3f275a74d9d7bf57fb580eaed8fb138c05ae0
base: 0a4bae2193286440226008e8d4c048a6875e4bb2
mode: fast
createdAt: 2026-10-02T13:08:08.428Z
isFinalized: true
groups: 43
rules: [no-casts]
reviewId: 53d3f275
---

_1 error(s), 0 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 53d3f275-1 - resolved - no-casts - packages/e2e/perf-harness/src/cdp.ts:183

## Issues

# ERROR 53d3f275-1 no-casts `packages/e2e/perf-harness/src/cdp.ts:183`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 183-194 (`const attach = async (info: TargetInfo): Promise<Attached | undefined> => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `0a4bae2193286440226008e8d4c048a6875e4bb2`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 36 uncertain, 37 clean, 0 unanswered
- left for an agentic reviewer: 27 batch(es)

```text
requests: 44 (16 verdicts re-asked with context the model requested)
estimated input tokens: 287293
billed input tokens: 279309 (cost $0.0117)
measured chars per token: 3.09
```

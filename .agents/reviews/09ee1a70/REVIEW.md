---
branch: dm/vibrant-tesla-zz757b
commit: 09ee1a703bc1ba9dc9f20b91f3158a1c2364ce8b
base: 809103242b73daebd337da2b27be6b1dc7ca1583
mode: fast
createdAt: 2026-10-03T05:46:51.170Z
isFinalized: true
groups: 52
rules: [namespace-export-with-internal-hiding, no-casts]
reviewId: 09ee1a70
---

_1 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 09ee1a70-1 - ignored - namespace-export-with-internal-hiding - packages/common/util/src/index.ts:1
- 09ee1a70-2 - ignored - no-casts - packages/core/compute/compute-runtime/src/triggers/input-builder.ts:9

## Issues

# WARN 09ee1a70-1 namespace-export-with-internal-hiding `packages/common/util/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.94. The likeliest place is lines 1-12 (`export * from './array-to-hex.ts';`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 09ee1a70-2 no-casts `packages/core/compute/compute-runtime/src/triggers/input-builder.ts:9`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 9-20 (`export const createInvocationPayload = (trigger: Trigger.Trigger, event: Trig...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `809103242b73daebd337da2b27be6b1dc7ca1583`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 64 uncertain, 186 clean, 0 unanswered
- left for an agentic reviewer: 27 batch(es)

```text
requests: 134 (45 verdicts re-asked with context the model requested)
estimated input tokens: 666360
billed input tokens: 617365 (cost $0.0259)
measured chars per token: 3.24
```

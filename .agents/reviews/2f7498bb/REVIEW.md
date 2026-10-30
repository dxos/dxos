---
branch: dm/eloquent-ptolemy-grnoa2
commit: 2f7498bbe0001eb7a3eb66e65ada055c65e753ea
base: e04cf29da97427943cfaed2ccacfa7a9a880325b
mode: fast
createdAt: 2026-10-30T10:05:22.634Z
isFinalized: true
groups: 67
rules: [error-messages-carry-context]
reviewId: 2f7498bb
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 2f7498bb-1 - ignored - error-messages-carry-context - packages/core/compute/functions-runtime-cloudflare/src/internal/data-service-impl.test.ts:164

## Issues

# WARN 2f7498bb-1 error-messages-carry-context `packages/core/compute/functions-runtime-cloudflare/src/internal/data-service-impl.test.ts:164`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 164-167 (`throw new Error('not implemented');`, location confidence 0.97). Judged with added `diff, test` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `e04cf29da97427943cfaed2ccacfa7a9a880325b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 45 uncertain, 51 clean, 0 unanswered
- left for an agentic reviewer: 41 batch(es)

```text
requests: 54 (28 verdicts re-asked with context the model requested)
estimated input tokens: 380907
billed input tokens: 361194 (cost $0.0152)
measured chars per token: 3.16
```

---
branch: dm/eloquent-ptolemy-grnoa2
commit: 14bef91de0025b1ae279c575c0f9f0cf4fef7420
base: e04cf29da97427943cfaed2ccacfa7a9a880325b
mode: fast
createdAt: 2026-10-30T09:48:25.936Z
isFinalized: true
groups: 67
rules: [error-messages-carry-context, no-try-catch-in-effect-code]
reviewId: 14bef91d
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 14bef91d-1 - ignored - error-messages-carry-context - packages/core/compute/functions-runtime-cloudflare/src/internal/data-service-impl.test.ts:160
- 14bef91d-2 - ignored - no-try-catch-in-effect-code - packages/core/compute/functions-runtime-cloudflare/src/internal/data-service-impl.ts:175

## Issues

# WARN 14bef91d-1 error-messages-carry-context `packages/core/compute/functions-runtime-cloudflare/src/internal/data-service-impl.test.ts:160`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 160-163 (`throw new Error('not implemented');`, location confidence 0.96). Judged with added `diff, test` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN 14bef91d-2 no-try-catch-in-effect-code `packages/core/compute/functions-runtime-cloudflare/src/internal/data-service-impl.ts:175`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.80. The likeliest place is lines 175-186 (`continue;`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `e04cf29da97427943cfaed2ccacfa7a9a880325b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 44 uncertain, 51 clean, 0 unanswered
- left for an agentic reviewer: 40 batch(es)

```text
requests: 51 (26 verdicts re-asked with context the model requested)
estimated input tokens: 362773
billed input tokens: 344013 (cost $0.0144)
measured chars per token: 3.16
```

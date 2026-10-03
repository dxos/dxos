---
branch: HEAD
commit: f2fb2abbb7bf1ab19c683aff849af092efe1e106
base: de2f27a476f0ab1dc54c8a67258cdd5b4b0fa762
mode: fast
createdAt: 2026-10-03T18:20:29.716Z
isFinalized: true
groups: 50
rules: [error-messages-carry-context]
reviewId: f2fb2abbb7b
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- f2fb2abbb7b-1 - ignored - error-messages-carry-context - packages/sdk/app-toolkit/src/app/NativePasskey.ts:297

## Issues

# WARN f2fb2abbb7b-1 error-messages-carry-context `packages/sdk/app-toolkit/src/app/NativePasskey.ts:297`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.89. The likeliest place is lines 297-308 (`throw new Error('Unsupported negative integer size');`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `de2f27a476f0ab1dc54c8a67258cdd5b4b0fa762`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 62 uncertain, 89 clean, 0 unanswered
- left for an agentic reviewer: 30 batch(es)

```text
requests: 91 (43 verdicts re-asked with context the model requested)
estimated input tokens: 638458
billed input tokens: 629916 (cost $0.0265)
measured chars per token: 3.04
```

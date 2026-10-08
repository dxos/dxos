---
branch: dm/friendly-maxwell-ln3vr9
commit: 464c13c3a8a277bf9b89375bccc704bcef703c7b
base: 64f1a7a734790ffa7f7a4b7bff447d5c38e35acf
mode: fast
createdAt: 2026-10-08T10:48:05.134Z
isFinalized: true
groups: 54
rules: [no-trivial-wrappers-over-official-apis]
reviewId: 464c13c3
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 464c13c3-1 - resolved - no-trivial-wrappers-over-official-apis - packages/core/compute/trajectory/src/samples.test.ts:23

## Issues

# WARN 464c13c3-1 no-trivial-wrappers-over-official-apis `packages/core/compute/trajectory/src/samples.test.ts:23`

System One judges this a likely violation of `no-trivial-wrappers-over-official-apis` (Do not extract a helper that only forwards to an official API), p=0.84. The likeliest place is lines 23-26 (`const make = (payload: Trajectory.Payload, sender: Trajectory.Sender, thread?...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `64f1a7a734790ffa7f7a4b7bff447d5c38e35acf`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 90 uncertain, 136 clean, 0 unanswered
- left for an agentic reviewer: 34 batch(es)

```text
requests: 137 (68 verdicts re-asked with context the model requested)
estimated input tokens: 983696
billed input tokens: 935084 (cost $0.0393)
measured chars per token: 3.16
```

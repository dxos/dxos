---
branch: claude/brain-store-reasoning
commit: a0924f3353f3cefc099e1a5f37473cb6c5da5ff2
base: 9d979541835a4b6256d588d4a3e18e579959377f
mode: fast
createdAt: 2026-10-07T06:29:39.392Z
isFinalized: true
groups: 65
rules: [bounded-live-state]
reviewId: a0924f3353f3
---

_1 error(s), 0 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- a0924f3353f3-1 - resolved - bounded-live-state - packages/core/compute/brain/src/internal/core.ts:262

## Issues

# ERROR a0924f3353f3-1 bounded-live-state `packages/core/compute/brain/src/internal/core.ts:262`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.89. The likeliest place is lines 262-273 (`for (const registration of state.registrations.values()) {`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `9d979541835a4b6256d588d4a3e18e579959377f`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 193 uncertain, 363 clean, 0 unanswered
- left for an agentic reviewer: 40 batch(es)

```text
requests: 310 (124 verdicts re-asked with context the model requested)
estimated input tokens: 2587598
billed input tokens: 2487483 (cost $0.1045)
measured chars per token: 3.12
```

### Resolutions

- a0924f3353f3-1: outboxes are now bounded by `maxOutbox` (default 10,000; overflow is dropped and counted, visible through `status`), and the causal-depth index keeps only the last 100,000 events. Covered by `a full outbox drops further deliveries and counts them until the consumer catches up`.

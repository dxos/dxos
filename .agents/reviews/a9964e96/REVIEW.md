---
branch: dm/client-ready-signals
commit: a9964e9658cd09c5ef12e8b4513289559f61730c
base: 2f4eb26a6cdad97846fbcc1eb4894d7c9f9e4141
mode: fast
createdAt: 2026-10-28T12:16:29.043Z
isFinalized: true
groups: 84
rules: [deferred-callback-owns-its-context, no-casts, no-sleep-in-test, one-changeset-per-pr, use-context-scoped-cancellation]
reviewId: a9964e96
---

_1 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- a9964e96-1 - resolved - one-changeset-per-pr - .changeset/client-boot-cache.md:5
- a9964e96-2 - ignored - no-sleep-in-test - packages/sdk/client/src/client/client-initialize.test.ts:42
- a9964e96-3 - ignored - no-casts - packages/sdk/client/src/client/client.ts:392
- a9964e96-4 - ignored - deferred-callback-owns-its-context - packages/sdk/client/src/client/client.ts:584
- a9964e96-5 - ignored - use-context-scoped-cancellation - packages/sdk/client/src/client/client.ts:752

## Issues

# WARN a9964e96-1 one-changeset-per-pr `.changeset/client-boot-cache.md:5`

System One judges this a likely violation of `one-changeset-per-pr` (A PR carries at most one changeset, and none for a chore), p=0.82. This is a single-shot classifier: confirm against the rule before acting.

# WARN a9964e96-2 no-sleep-in-test `packages/sdk/client/src/client/client-initialize.test.ts:42`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.97. The likeliest place is lines 42-53 (`const client = new Client();`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a9964e96-3 no-casts `packages/sdk/client/src/client/client.ts:392`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 392-415 (`async repair(): Promise<any> {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9964e96-4 deferred-callback-owns-its-context `packages/sdk/client/src/client/client.ts:584`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.85. The likeliest place is lines 584-607 (`const persist = async () => {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN a9964e96-5 use-context-scoped-cancellation `packages/sdk/client/src/client/client.ts:752`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.88. The likeliest place is lines 752-775 (`}`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `2f4eb26a6cdad97846fbcc1eb4894d7c9f9e4141`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 129 uncertain, 108 clean, 0 unanswered
- left for an agentic reviewer: 66 batch(es)

```text
requests: 138 (81 verdicts re-asked with context the model requested)
estimated input tokens: 1560964
billed input tokens: 1506822 (cost $0.0633)
measured chars per token: 3.11
```

---
branch: dm/client-ready-signals
commit: 16d94aed0b0c8f7d9a784a322f6201fcd0d5ebb9
base: 2f4eb26a6cdad97846fbcc1eb4894d7c9f9e4141
mode: fast
createdAt: 2026-10-29T08:34:43.670Z
isFinalized: true
groups: 84
rules: [deferred-callback-owns-its-context, no-casts, no-sleep-in-test, no-try-catch-in-effect-code, use-context-scoped-cancellation]
reviewId: 16d94aed
---

_1 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 16d94aed-1 - ignored - no-sleep-in-test - packages/sdk/client/src/client/client-initialize.test.ts:42
- 16d94aed-2 - ignored - no-casts - packages/sdk/client/src/client/client.ts:392
- 16d94aed-3 - ignored - deferred-callback-owns-its-context - packages/sdk/client/src/client/client.ts:584
- 16d94aed-4 - ignored - no-try-catch-in-effect-code - packages/sdk/client/src/client/client.ts:680
- 16d94aed-5 - ignored - use-context-scoped-cancellation - packages/sdk/client/src/client/client.ts:728

## Issues

# WARN 16d94aed-1 no-sleep-in-test `packages/sdk/client/src/client/client-initialize.test.ts:42`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.96. The likeliest place is lines 42-53 (`const client = new Client();`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 16d94aed-2 no-casts `packages/sdk/client/src/client/client.ts:392`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 392-415 (`}`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 16d94aed-3 deferred-callback-owns-its-context `packages/sdk/client/src/client/client.ts:584`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.88. The likeliest place is lines 584-607 (`private _persistBootCache(bootCache: BootCacheServices): void {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 16d94aed-4 no-try-catch-in-effect-code `packages/sdk/client/src/client/client.ts:680`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.80. The likeliest place is lines 680-703 (`})`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 16d94aed-5 use-context-scoped-cancellation `packages/sdk/client/src/client/client.ts:728`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.89. The likeliest place is lines 728-751 (`log('client._open: subscribing to system status...');`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `2f4eb26a6cdad97846fbcc1eb4894d7c9f9e4141`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 129 uncertain, 104 clean, 0 unanswered
- left for an agentic reviewer: 67 batch(es)

```text
requests: 138 (88 verdicts re-asked with context the model requested)
estimated input tokens: 1596449
billed input tokens: 1538608 (cost $0.0646)
measured chars per token: 3.11
```

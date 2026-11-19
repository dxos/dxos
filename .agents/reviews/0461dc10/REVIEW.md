---
branch: dm/epic-newton-fqo5km
commit: 0461dc10e811bd55816844573fe1a8728c370ddf
base: fbafcab78de98086a410e7988a64f4f56684865a
mode: fast
createdAt: 2026-11-18T17:43:58.155Z
isFinalized: true
groups: 86
rules: [effect-fn-not-hand-wrapped-gen, namespace-brand-key-prefixing, no-casts, no-sleep-in-test]
reviewId: 0461dc10
---

_1 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 0461dc10-1 - ignored - no-sleep-in-test - packages/sdk/worker-framework/src/Client.test.ts:120
- 0461dc10-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/worker-framework/src/Client.test.ts:740
- 0461dc10-3 - ignored - no-casts - packages/sdk/worker-framework/src/Client.ts:497
- 0461dc10-4 - ignored - namespace-brand-key-prefixing - packages/sdk/worker-framework/src/errors.ts:10

## Issues

# WARN 0461dc10-1 no-sleep-in-test `packages/sdk/worker-framework/src/Client.test.ts:120`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.96. The likeliest place is lines 120-143 (`const error = await asyncTimeout(failure.wait(), 5_000);`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0461dc10-2 effect-fn-not-hand-wrapped-gen `packages/sdk/worker-framework/src/Client.test.ts:740`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 740-760 (`Effect.gen(function* () {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 0461dc10-3 no-casts `packages/sdk/worker-framework/src/Client.ts:497`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 497-520 (`return;`, location confidence 0.13). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0461dc10-4 namespace-brand-key-prefixing `packages/sdk/worker-framework/src/errors.ts:10`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.83. The likeliest place is lines 10-15 (`export class WorkerError extends BaseError.extend('WorkerError', 'Worker fail...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `fbafcab78de98086a410e7988a64f4f56684865a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 105 uncertain, 85 clean, 0 unanswered
- left for an agentic reviewer: 66 batch(es)

```text
requests: 132 (61 verdicts re-asked with context the model requested)
estimated input tokens: 2389819
billed input tokens: 2386846 (cost $0.1002)
measured chars per token: 3.00
```

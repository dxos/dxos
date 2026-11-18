---
branch: dm/epic-newton-fqo5km
commit: bb4406c83433cd351c7fb8a6058905b6c1168e5f
base: fbafcab78de98086a410e7988a64f4f56684865a
mode: fast
createdAt: 2026-11-18T17:33:25.306Z
isFinalized: true
groups: 86
rules: [effect-fn-not-hand-wrapped-gen, namespace-brand-key-prefixing, no-casts, no-sleep-in-test, use-context-scoped-cancellation]
reviewId: bb4406c8
---

_1 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- bb4406c8-1 - ignored - no-sleep-in-test - packages/sdk/worker-framework/src/Client.test.ts:120
- bb4406c8-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/worker-framework/src/Client.test.ts:717
- bb4406c8-3 - ignored - no-casts - packages/sdk/worker-framework/src/Client.ts:497
- bb4406c8-4 - ignored - use-context-scoped-cancellation - packages/sdk/worker-framework/src/Client.ts:652
- bb4406c8-5 - ignored - namespace-brand-key-prefixing - packages/sdk/worker-framework/src/errors.ts:10

## Issues

# WARN bb4406c8-1 no-sleep-in-test `packages/sdk/worker-framework/src/Client.test.ts:120`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.96. The likeliest place is lines 120-143 (`const error = await asyncTimeout(failure.wait(), 5_000);`, location confidence 0.18). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb4406c8-2 effect-fn-not-hand-wrapped-gen `packages/sdk/worker-framework/src/Client.test.ts:717`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 717-740 (`worker.requestShutdown();`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bb4406c8-3 no-casts `packages/sdk/worker-framework/src/Client.ts:497`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 497-520 (`return;`, location confidence 0.14). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb4406c8-4 use-context-scoped-cancellation `packages/sdk/worker-framework/src/Client.ts:652`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.80. The likeliest place is lines 652-663 (`clientId: this.#clientId,`, location confidence 0.72). Judged with added `diff, imports` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN bb4406c8-5 namespace-brand-key-prefixing `packages/sdk/worker-framework/src/errors.ts:10`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.82. The likeliest place is lines 10-15 (`export class WorkerError extends BaseError.extend('WorkerError', 'Worker fail...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `fbafcab78de98086a410e7988a64f4f56684865a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 106 uncertain, 83 clean, 0 unanswered
- left for an agentic reviewer: 64 batch(es)

```text
requests: 130 (60 verdicts re-asked with context the model requested)
estimated input tokens: 2379823
billed input tokens: 2378323 (cost $0.0999)
measured chars per token: 3.00
```

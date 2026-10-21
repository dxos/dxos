---
branch: worktree-worker-leader-prespawn-timeout
commit: e8b74b415ba3588fbad36e3fa29cbe314ab9298c
base: ed0d36747afa04dcee36234c383eb98e5902db36
mode: fast
createdAt: 2026-10-20T09:35:41.344Z
isFinalized: true
groups: 90
rules: [effect-fn-not-hand-wrapped-gen, no-casts, no-sleep-in-test, use-context-scoped-cancellation]
reviewId: e8b74b415
---

_2 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- e8b74b415-1 - ignored - no-sleep-in-test - packages/sdk/worker-framework/src/Client.test.ts:547
- e8b74b415-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/worker-framework/src/Client.test.ts:686
- e8b74b415-3 - ignored - no-casts - packages/sdk/worker-framework/src/Client.ts:467
- e8b74b415-4 - ignored - use-context-scoped-cancellation - packages/sdk/worker-framework/src/Client.ts:611
- e8b74b415-5 - ignored - no-casts - packages/sdk/worker-framework/src/Worker.ts:126

## Issues

# WARN e8b74b415-1 no-sleep-in-test `packages/sdk/worker-framework/src/Client.test.ts:547`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 547-570 (`await sleep(200);`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN e8b74b415-2 effect-fn-not-hand-wrapped-gen `packages/sdk/worker-framework/src/Client.test.ts:686`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 686-706 (`Effect.gen(function* () {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e8b74b415-3 no-casts `packages/sdk/worker-framework/src/Client.ts:467`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 467-490 (`}`, location confidence 0.18). This is a single-shot classifier: confirm against the rule before acting.

# WARN e8b74b415-4 use-context-scoped-cancellation `packages/sdk/worker-framework/src/Client.ts:611`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.80. The likeliest place is lines 611-634 (`this.#coordinator?.sendMessage({`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e8b74b415-5 no-casts `packages/sdk/worker-framework/src/Worker.ts:126`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 126-137 (`const defaultEndpoint = (): WorkerProtocol.WorkerEndpoint => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `ed0d36747afa04dcee36234c383eb98e5902db36`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 177 uncertain, 188 clean, 0 unanswered
- left for an agentic reviewer: 67 batch(es)

```text
requests: 217 (98 verdicts re-asked with context the model requested)
estimated input tokens: 2910286
billed input tokens: 2862762 (cost $0.1202)
measured chars per token: 3.05
```

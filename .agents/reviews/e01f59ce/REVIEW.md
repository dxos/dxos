---
branch: worktree-agent-aebe5fdcdd7329b97
commit: e01f59ce029505855bc1f503a21a3cdc6f077501
base: e1d098457349080fa832b6b0356c894aa6fbf209
mode: fast
createdAt: 2026-10-09T04:24:16.478Z
isFinalized: true
groups: 53
rules: [effect-fn-not-hand-wrapped-gen, errors-extend-base-error, namespace-brand-key-prefixing, no-casts, no-mixed-promise-effect-lifecycle, no-sleep-in-test]
reviewId: e01f59ce
---

_4 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- e01f59ce-1 - unresolved - namespace-brand-key-prefixing - packages/core/compute/compute-runtime/src/errors.ts:13
- e01f59ce-2 - unresolved - no-casts - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:167
- e01f59ce-3 - unresolved - no-mixed-promise-effect-lifecycle - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:203
- e01f59ce-4 - unresolved - no-sleep-in-test - packages/core/compute/compute-runtime/src/QueuedRemoteControl.e2e.test.ts:425
- e01f59ce-5 - unresolved - no-casts - packages/core/compute/compute-runtime/src/QueuedRemoteControl.ts:13
- e01f59ce-6 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/RemoteOperationInvoke.e2e.test.ts:111
- e01f59ce-7 - unresolved - errors-extend-base-error - packages/core/compute/compute-runtime/src/testing/LocalRemoteHost.ts:227
- e01f59ce-8 - unresolved - errors-extend-base-error - packages/core/protocols/src/edge/errors.ts:71

## Issues

# WARN e01f59ce-1 namespace-brand-key-prefixing `packages/core/compute/compute-runtime/src/errors.ts:13`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.80. The likeliest place is lines 13-19 (`export class FunctionServiceError extends BaseError.extend('FunctionServiceEr...`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e01f59ce-2 no-casts `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:167`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 167-178 (`const input = args[0] as I;`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN e01f59ce-3 no-mixed-promise-effect-lifecycle `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:203`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.87. The likeliest place is lines 203-214 (`}`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN e01f59ce-4 no-sleep-in-test `packages/core/compute/compute-runtime/src/QueuedRemoteControl.e2e.test.ts:425`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 425-432 (`const waitUntil = (predicate: Effect.Effect<boolean>): Effect.Effect<void> =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e01f59ce-5 no-casts `packages/core/compute/compute-runtime/src/QueuedRemoteControl.ts:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 13-29 (`import type * as KeyValueStore from 'effect/persistence/KeyValueStore';`, location confidence 0.66). Judged with added `imports` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN e01f59ce-6 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/RemoteOperationInvoke.e2e.test.ts:111`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 111-122 (`const withInvoker = (`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e01f59ce-7 errors-extend-base-error `packages/core/compute/compute-runtime/src/testing/LocalRemoteHost.ts:227`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.92. The likeliest place is lines 227-239 (`class ChannelDown extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e01f59ce-8 errors-extend-base-error `packages/core/protocols/src/edge/errors.ts:71`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.83. The likeliest place is lines 71-79 (`export class EdgeAuthChallengeError extends EdgeCallFailedError {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `e1d098457349080fa832b6b0356c894aa6fbf209`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 8 violations written to fragments, 180 uncertain, 158 clean, 0 unanswered
- left for an agentic reviewer: 43 batch(es)

```text
requests: 216 (115 verdicts re-asked with context the model requested)
estimated input tokens: 1764291
billed input tokens: 1650533 (cost $0.0693)
measured chars per token: 3.21
```

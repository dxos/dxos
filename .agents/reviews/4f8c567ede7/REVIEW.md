---
branch: claude/trigger-fixes-priority-8408e9
commit: 4f8c567ede7af7090b308543f18b09d9bcb02ab2
base: 347546a097ef84c77c6e7b503c0f1b33be9ef4bb
mode: fast
createdAt: 2026-10-09T14:40:55.573Z
isFinalized: true
groups: 62
rules: [effect-fn-not-hand-wrapped-gen, errors-extend-base-error, flat-layer-composition, inline-obj-parent, no-sleep-in-test]
reviewId: 4f8c567ede7
---

_1 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 4f8c567ede7-1 - ignored - errors-extend-base-error - packages/core/protocols/src/edge/errors.ts:71
- 4f8c567ede7-2 - ignored - flat-layer-composition - packages/plugins/plugin-connector/src/Binding.test.ts:284
- 4f8c567ede7-3 - ignored - inline-obj-parent - packages/plugins/plugin-connector/src/Binding.test.ts:517
- 4f8c567ede7-4 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-connector/src/Binding.test.ts:710
- 4f8c567ede7-5 - ignored - no-sleep-in-test - packages/plugins/plugin-connector/src/Binding.test.ts:902

## Issues

# ERROR 4f8c567ede7-1 errors-extend-base-error `packages/core/protocols/src/edge/errors.ts:71`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.83. The likeliest place is lines 71-79 (`export class EdgeAuthChallengeError extends EdgeCallFailedError {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4f8c567ede7-2 flat-layer-composition `packages/plugins/plugin-connector/src/Binding.test.ts:284`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 284-307 (`expect(fired).toEqual([trigger.id]);`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4f8c567ede7-3 inline-obj-parent `packages/plugins/plugin-connector/src/Binding.test.ts:517`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.90. The likeliest place is lines 517-540 (`Connection.Connection,`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4f8c567ede7-4 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-connector/src/Binding.test.ts:710`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 710-733 (`const dieFor = new Map<string, unknown>();`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4f8c567ede7-5 no-sleep-in-test `packages/plugins/plugin-connector/src/Binding.test.ts:902`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.90. The likeliest place is lines 902-925 (`);`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### Dismissals

- 4f8c567ede7-1, -3, -4, -5: the flagged lines (`EdgeAuthChallengeError`, and `Binding.test.ts` 517, 710, 902) predate this PR and are not part of its change.
- 4f8c567ede7-2: the new test provides its services the same way as the sibling `run` helper in the same `describe`; a layer for one test would diverge from it.

### System One pass

- model: jev-latest
- base for context: `347546a097ef84c77c6e7b503c0f1b33be9ef4bb`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 271 uncertain, 261 clean, 0 unanswered
- left for an agentic reviewer: 55 batch(es)

```text
requests: 332 (186 verdicts re-asked with context the model requested)
estimated input tokens: 2823485
billed input tokens: 2668609 (cost $0.1121)
measured chars per token: 3.17
```

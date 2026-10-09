---
branch: claude/trigger-fixes-priority-8408e9
commit: 8fe43a69d86d234ad0a30900ede02df2ce33dcbd
base: 4820c0263c24a199a2ce579c421131bd4fed1fd3
mode: fast
createdAt: 2026-10-09T15:05:07.050Z
isFinalized: true
groups: 62
rules: [effect-fn-not-hand-wrapped-gen, flat-layer-composition, inline-obj-parent, no-sleep-in-test]
reviewId: 8fe43a69d86
---

_0 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 8fe43a69d86-1 - ignored - flat-layer-composition - packages/plugins/plugin-connector/src/Binding.test.ts:332
- 8fe43a69d86-2 - ignored - inline-obj-parent - packages/plugins/plugin-connector/src/Binding.test.ts:544
- 8fe43a69d86-3 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-connector/src/Binding.test.ts:761
- 8fe43a69d86-4 - ignored - no-sleep-in-test - packages/plugins/plugin-connector/src/Binding.test.ts:929

## Issues

# WARN 8fe43a69d86-1 flat-layer-composition `packages/plugins/plugin-connector/src/Binding.test.ts:332`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 332-355 (`const capabilities = () => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8fe43a69d86-2 inline-obj-parent `packages/plugins/plugin-connector/src/Binding.test.ts:544`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.91. The likeliest place is lines 544-567 (`);`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8fe43a69d86-3 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-connector/src/Binding.test.ts:761`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 761-784 (`sync: recordingSync,`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8fe43a69d86-4 no-sleep-in-test `packages/plugins/plugin-connector/src/Binding.test.ts:929`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 929-952 (`await EffectEx.runPromise(`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### Dismissals

- 8fe43a69d86-1, -2, -3, -4: the flagged lines in `Binding.test.ts` predate this PR and are not part of its change; -1 points at the existing `capabilities` helper, which the new tests reuse unchanged.

### System One pass

- model: jev-latest
- base for context: `4820c0263c24a199a2ce579c421131bd4fed1fd3`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 270 uncertain, 268 clean, 0 unanswered
- left for an agentic reviewer: 55 batch(es)

```text
requests: 338 (192 verdicts re-asked with context the model requested)
estimated input tokens: 2947235
billed input tokens: 2782346 (cost $0.1169)
measured chars per token: 3.18
```

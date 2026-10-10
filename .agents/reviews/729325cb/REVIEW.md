---
branch: dm/gifted-brahmagupta-c2ejou
commit: 729325cbdd38066998fa59ec78fa156a1f263278
base: 7c088396a3ffec1e5e663d98fc9c63d804723dd0
mode: fast
createdAt: 2026-10-07T12:59:40.042Z
isFinalized: true
groups: 145
rules: [bounded-live-state, effect-fn-not-hand-wrapped-gen, test-real-scenario-not-narrower-proxy, use-context-scoped-cancellation]
reviewId: 729325cb
---

_1 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 729325cb-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:170
- 729325cb-2 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-agent/src/brain/brain.test.ts:138
- 729325cb-3 - resolved - bounded-live-state - packages/plugins/plugin-agent/src/brain/BrainMemory.ts:94
- 729325cb-4 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/brain/BrainMemory.ts:142
- 729325cb-5 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-agent/src/containers/useBrainClock.ts:33
- 729325cb-6 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-agent/src/operations/triggers.test.ts:327
- 729325cb-7 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/operations/triggers.test.ts:604

## Issues

# WARN 729325cb-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:170`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 170-181 (`{ timeout, interval: 2_000 },`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 729325cb-2 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-agent/src/brain/brain.test.ts:138`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.86. The likeliest place is lines 138-143 (`aiService: ScriptedLanguageModel.scriptedAiService(makeScript(refs)),`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 729325cb-3 bounded-live-state `packages/plugins/plugin-agent/src/brain/BrainMemory.ts:94`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.82. The likeliest place is lines 94-105 (`const enqueue = (events: readonly Evaluator.Event[]): number => {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 729325cb-4 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/brain/BrainMemory.ts:142`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 142-153 (`});`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 729325cb-5 use-context-scoped-cancellation `packages/plugins/plugin-agent/src/containers/useBrainClock.ts:33`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 33-44 (`TriggerOperation.RunDue,`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 729325cb-6 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-agent/src/operations/triggers.test.ts:327`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.81. The likeliest place is lines 327-338 (`aiService: ScriptedLanguageModel.scriptedAiService(makeScript(refs)),`, location confidence 0.39). Judged with added `imports, test` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 729325cb-7 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/operations/triggers.test.ts:604`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 604-627 (`const recordedQuotes = (chat: Chat.Chat) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `7c088396a3ffec1e5e663d98fc9c63d804723dd0`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 7 violations written to fragments, 169 uncertain, 984 clean, 0 unanswered
- left for an agentic reviewer: 51 batch(es)

```text
requests: 483 (122 verdicts re-asked with context the model requested)
estimated input tokens: 3436409
billed input tokens: 3198674 (cost $0.1343)
measured chars per token: 3.22
```

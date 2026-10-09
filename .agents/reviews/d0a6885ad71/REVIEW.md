---
branch: claude/trigger-fixes-priority-8408e9
commit: d0a6885ad71b124f13fcafff91725bc9341fb6e6
base: 4820c0263c24a199a2ce579c421131bd4fed1fd3
mode: fast
createdAt: 2026-10-09T15:34:33.446Z
isFinalized: true
groups: 110
rules: [effect-fn-not-hand-wrapped-gen, flat-layer-composition, inline-obj-parent, no-casts, no-sleep-in-test]
reviewId: d0a6885ad71
---

_1 error(s), 7 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- d0a6885ad71-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/TriggerManager.test.ts:112
- d0a6885ad71-2 - ignored - flat-layer-composition - packages/plugins/plugin-connector/src/Binding.test.ts:332
- d0a6885ad71-3 - ignored - inline-obj-parent - packages/plugins/plugin-connector/src/Binding.test.ts:544
- d0a6885ad71-4 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-connector/src/Binding.test.ts:761
- d0a6885ad71-5 - ignored - no-sleep-in-test - packages/plugins/plugin-connector/src/Binding.test.ts:929
- d0a6885ad71-6 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:166
- d0a6885ad71-7 - ignored - inline-obj-parent - packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:228
- d0a6885ad71-8 - ignored - no-casts - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:42

## Issues

# WARN d0a6885ad71-1 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/TriggerManager.test.ts:112`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 112-122 (`const withMonitor = <A, E, R>(body: (monitor: Trigger.Manager) => Effect.Effe...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN d0a6885ad71-2 flat-layer-composition `packages/plugins/plugin-connector/src/Binding.test.ts:332`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 332-355 (`const capabilities = () => {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN d0a6885ad71-3 inline-obj-parent `packages/plugins/plugin-connector/src/Binding.test.ts:544`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.91. The likeliest place is lines 544-567 (`);`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN d0a6885ad71-4 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-connector/src/Binding.test.ts:761`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 761-784 (`sync: recordingSync,`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN d0a6885ad71-5 no-sleep-in-test `packages/plugins/plugin-connector/src/Binding.test.ts:929`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 929-952 (`await EffectEx.runPromise(`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN d0a6885ad71-6 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:166`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 166-182 (`const openCreateSyncRoutineDialog = (`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN d0a6885ad71-7 inline-obj-parent `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts:228`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.88. The likeliest place is lines 228-251 (`const finalizePendingEntry = (`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d0a6885ad71-8 no-casts `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:42`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 42-48 (`const withEnabled = (fields: Schema.Struct.Fields): Schema.Codec<any, any> =>`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### Dismissals

- d0a6885ad71-1, -6, -7, -8: the flagged lines (`withMonitor` in `TriggerManager.test.ts`, `connector-coordinator.ts` 166 and 228, `withEnabled` in `TriggerEditor.tsx`) predate this PR and sit outside its hunks; these files changed only elsewhere (a new test, a comment, the re-wire call).
- d0a6885ad71-2, -3, -4, -5: carried from the superseded review; the flagged lines in `Binding.test.ts` predate this PR (-2 is the existing `capabilities` helper, which the new tests reuse unchanged).

### System One pass

- model: jev-latest
- base for context: `4820c0263c24a199a2ce579c421131bd4fed1fd3`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 8 violations written to fragments, 369 uncertain, 323 clean, 0 unanswered
- left for an agentic reviewer: 68 batch(es)

```text
requests: 433 (248 verdicts re-asked with context the model requested)
estimated input tokens: 3856547
billed input tokens: 3640096 (cost $0.1529)
measured chars per token: 3.18
```

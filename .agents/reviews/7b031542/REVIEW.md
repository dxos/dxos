---
branch: dm/exciting-newton-fudstq
commit: 7b031542f132d4b7d60ba49ab6be40081f76ff9c
base: 596728d83760c02fb29a3d5fc4378c4960206a1a
mode: fast
createdAt: 2026-10-05T09:36:21.050Z
isFinalized: true
groups: 109
rules: [effect-fn-not-hand-wrapped-gen, flat-layer-composition, import-as-namespace-is-all-or-nothing, inline-obj-parent, namespace-export-with-internal-hiding, no-casts, no-mixed-promise-effect-lifecycle, no-sleep-in-test, operations-take-refs-not-ids]
reviewId: 7b031542
---

_2 error(s), 12 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 7b031542-1 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/compute-runtime/src/index.ts:1
- 7b031542-2 - ignored - namespace-export-with-internal-hiding - packages/core/compute/compute-runtime/src/index.ts:13
- 7b031542-3 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:456
- 7b031542-4 - ignored - flat-layer-composition - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1524
- 7b031542-5 - ignored - no-sleep-in-test - packages/core/compute/compute-runtime/src/QueuedRemoteControl.e2e.test.ts:356
- 7b031542-6 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/DurableOperation.tst.ts:106
- 7b031542-7 - ignored - no-casts - packages/core/compute/compute/src/Operation.ts:213
- 7b031542-8 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/Operation.ts:1114
- 7b031542-9 - ignored - inline-obj-parent - packages/plugins/plugin-connector/src/Binding.test.ts:494
- 7b031542-10 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-connector/src/Binding.test.ts:663
- 7b031542-11 - ignored - no-sleep-in-test - packages/plugins/plugin-connector/src/Binding.test.ts:879
- 7b031542-12 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-connector/src/Binding.ts:144
- 7b031542-13 - ignored - operations-take-refs-not-ids - packages/plugins/plugin-routine/src/types/RoutineOperation.ts:44
- 7b031542-14 - ignored - effect-fn-not-hand-wrapped-gen - packages/ui/react-ui-trace/src/testing/simulated-agent.ts:86

## Issues

# WARN 7b031542-1 import-as-namespace-is-all-or-nothing `packages/core/compute/compute-runtime/src/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 1-12 (`export * as DurableOperation from './DurableOperation.ts';`, location confidence 0.16). Judged with added `importers` context after a first pass of 0.73. This is a single-shot classifier: confirm against the rule before acting.

# WARN 7b031542-2 namespace-export-with-internal-hiding `packages/core/compute/compute-runtime/src/index.ts:13`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.84. The likeliest place is lines 13-26 (`export * as QueuedRemoteControl from './QueuedRemoteControl.ts';`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7b031542-3 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:456`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 456-479 (`function* ({ expect }) {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7b031542-4 flat-layer-composition `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1524`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 1524-1547 (`);`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7b031542-5 no-sleep-in-test `packages/core/compute/compute-runtime/src/QueuedRemoteControl.e2e.test.ts:356`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 356-363 (`const waitUntil = (predicate: Effect.Effect<boolean>): Effect.Effect<void> =>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7b031542-6 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/DurableOperation.tst.ts:106`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 106-117 (`expect(`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7b031542-7 no-casts `packages/core/compute/compute/src/Operation.ts:213`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 213-259 (`export type Props<I, O> = Omit<Definition<I, O>, DefinitionTypeId | 'pipe' | ...`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7b031542-8 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/Operation.ts:1114`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.85. The likeliest place is lines 1114-1159 (`export interface OperationService {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7b031542-9 inline-obj-parent `packages/plugins/plugin-connector/src/Binding.test.ts:494`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.92. The likeliest place is lines 494-517 (`);`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7b031542-10 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-connector/src/Binding.test.ts:663`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 663-686 (`const synced: string[] = [];`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7b031542-11 no-sleep-in-test `packages/plugins/plugin-connector/src/Binding.test.ts:879`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 879-902 (`await EffectEx.runPromise(`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7b031542-12 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-connector/src/Binding.ts:144`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 144-166 (`export const query = (target: Obj.Unknown): Effect.Effect<Binding | undefined...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7b031542-13 operations-take-refs-not-ids `packages/plugins/plugin-routine/src/types/RoutineOperation.ts:44`

System One judges this a likely violation of `operations-take-refs-not-ids` (Operations identify objects by Ref, never by a raw id string), p=0.81. The likeliest place is lines 44-55 (`export const CreateRoutine = Operation.make({`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7b031542-14 effect-fn-not-hand-wrapped-gen `packages/ui/react-ui-trace/src/testing/simulated-agent.ts:86`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 86-95 (`const writeAndFlush = <T>(eventType: Trace.EventType<T>, payload: T) =>`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `596728d83760c02fb29a3d5fc4378c4960206a1a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 14 violations written to fragments, 206 uncertain, 574 clean, 0 unanswered
- left for an agentic reviewer: 60 batch(es)

```text
requests: 387 (130 verdicts re-asked with context the model requested)
estimated input tokens: 5172836
billed input tokens: 4873878 (cost $0.2047)
measured chars per token: 3.18
```

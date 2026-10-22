---
branch: claude/sync-chain-progress
commit: 3a29cbe874bbb7c822c5f7b5d1233c266f6fa2eb
base: ace6ed8f423b3fef498eb2be469c5cd85c765c3b
mode: fast
createdAt: 2026-10-21T20:13:08.935Z
isFinalized: true
groups: 149
rules: [effect-fn-not-hand-wrapped-gen, flat-layer-composition, inline-obj-parent, no-casts, no-mixed-promise-effect-lifecycle, one-test-suite-per-module, test-real-scenario-not-narrower-proxy]
reviewId: 3a29cbe874b
---

_4 error(s), 10 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 3a29cbe874b-1 - ignored - no-casts - packages/plugins/plugin-google/src/operations/calendar/sync/sync-mock.test.ts:119
- 3a29cbe874b-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-google/src/operations/calendar/sync/sync.ts:87
- 3a29cbe874b-3 - ignored - flat-layer-composition - packages/plugins/plugin-google/src/operations/contacts/sync/sync.test.ts:108
- 3a29cbe874b-4 - ignored - flat-layer-composition - packages/plugins/plugin-linear/src/operations/sync.test.ts:509
- 3a29cbe874b-5 - ignored - inline-obj-parent - packages/plugins/plugin-linear/src/operations/sync.ts:249
- 3a29cbe874b-6 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-slack/src/operations/sync.ts:169
- 3a29cbe874b-7 - ignored - no-casts - packages/plugins/plugin-trello/src/operations/handlers.test.ts:138
- 3a29cbe874b-8 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-trello/src/operations/handlers.test.ts:138
- 3a29cbe874b-9 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-trello/src/operations/handlers.test.ts:153
- 3a29cbe874b-10 - ignored - one-test-suite-per-module - packages/plugins/plugin-trello/src/operations/handlers.test.ts:153
- 3a29cbe874b-11 - ignored - flat-layer-composition - packages/plugins/plugin-trello/src/operations/handlers.test.ts:213
- 3a29cbe874b-12 - ignored - no-casts - packages/plugins/plugin-trello/src/operations/sync.ts:429
- 3a29cbe874b-13 - resolved - no-casts - packages/sdk/app-toolkit/src/app-framework/progress-reporter.test.ts:22
- 3a29cbe874b-14 - resolved - effect-fn-not-hand-wrapped-gen - packages/sdk/app-toolkit/src/app-framework/progress-reporter.ts:82

## Issues

# ERROR 3a29cbe874b-1 no-casts `packages/plugins/plugin-google/src/operations/calendar/sync/sync-mock.test.ts:119`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 119-130 (`expect(events[0]!.owner).toEqual({});`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3a29cbe874b-2 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-google/src/operations/calendar/sync/sync.ts:87`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 87-98 (`export const syncCalendar = ({`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3a29cbe874b-3 flat-layer-composition `packages/plugins/plugin-google/src/operations/contacts/sync/sync.test.ts:108`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 108-119 (`Binding.syncAll({ connection: Ref.make(connection), sync: syncContactGroup })...`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3a29cbe874b-4 flat-layer-composition `packages/plugins/plugin-linear/src/operations/sync.test.ts:509`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 509-520 (`const traceLayer = Trace.testTraceService().pipe(`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3a29cbe874b-5 inline-obj-parent `packages/plugins/plugin-linear/src/operations/sync.ts:249`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.83. The likeliest place is lines 249-264 (`taskSet.milestones.push(Ref.make(milestone));`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3a29cbe874b-6 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-slack/src/operations/sync.ts:169`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 169-180 (`const resolveUsers = (`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3a29cbe874b-7 no-casts `packages/plugins/plugin-trello/src/operations/handlers.test.ts:138`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 138-152 (`const stubOperationService = Effect.provideService(Operation.Service, {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3a29cbe874b-8 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-trello/src/operations/handlers.test.ts:138`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 138-152 (`const stubOperationService = Effect.provideService(Operation.Service, {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3a29cbe874b-9 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-trello/src/operations/handlers.test.ts:153`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.81. The likeliest place is lines 153-164 (`describe('Trello operation handlers (e2e with stubbed API)', () => {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3a29cbe874b-10 one-test-suite-per-module `packages/plugins/plugin-trello/src/operations/handlers.test.ts:153`

System One judges this a likely violation of `one-test-suite-per-module` (A module's tests live in its one test file; an operation's tests in a suite named after it), p=0.83. The likeliest place is lines 153-164 (`describe('Trello operation handlers (e2e with stubbed API)', () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3a29cbe874b-11 flat-layer-composition `packages/plugins/plugin-trello/src/operations/handlers.test.ts:213`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 213-224 (`.pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3a29cbe874b-12 no-casts `packages/plugins/plugin-trello/src/operations/sync.ts:429`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 429-440 (`const snapshot = (Cursor.readSnapshot<CardSnapshot>(binding, foreignId) ?? {}...`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3a29cbe874b-13 no-casts `packages/sdk/app-toolkit/src/app-framework/progress-reporter.test.ts:22`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 22-36 (`const setup = () => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3a29cbe874b-14 effect-fn-not-hand-wrapped-gen `packages/sdk/app-toolkit/src/app-framework/progress-reporter.ts:82`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 82-90 (`export const withReporter = <A, E, R>(`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `ace6ed8f423b3fef498eb2be469c5cd85c765c3b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 14 violations written to fragments, 228 uncertain, 863 clean, 0 unanswered
- left for an agentic reviewer: 64 batch(es)

```text
requests: 425 (171 verdicts re-asked with context the model requested)
estimated input tokens: 4139238
billed input tokens: 3841857 (cost $0.1614)
measured chars per token: 3.23
```

### Resolution notes

- -13 and -14 are fixed: the reporter test builds its message with `Obj.make(Trace.Message, …)` instead of a cast, and `withReporter` is an `Effect.fnUntraced`.
- -1, -5, -6, -7, -8, -9, -10, -11 and -12 are ignored as out of scope: each flags a line this branch does not change. The classifier reads the whole file.
- -2 is ignored: `syncCalendar` was already `({…}) => Effect.gen(…)` with an explicit return type (kept for TS2883, per its comment); this branch only adds `Trace.TraceService` to that type.
- -3 and -4 are ignored: each is a per-test trace layer built around that test's own collector array, which the rule exempts as a layer parameterized per call.

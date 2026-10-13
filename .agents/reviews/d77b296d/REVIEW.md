---
branch: dm/trusting-wozniak-7zjf30
commit: d77b296da22fe78aafa8817a1cad74a1ad7ba9d8
base: b7504c92f5263b796b11ffe2f12e7cb7a7920cfb
mode: fast
createdAt: 2026-10-12T11:58:07.904Z
isFinalized: true
groups: 73
rules: [comment-hygiene, consistent-private-field-convention, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, no-casts, no-sleep-in-test, structured-logging-not-console]
reviewId: d77b296d
---

_5 error(s), 7 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- d77b296d-1 - ignored - comment-hygiene - packages/core/echo/echo-client/src/query/working-set-executor.test.ts:18
- d77b296d-2 - ignored - no-casts - packages/core/echo/echo-client/src/query/working-set-executor.test.ts:438
- d77b296d-3 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/query/query-executor.ts:260
- d77b296d-4 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-executor.ts:643
- d77b296d-5 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/query/query-executor.ts:667
- d77b296d-6 - ignored - structured-logging-not-console - packages/core/echo/echo-host/src/query/query-executor.ts:835
- d77b296d-7 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-planner.ts:255
- d77b296d-8 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/query/sql/compile.test.ts:134
- d77b296d-9 - ignored - no-sleep-in-test - packages/core/echo/echo-react/src/usePagination.test.tsx:99
- d77b296d-10 - ignored - no-sleep-in-test - packages/core/echo/echo-sqlite/src/database.test.ts:52
- d77b296d-11 - ignored - no-casts - packages/core/echo/echo-sqlite/src/database.test.ts:722
- d77b296d-12 - ignored - no-casts - packages/core/echo/echo/src/Query.test.ts:624

## Issues

# WARN d77b296d-1 comment-hygiene `packages/core/echo/echo-client/src/query/working-set-executor.test.ts:18`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.90. The likeliest place is lines 18-29 (`class Wrapper extends Type.makeObject<Wrapper>(DXN.make('com.example.type.wra...`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d77b296d-2 no-casts `packages/core/echo/echo-client/src/query/working-set-executor.test.ts:438`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 438-449 (`const first = firstIndexByAge.get(age)!;`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN d77b296d-3 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:260`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.89. The likeliest place is lines 260-283 (`throw new Error('Invalid query item');`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d77b296d-4 no-casts `packages/core/echo/echo-host/src/query/query-executor.ts:643`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 643-666 (`const serializeItemGroupKey = (item: QueryItem): string => GroupBy.serializeG...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN d77b296d-5 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-executor.ts:667`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.86. The likeliest place is lines 667-690 (`private _plan: QueryPlan.Plan;`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN d77b296d-6 structured-logging-not-console `packages/core/echo/echo-host/src/query/query-executor.ts:835`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 835-858 (`this._trace = trace;`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d77b296d-7 no-casts `packages/core/echo/echo-host/src/query/query-planner.ts:255`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 255-278 (`default:`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN d77b296d-8 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/query/sql/compile.test.ts:134`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 134-149 (`const run = (fixture: Fixture, query: Query.Any) =>`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN d77b296d-9 no-sleep-in-test `packages/core/echo/echo-react/src/usePagination.test.tsx:99`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.84. The likeliest place is lines 99-110 (`expect(result.current.items).toHaveLength(6);`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN d77b296d-10 no-sleep-in-test `packages/core/echo/echo-sqlite/src/database.test.ts:52`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.96. The likeliest place is lines 52-73 (`const session = <A>(body: (db: SqliteDatabase) => Promise<A>, options: OpenOp...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d77b296d-11 no-casts `packages/core/echo/echo-sqlite/src/database.test.ts:722`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 722-733 (`expect(() => db.add(TestSchema.Person as never)).toThrow();`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d77b296d-12 no-casts `packages/core/echo/echo/src/Query.test.ts:624`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 624-647 (`const query = Query.type(TestSchema.Person).from(feed);`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `b7504c92f5263b796b11ffe2f12e7cb7a7920cfb`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 12 violations written to fragments, 320 uncertain, 263 clean, 0 unanswered
- left for an agentic reviewer: 60 batch(es)

```text
requests: 461 (201 verdicts re-asked with context the model requested)
estimated input tokens: 6790057
billed input tokens: 6766816 (cost $0.2842)
measured chars per token: 3.01
```

---
branch: claude/epic-mendel-1njewc
commit: 45757c5b231a6ae9ba74646c77010e44e7909654
base: b3a41d3447f0bfcbc4cc137b2f80ceb0091139ad
mode: fast
createdAt: 2026-11-09T15:35:02.220Z
isFinalized: true
groups: 81
rules: [effect-fn-not-hand-wrapped-gen, no-casts, operations-resolve-database-from-service, test-asserts-real-behavior]
reviewId: 45757c5b
---

_2 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 45757c5b-1 - ignored - operations-resolve-database-from-service - packages/core/compute/extractor-lib/src/contact.test.ts:55
- 45757c5b-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/extractor-lib/src/contact.ts:43
- 45757c5b-3 - ignored - test-asserts-real-behavior - packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:102
- 45757c5b-4 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:294
- 45757c5b-5 - ignored - no-casts - packages/sdk/schema/src/projection/projection.test.ts:716
- 45757c5b-6 - ignored - test-asserts-real-behavior - packages/sdk/schema/src/projection/projection.test.ts:884

## Issues

# WARN 45757c5b-1 operations-resolve-database-from-service `packages/core/compute/extractor-lib/src/contact.test.ts:55`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.80. The likeliest place is lines 55-66 (`const contact = await EffectEx.runPromise(buildContactFromActor({ name: 'Alic...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 45757c5b-2 effect-fn-not-hand-wrapped-gen `packages/core/compute/extractor-lib/src/contact.ts:43`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.91. The likeliest place is lines 43-54 (`export const buildContactFromActor = (`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 45757c5b-3 test-asserts-real-behavior `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:102`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.87. The likeliest place is lines 102-125 (`const Nested = Type.makeObject(DXN.make('com.example.type.testNested', '0.1.0...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 45757c5b-4 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:294`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 294-317 (`getSchemaReference(getSchemaProperty(jsonSchema, 'organization' as SchemaEx.J...`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 45757c5b-5 no-casts `packages/sdk/schema/src/projection/projection.test.ts:716`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 716-739 (`const emailId = projectionModel.getFields().find((f) => f.path === 'email')!.id;`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 45757c5b-6 test-asserts-real-behavior `packages/sdk/schema/src/projection/projection.test.ts:884`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.85. The likeliest place is lines 884-907 (`const projection = new ProjectionModel({`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `b3a41d3447f0bfcbc4cc137b2f80ceb0091139ad`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 140 uncertain, 143 clean, 0 unanswered
- left for an agentic reviewer: 65 batch(es)

```text
requests: 162 (107 verdicts re-asked with context the model requested)
estimated input tokens: 1719043
billed input tokens: 1722410 (cost $0.0723)
measured chars per token: 2.99
```

### Dismissals

- 45757c5b-1, -3, -4, -5, -6: the flagged lines (`contact.test.ts:55`, `json-schema.test.ts:102/294`, `projection.test.ts:716/884`) predate this PR; its edits to those files are the new `contact.test.ts` cases and the email `pattern` strings at `json-schema.test.ts:481/511` and `projection.test.ts:1059`.
- 45757c5b-2: `buildContactFromActor` was a hand-wrapped `Effect.gen` before this PR, which only adds a format guard inside it; converting it to `Effect.fn` is an unrelated refactor.

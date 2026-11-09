---
branch: claude/epic-mendel-1njewc
commit: b8f3a0146b56d4538594e492820e1ba5380f81df
base: b3a41d3447f0bfcbc4cc137b2f80ceb0091139ad
mode: fast
createdAt: 2026-11-09T15:40:01.143Z
isFinalized: true
groups: 82
rules: [minimal-precise-tests, no-casts, obj-update-push, operations-resolve-database-from-service, test-asserts-real-behavior]
reviewId: b8f3a014
---

_2 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- b8f3a014-1 - ignored - operations-resolve-database-from-service - packages/core/compute/extractor-lib/src/contact.test.ts:31
- b8f3a014-2 - ignored - obj-update-push - packages/core/compute/pipeline-email/src/stages/EmailStage.ts:199
- b8f3a014-3 - ignored - test-asserts-real-behavior - packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:102
- b8f3a014-4 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:126
- b8f3a014-5 - ignored - no-casts - packages/sdk/schema/src/projection/projection.test.ts:716
- b8f3a014-6 - ignored - test-asserts-real-behavior - packages/sdk/schema/src/projection/projection.test.ts:884
- b8f3a014-7 - ignored - minimal-precise-tests - packages/sdk/schema/src/projection/projection.test.ts:1028

## Issues

# WARN b8f3a014-1 operations-resolve-database-from-service `packages/core/compute/extractor-lib/src/contact.test.ts:31`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.80. The likeliest place is lines 31-42 (`test('returns undefined when the actor has no email', async ({ expect }) => {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN b8f3a014-2 obj-update-push `packages/core/compute/pipeline-email/src/stages/EmailStage.ts:199`

System One judges this a likely violation of `obj-update-push` (Append inside Obj.update with push, not spread), p=0.94. The likeliest place is lines 199-210 (`}`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN b8f3a014-3 test-asserts-real-behavior `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:102`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.88. The likeliest place is lines 102-125 (`const Nested = Type.makeObject(DXN.make('com.example.type.testNested', '0.1.0...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b8f3a014-4 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:126`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 126-149 (`Schema.Struct({`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b8f3a014-5 no-casts `packages/sdk/schema/src/projection/projection.test.ts:716`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 716-739 (`const emailId = projectionModel.getFields().find((f) => f.path === 'email')!.id;`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b8f3a014-6 test-asserts-real-behavior `packages/sdk/schema/src/projection/projection.test.ts:884`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.85. The likeliest place is lines 884-907 (`const projection = new ProjectionModel({`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN b8f3a014-7 minimal-precise-tests `packages/sdk/schema/src/projection/projection.test.ts:1028`

System One judges this a likely violation of `minimal-precise-tests` (Add the fewest tests that pin the change, each precise and readable), p=0.81. The likeliest place is lines 1028-1051 (`test('Email validation persists after schema registration round-trip', async ...`, location confidence 0.29). Judged with added `diff, test` context after a first pass of 0.70. This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `b3a41d3447f0bfcbc4cc137b2f80ceb0091139ad`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 7 violations written to fragments, 160 uncertain, 133 clean, 0 unanswered
- left for an agentic reviewer: 68 batch(es)

```text
requests: 163 (112 verdicts re-asked with context the model requested)
estimated input tokens: 1887057
billed input tokens: 1884501 (cost $0.0791)
measured chars per token: 3.00
```

### Dismissals

- b8f3a014-1, -3, -4, -5, -6: carried from the earlier store; the flagged lines predate this PR, whose edits to those files are the new `contact.test.ts` case and the email `pattern` strings.
- b8f3a014-2: `EmailStage.ts:199` is the existing `processAttachments` loop; this PR changes only `extractContacts` (lines 145-158).
- b8f3a014-7: `Email validation persists after schema registration round-trip` predates this PR, which only updates the pattern string it asserts.

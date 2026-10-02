---
branch: dm/vibrant-tesla-zz757b
commit: 1f0edc6f5ef57a08ecbed1e7f38358809a22aa2f
base: e65ca2f7534ac375fa6d792f868b86db551009bd
mode: fast
createdAt: 2026-10-02T13:58:20.045Z
isFinalized: true
groups: 59
rules: [no-casts, test-asserts-real-behavior]
reviewId: 1f0edc6f
---

_3 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 1f0edc6f-1 - ignored - no-casts - packages/core/echo/echo/src/internal/Annotation/annotations.test.ts:139
- 1f0edc6f-2 - ignored - no-casts - packages/core/echo/echo/src/internal/Annotation/annotations.ts:191
- 1f0edc6f-3 - ignored - test-asserts-real-behavior - packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:74
- 1f0edc6f-4 - ignored - no-casts - packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:122

## Issues

# ERROR 1f0edc6f-1 no-casts `packages/core/echo/echo/src/internal/Annotation/annotations.test.ts:139`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 139-150 (`name: 'Primary Name',`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1f0edc6f-2 no-casts `packages/core/echo/echo/src/internal/Annotation/annotations.ts:191`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 191-208 (`export const setTypename = (obj: any, typename: URI.URI): void => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1f0edc6f-3 test-asserts-real-behavior `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:74`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.87. The likeliest place is lines 74-97 (`test.skip('reference annotation with lookup property', () => {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1f0edc6f-4 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts:122`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 122-145 (`expectReferenceAnnotation(jsonSchema.properties!.name);`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `e65ca2f7534ac375fa6d792f868b86db551009bd`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 162 uncertain, 327 clean, 0 unanswered
- left for an agentic reviewer: 38 batch(es)

```text
requests: 277 (115 verdicts re-asked with context the model requested)
estimated input tokens: 1972466
billed input tokens: 1889355 (cost $0.0794)
measured chars per token: 3.13
```

---
branch: claude/gmail-sync-preview-edge-9ebb32
commit: 01169928579554021756d6e0b53c99f25b3682f9
base: c63706215b0d57dde34e968a521749b11720152b
mode: fast
createdAt: 2026-11-10T18:07:00.818Z
isFinalized: true
groups: 86
rules: [no-casts, no-try-catch-in-effect-code, test-asserts-real-behavior]
reviewId: 0116992857
---

_4 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 0116992857-1 - ignored - no-casts - packages/core/compute/link/src/Cursor.test.ts:668
- 0116992857-2 - ignored - no-casts - packages/core/echo/echo-client/src/echo-handler/echo-handler.test.ts:42
- 0116992857-3 - ignored - test-asserts-real-behavior - packages/core/echo/echo-client/src/echo-handler/echo-handler.test.ts:792
- 0116992857-4 - ignored - no-casts - packages/core/echo/echo-client/src/echo-handler/echo-handler.ts:742
- 0116992857-5 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:27
- 0116992857-6 - resolved - no-casts - packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:179

## Issues

# ERROR 0116992857-1 no-casts `packages/core/compute/link/src/Cursor.test.ts:668`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 668-693 (`expect(state.foreignIndex!.get('id-10')).toBe(items[0].id);`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 0116992857-2 no-casts `packages/core/echo/echo-client/src/echo-handler/echo-handler.test.ts:42`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 42-58 (`test('id property name is reserved', () => {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0116992857-3 test-asserts-real-behavior `packages/core/echo/echo-client/src/echo-handler/echo-handler.test.ts:792`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.84. The likeliest place is lines 792-803 (`describe('isDeleted', () => {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 0116992857-4 no-casts `packages/core/echo/echo-client/src/echo-handler/echo-handler.ts:742`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 742-765 (`const foreignDatabase = getEchoDatabase((getProxyTarget(otherEchoObj) as Prox...`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0116992857-5 no-try-catch-in-effect-code `packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:27`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.91. The likeliest place is lines 27-38 (`export const assertsWithDetail = (schema: Schema.Top, value: unknown, basePat...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 0116992857-6 no-casts `packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:179`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 179-190 (`public static isOptionalProperty(target: any, prop: string | symbol): boolean {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `c63706215b0d57dde34e968a521749b11720152b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 144 uncertain, 65 clean, 0 unanswered
- left for an agentic reviewer: 69 batch(es)

```text
requests: 142 (107 verdicts re-asked with context the model requested)
estimated input tokens: 2842445
billed input tokens: 2931513 (cost $0.1231)
measured chars per token: 2.91
```

### Notes

- 0116992857-1, -2, -3, -4: the flagged lines (`Cursor.test.ts:668`, `echo-handler.test.ts:42`, `echo-handler.test.ts:792`, `echo-handler.ts:742`) predate this PR and lie outside its hunks; out of scope.
- 0116992857-5: `assertsWithDetail` is synchronous, non-Effect code whose job is to catch the error `Schema.asserts` throws; the try/catch predates this PR, which only adds `basePath`.
- 0116992857-6: the flagged `isOptionalProperty(target: any)` predates this PR; the adjacent new `isOptionalPropertyAt` now takes `getProperty: (path: KeyPath) => unknown` instead of `any`.

---
branch: claude/gmail-sync-preview-edge-9ebb32
commit: d5c6f3030d59e1121ce900c4cedd09f76006f115
base: c63706215b0d57dde34e968a521749b11720152b
mode: fast
createdAt: 2026-11-10T19:23:36.968Z
isFinalized: true
groups: 86
rules: [no-casts, no-try-catch-in-effect-code, test-asserts-real-behavior]
reviewId: d5c6f3030d
---

_4 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- d5c6f3030d-1 - ignored - no-casts - packages/core/compute/link/src/Cursor.test.ts:668
- d5c6f3030d-2 - ignored - test-asserts-real-behavior - packages/core/echo/echo-client/src/echo-handler/echo-handler.test.ts:163
- d5c6f3030d-3 - ignored - no-casts - packages/core/echo/echo-client/src/echo-handler/echo-handler.test.ts:693
- d5c6f3030d-4 - ignored - no-casts - packages/core/echo/echo-client/src/echo-handler/echo-handler.ts:1017
- d5c6f3030d-5 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:27
- d5c6f3030d-6 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:179

## Issues

# ERROR d5c6f3030d-1 no-casts `packages/core/compute/link/src/Cursor.test.ts:668`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 668-693 (`expect(state.foreignIndex!.get('id-10')).toBe(items[0].id);`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN d5c6f3030d-2 test-asserts-real-behavior `packages/core/echo/echo-client/src/echo-handler/echo-handler.test.ts:163`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.83. The likeliest place is lines 163-174 (`prepareAstForCompare(NestedSchema.ast),`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d5c6f3030d-3 no-casts `packages/core/echo/echo-client/src/echo-handler/echo-handler.test.ts:693`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 693-716 (`expect(person.previousEmployment![0]!.target?.name).to.eq('DXOS');`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d5c6f3030d-4 no-casts `packages/core/echo/echo-client/src/echo-handler/echo-handler.ts:1017`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 1017-1045 (`const seededMeta = (obj as any)[MetaId] as EntityMeta | undefined;`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN d5c6f3030d-5 no-try-catch-in-effect-code `packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:27`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.90. The likeliest place is lines 27-38 (`export const assertsWithDetail = (schema: Schema.Top, value: unknown, basePat...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d5c6f3030d-6 no-casts `packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:179`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 179-190 (`public static isOptionalProperty(target: any, prop: string | symbol): boolean {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `c63706215b0d57dde34e968a521749b11720152b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 145 uncertain, 64 clean, 0 unanswered
- left for an agentic reviewer: 70 batch(es)

```text
requests: 143 (106 verdicts re-asked with context the model requested)
estimated input tokens: 2895843
billed input tokens: 2986974 (cost $0.1255)
measured chars per token: 2.91
```

### Notes

- d5c6f3030d-1 to -4: the flagged lines (`Cursor.test.ts:668`, `echo-handler.test.ts:163`, `echo-handler.test.ts:693`, `echo-handler.ts:1017`) predate this PR and lie outside its hunks; out of scope.
- d5c6f3030d-5: `assertsWithDetail` is synchronous, non-Effect code whose job is to catch the error `Schema.asserts` throws; the try/catch predates this PR, which only adds `basePath`.
- d5c6f3030d-6: the flagged `isOptionalProperty(target: any)` predates this PR and lies outside its hunks; the adjacent new `getClearedKey` takes `getProperty: (path: KeyPath) => unknown`, with no cast or `any`.

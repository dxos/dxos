---
branch: worktree-boot-sqlite-writes
commit: c6a7e3bb57866ec4c123d0a310f17ff8e16dd473
base: ce355a78543a5ce52913e81d87b3548025a2138b
mode: fast
createdAt: 2026-10-03T07:05:32.438Z
isFinalized: true
groups: 59
rules: [effect-fn-not-hand-wrapped-gen, inline-obj-parent, no-casts, no-mixed-promise-effect-lifecycle, no-sleep-in-test]
reviewId: c6a7e3bb
---

_3 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- c6a7e3bb-1 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/space-state-manager.test.ts:246
- c6a7e3bb-2 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/db-host/space-state-manager.test.ts:414
- c6a7e3bb-3 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165
- c6a7e3bb-4 - resolved - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/metadata/sqlite-metadata-store.test.ts:33
- c6a7e3bb-5 - ignored - no-casts - packages/sdk/client-services/src/SqliteStorage.test.ts:44
- c6a7e3bb-6 - resolved - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/SqliteStorage.test.ts:69
- c6a7e3bb-7 - ignored - no-casts - packages/sdk/client-services/src/SqliteStorage.ts:389
- c6a7e3bb-8 - ignored - inline-obj-parent - packages/stories/stories-assistant/src/testing/decorators.tsx:348

## Issues

# ERROR c6a7e3bb-1 no-casts `packages/core/echo/echo-host/src/db-host/space-state-manager.test.ts:246`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 246-257 (`const root = await host.loadDoc<SpaceRoot>(Context.default(), spaceRootUrl);`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN c6a7e3bb-2 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/space-state-manager.test.ts:414`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 414-425 (`});`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN c6a7e3bb-3 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.86. The likeliest place is lines 165-176 (`async removeSpace(spaceId: SpaceId): Promise<void> {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN c6a7e3bb-4 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/metadata/sqlite-metadata-store.test.ts:33`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 33-44 (`Effect.gen(function* () {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c6a7e3bb-5 no-casts `packages/sdk/client-services/src/SqliteStorage.test.ts:44`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 44-56 (`test('is safe on null / undefined / non-error values', () => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN c6a7e3bb-6 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/SqliteStorage.test.ts:69`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 69-80 (`const sql = yield* SqlClient.SqlClient;`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c6a7e3bb-7 no-casts `packages/sdk/client-services/src/SqliteStorage.ts:389`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 389-400 (`const getOrCreateFile = (path: string, filename: string): File => {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN c6a7e3bb-8 inline-obj-parent `packages/stories/stories-assistant/src/testing/decorators.tsx:348`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.87. The likeliest place is lines 348-359 (`ServiceResolver.provide({ space: space.id }, Database.Service).pipe(`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `ce355a78543a5ce52913e81d87b3548025a2138b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 8 violations written to fragments, 191 uncertain, 117 clean, 0 unanswered
- left for an agentic reviewer: 50 batch(es)

```text
requests: 201 (113 verdicts re-asked with context the model requested)
estimated input tokens: 1910425
billed input tokens: 1880019 (cost $0.0790)
measured chars per token: 3.05
```

---
branch: claude/document-drag-sync-collections-f5663e
commit: 8615dcddcc6dcb97d98d211dcd0cd9173153d19e
base: 49e30c02e7f7a0c00c107c6d21e1194749272d87
mode: fast
createdAt: 2026-10-01T13:14:57.737Z
isFinalized: true
groups: 65
rules: [effect-fn-not-hand-wrapped-gen, error-messages-carry-context, no-casts]
reviewId: 8615dcddcc6
---

_4 error(s), 2 warning(s)._

# ERROR 8615dcddcc6-1 no-casts `packages/core/echo/echo-client/src/proxy-db/database.test.ts:878`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 878-901 (`const included = Ref.atom(person.tasks!, { deleted: 'include' });`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8615dcddcc6-2 no-casts `packages/core/echo/echo/src/internal/Ref/atoms.ts:21`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 21-32 (`export const refFamily = Atom.family(`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8615dcddcc6-3 no-casts `packages/core/echo/echo/src/internal/Ref/ref.ts:336`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 336-353 (`export type JsonSchemaReferenceInfo = {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8615dcddcc6-4 error-messages-carry-context `packages/core/echo/echo/src/internal/Ref/ref.ts:610`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.90. The likeliest place is lines 610-633 (`}`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8615dcddcc6-5 no-casts `packages/core/echo/echo/src/Ref.ts:69`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 69-74 (`<S extends internal.UnknownTypeSchema<any, any>>(schema: S): RefSchema<Schema...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8615dcddcc6-6 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts:319`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 319-330 (`Effect.gen(function* () {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

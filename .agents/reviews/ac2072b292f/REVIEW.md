---
branch: claude/document-drag-sync-collections-f5663e
commit: ac2072b292ff49a2a8ea7ebeb8369312ac2e9e59
base: 8615dcddcc6dcb97d98d211dcd0cd9173153d19e
mode: fast
createdAt: 2026-10-01T14:04:56.324Z
isFinalized: true
groups: 65
rules: [effect-fn-not-hand-wrapped-gen, error-messages-carry-context, no-casts]
reviewId: ac2072b292f
---

_4 error(s), 2 warning(s)._

# ERROR ac2072b292f-1 no-casts `packages/core/echo/echo-client/src/proxy-db/database.test.ts:878`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 878-901 (`const included = Obj.atomReactive(person.tasks!, { deleted: 'include' });`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ac2072b292f-2 no-casts `packages/core/echo/echo/src/internal/Obj/atoms.ts:45`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 45-56 (`const objectFamily = Atom.family(<T extends Obj.Unknown>(obj: T): Atom.Atom<O...`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ac2072b292f-3 no-casts `packages/core/echo/echo/src/internal/Ref/ref.ts:346`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 346-358 (`const EncodedReferenceSchema = Schema.Struct({ '/': Schema.String }) as unkno...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN ac2072b292f-4 error-messages-carry-context `packages/core/echo/echo/src/internal/Ref/ref.ts:618`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.88. The likeliest place is lines 618-641 (`async load(options?: LoadOptions): Promise<T> {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ac2072b292f-5 no-casts `packages/core/echo/echo/src/Ref.ts:68`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 68-73 (`<S extends internal.UnknownTypeSchema<any, any>>(schema: S): RefSchema<Schema...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN ac2072b292f-6 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts:319`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 319-330 (`Effect.gen(function* () {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

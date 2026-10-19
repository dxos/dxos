---
branch: HEAD
commit: aef58663c84fb4aa96909462c71cfc0408da9e1b
base: 362fd0f7bcf94a49bd1fca8b53a478f6f3e21383
mode: fast
createdAt: 2026-10-02T09:16:50.524Z
isFinalized: true
groups: 102
rules: [comment-hygiene, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, no-casts, schema-declare-and-brand]
reviewId: aef58663
---

_13 error(s), 8 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- aef58663-1 - ignored - schema-declare-and-brand - packages/core/echo/echo/src/Database.ts:511
- aef58663-2 - ignored - no-casts - packages/core/echo/echo/src/Database.ts:607
- aef58663-3 - ignored - no-casts - packages/core/echo/echo/src/Entity.ts:75
- aef58663-4 - ignored - no-casts - packages/core/echo/echo/src/Filter.ts:188
- aef58663-5 - ignored - error-messages-carry-context - packages/core/echo/echo/src/Filter.ts:688
- aef58663-6 - ignored - no-casts - packages/core/echo/echo/src/internal/Ref/ref.ts:366
- aef58663-7 - ignored - error-messages-carry-context - packages/core/echo/echo/src/internal/Ref/ref.ts:638
- aef58663-8 - ignored - no-casts - packages/core/echo/echo/src/Json.ts:30
- aef58663-9 - ignored - comment-hygiene - packages/core/echo/echo/src/Json.ts:53
- aef58663-10 - ignored - error-messages-carry-context - packages/core/echo/echo/src/Migration.ts:124
- aef58663-11 - ignored - no-casts - packages/core/echo/echo/src/Migration.ts:136
- aef58663-12 - ignored - no-casts - packages/core/echo/echo/src/Obj.ts:202
- aef58663-13 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo/src/Obj.ts:287
- aef58663-14 - ignored - no-casts - packages/core/echo/echo/src/Order.ts:20
- aef58663-15 - ignored - no-casts - packages/core/echo/echo/src/Query.ts:357
- aef58663-16 - ignored - no-casts - packages/core/echo/echo/src/Ref.ts:70
- aef58663-17 - ignored - no-casts - packages/core/echo/echo/src/Registry.ts:170
- aef58663-18 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo/src/Registry.ts:170
- aef58663-19 - ignored - error-messages-carry-context - packages/core/echo/echo/src/Relation.ts:158
- aef58663-20 - ignored - no-casts - packages/core/echo/echo/src/Relation.ts:182
- aef58663-21 - ignored - no-casts - packages/core/echo/echo/src/Type.ts:185

## Issues

# WARN aef58663-1 schema-declare-and-brand `packages/core/echo/echo/src/Database.ts:511`

System One judges this a likely violation of `schema-declare-and-brand` (Use Schema.declare and Brand instead of hand-rolling the equivalent machinery), p=0.89. The likeliest place is lines 511-519 (`export const isDatabase = (obj: unknown): obj is Database => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing code. This PR adds only JSDoc (`@performance` lines and one-line summaries; the sole non-comment line turns `Filter.id`'s `/*` into `/**`), so the flagged casts, error messages and `Effect.gen` wrappers are untouched by it and out of its scope.

# ERROR aef58663-2 no-casts `packages/core/echo/echo/src/Database.ts:607`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 607-632 (`if (!object) {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing code. This PR adds only JSDoc (`@performance` lines and one-line summaries; the sole non-comment line turns `Filter.id`'s `/*` into `/**`), so the flagged casts, error messages and `Effect.gen` wrappers are untouched by it and out of its scope.

# ERROR aef58663-3 no-casts `packages/core/echo/echo/src/Entity.ts:75`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 75-82 (`export const Unknown: Schema.Codec<Unknown> = Schema.StructWithRest(Schema.St...`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing code. This PR adds only JSDoc (`@performance` lines and one-line summaries; the sole non-comment line turns `Filter.id`'s `/*` into `/**`), so the flagged casts, error messages and `Effect.gen` wrappers are untouched by it and out of its scope.

# ERROR aef58663-4 no-casts `packages/core/echo/echo/src/Filter.ts:188`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 188-211 (`): Filter<Schema.Schema.Type<S>>;`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing code. This PR adds only JSDoc (`@performance` lines and one-line summaries; the sole non-comment line turns `Filter.id`'s `/*` into `/**`), so the flagged casts, error messages and `Effect.gen` wrappers are untouched by it and out of its scope.

# WARN aef58663-5 error-messages-carry-context `packages/core/echo/echo/src/Filter.ts:688`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.86. The likeliest place is lines 688-706 (`Object.entries(predicate).map(([key, value]) => [key, processPredicate(value)]),`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing code. This PR adds only JSDoc (`@performance` lines and one-line summaries; the sole non-comment line turns `Filter.id`'s `/*` into `/**`), so the flagged casts, error messages and `Effect.gen` wrappers are untouched by it and out of its scope.

# ERROR aef58663-6 no-casts `packages/core/echo/echo/src/internal/Ref/ref.ts:366`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 366-378 (`const EncodedReferenceSchema = Schema.Struct({ '/': Schema.String }) as unkno...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing code. This PR adds only JSDoc (`@performance` lines and one-line summaries; the sole non-comment line turns `Filter.id`'s `/*` into `/**`), so the flagged casts, error messages and `Effect.gen` wrappers are untouched by it and out of its scope.

# WARN aef58663-7 error-messages-carry-context `packages/core/echo/echo/src/internal/Ref/ref.ts:638`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.90. The likeliest place is lines 638-661 (`async load(options?: LoadOptions): Promise<T> {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing code. This PR adds only JSDoc (`@performance` lines and one-line summaries; the sole non-comment line turns `Filter.id`'s `/*` into `/**`), so the flagged casts, error messages and `Effect.gen` wrappers are untouched by it and out of its scope.

# ERROR aef58663-8 no-casts `packages/core/echo/echo/src/Json.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 30-41 (`const toJson = (obj: Obj.Any): unknown => (typeof (obj as any).toJSON === 'fu...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing code. This PR adds only JSDoc (`@performance` lines and one-line summaries; the sole non-comment line turns `Filter.id`'s `/*` into `/**`), so the flagged casts, error messages and `Effect.gen` wrappers are untouched by it and out of its scope.

# WARN aef58663-9 comment-hygiene `packages/core/echo/echo/src/Json.ts:53`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 53-64 (`export const createRefReplacer = ({ db, depth = 1 }: CreateRefReplacerOptions...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing code. This PR adds only JSDoc (`@performance` lines and one-line summaries; the sole non-comment line turns `Filter.id`'s `/*` into `/**`), so the flagged casts, error messages and `Effect.gen` wrappers are untouched by it and out of its scope.

# WARN aef58663-10 error-messages-carry-context `packages/core/echo/echo/src/Migration.ts:124`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 124-135 (`export const define = <From extends MigrationSchemaInput, To extends Migratio...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing code. This PR adds only JSDoc (`@performance` lines and one-line summaries; the sole non-comment line turns `Filter.id`'s `/*` into `/**`), so the flagged casts, error messages and `Effect.gen` wrappers are untouched by it and out of its scope.

# ERROR aef58663-11 no-casts `packages/core/echo/echo/src/Migration.ts:136`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 136-147 (`}`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing code. This PR adds only JSDoc (`@performance` lines and one-line summaries; the sole non-comment line turns `Filter.id`'s `/*` into `/**`), so the flagged casts, error messages and `Effect.gen` wrappers are untouched by it and out of its scope.

# ERROR aef58663-12 no-casts `packages/core/echo/echo/src/Obj.ts:202`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 202-249 (`const value = (props as any)[sym];`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing code. This PR adds only JSDoc (`@performance` lines and one-line summaries; the sole non-comment line turns `Filter.id`'s `/*` into `/**`), so the flagged casts, error messages and `Effect.gen` wrappers are untouched by it and out of its scope.

# WARN aef58663-13 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo/src/Obj.ts:287`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 287-324 (`export const getReactive = <T extends Unknown>(snapshot: Snapshot<T>): Effect...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing code. This PR adds only JSDoc (`@performance` lines and one-line summaries; the sole non-comment line turns `Filter.id`'s `/*` into `/**`), so the flagged casts, error messages and `Effect.gen` wrappers are untouched by it and out of its scope.

# ERROR aef58663-14 no-casts `packages/core/echo/echo/src/Order.ts:20`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 20-31 (`class OrderClass implements Order<any> {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing code. This PR adds only JSDoc (`@performance` lines and one-line summaries; the sole non-comment line turns `Filter.id`'s `/*` into `/**`), so the flagged casts, error messages and `Effect.gen` wrappers are untouched by it and out of its scope.

# ERROR aef58663-15 no-casts `packages/core/echo/echo/src/Query.ts:357`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 357-380 (`class QueryClass implements Any {`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing code. This PR adds only JSDoc (`@performance` lines and one-line summaries; the sole non-comment line turns `Filter.id`'s `/*` into `/**`), so the flagged casts, error messages and `Effect.gen` wrappers are untouched by it and out of its scope.

# ERROR aef58663-16 no-casts `packages/core/echo/echo/src/Ref.ts:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 70-80 (`<S extends internal.UnknownTypeSchema<any, any>>(schema: S): RefSchema<Schema...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing code. This PR adds only JSDoc (`@performance` lines and one-line summaries; the sole non-comment line turns `Filter.id`'s `/*` into `/**`), so the flagged casts, error messages and `Effect.gen` wrappers are untouched by it and out of its scope.

# ERROR aef58663-17 no-casts `packages/core/echo/echo/src/Registry.ts:170`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 170-181 (`export const runQuery: {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing code. This PR adds only JSDoc (`@performance` lines and one-line summaries; the sole non-comment line turns `Filter.id`'s `/*` into `/**`), so the flagged casts, error messages and `Effect.gen` wrappers are untouched by it and out of its scope.

# WARN aef58663-18 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo/src/Registry.ts:170`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 170-181 (`export const runQuery: {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing code. This PR adds only JSDoc (`@performance` lines and one-line summaries; the sole non-comment line turns `Filter.id`'s `/*` into `/**`), so the flagged casts, error messages and `Effect.gen` wrappers are untouched by it and out of its scope.

# WARN aef58663-19 error-messages-carry-context `packages/core/echo/echo/src/Relation.ts:158`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 158-181 (`export const make = <T extends Type.AnyRelation>(`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing code. This PR adds only JSDoc (`@performance` lines and one-line summaries; the sole non-comment line turns `Filter.id`'s `/*` into `/**`), so the flagged casts, error messages and `Effect.gen` wrappers are untouched by it and out of its scope.

# ERROR aef58663-20 no-casts `packages/core/echo/echo/src/Relation.ts:182`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 182-203 (`return internal.makeObject(schema as any, props as any, meta, type as any) as...`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing code. This PR adds only JSDoc (`@performance` lines and one-line summaries; the sole non-comment line turns `Filter.id`'s `/*` into `/**`), so the flagged casts, error messages and `Effect.gen` wrappers are untouched by it and out of its scope.

# ERROR aef58663-21 no-casts `packages/core/echo/echo/src/Type.ts:185`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 185-202 (`export const makeObjectFromJsonSchema = (props: MakeTypeProps): Type<typeInte...`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing code. This PR adds only JSDoc (`@performance` lines and one-line summaries; the sole non-comment line turns `Filter.id`'s `/*` into `/**`), so the flagged casts, error messages and `Effect.gen` wrappers are untouched by it and out of its scope.

## Appendix

### System One pass

- model: jev-latest
- base for context: `362fd0f7bcf94a49bd1fca8b53a478f6f3e21383`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 21 violations written to fragments, 151 uncertain, 844 clean, 0 unanswered
- left for an agentic reviewer: 46 batch(es)

```text
requests: 421 (83 verdicts re-asked with context the model requested)
estimated input tokens: 4522959
billed input tokens: 4280604 (cost $0.1798)
measured chars per token: 3.17
```

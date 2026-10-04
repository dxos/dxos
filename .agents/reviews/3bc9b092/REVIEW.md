---
branch: dm/beautiful-hopper-yb8au3
commit: 3bc9b0927598eae52319993430468da9a9378382
base: cbc22c6b38cdf91b6a9641af61f5991f5096cc00
mode: fast
createdAt: 2026-10-04T18:17:40.354Z
isFinalized: true
groups: 158
rules: [consistent-private-field-convention, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, name-for-general-behavior, no-casts, no-mixed-promise-effect-lifecycle, schema-declare-and-brand, structured-logging-not-console, use-context-scoped-cancellation]
reviewId: 3bc9b092
---

_19 error(s), 12 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 3bc9b092-1 - ignored - error-messages-carry-context - packages/core/echo/echo-client/src/feed/feed-handle.ts:487
- 3bc9b092-2 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/feed/feed-handle.ts:751
- 3bc9b092-3 - ignored - error-messages-carry-context - packages/core/echo/echo-client/src/proxy-db/database.ts:532
- 3bc9b092-4 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/query/query-executor.ts:639
- 3bc9b092-5 - ignored - structured-logging-not-console - packages/core/echo/echo-host/src/query/query-executor.ts:807
- 3bc9b092-6 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/query/query-executor.ts:1697
- 3bc9b092-7 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-executor.ts:1841
- 3bc9b092-8 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-planner.test.ts:1782
- 3bc9b092-9 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-planner.ts:1334
- 3bc9b092-10 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-sqlite/src/database.ts:199
- 3bc9b092-11 - ignored - schema-declare-and-brand - packages/core/echo/echo/src/Database.ts:522
- 3bc9b092-12 - ignored - no-casts - packages/core/echo/echo/src/Database.ts:618
- 3bc9b092-13 - ignored - no-casts - packages/core/echo/echo/src/Entity.ts:75
- 3bc9b092-14 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/json-serializer.ts:29
- 3bc9b092-15 - ignored - name-for-general-behavior - packages/core/echo/echo/src/internal/common/types/model-symbols.ts:1
- 3bc9b092-16 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/entity.ts:249
- 3bc9b092-17 - resolved - no-casts - packages/core/echo/echo/src/internal/Entity/event.ts:35
- 3bc9b092-18 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/guard.ts:12
- 3bc9b092-19 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/object.ts:91
- 3bc9b092-20 - ignored - no-casts - packages/core/echo/echo/src/internal/Obj/create-object.ts:68
- 3bc9b092-21 - ignored - error-messages-carry-context - packages/core/echo/echo/src/internal/Obj/create-object.ts:68
- 3bc9b092-22 - ignored - no-casts - packages/core/echo/echo/src/internal/Obj/json-serializer.ts:260
- 3bc9b092-23 - ignored - no-casts - packages/core/echo/echo/src/internal/Ref/ref.ts:376
- 3bc9b092-24 - ignored - no-casts - packages/core/echo/echo/src/Obj.ts:203
- 3bc9b092-25 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo/src/Obj.ts:288
- 3bc9b092-26 - ignored - no-casts - packages/core/echo/echo/src/Query.ts:573
- 3bc9b092-27 - ignored - no-casts - packages/core/echo/echo/src/Relation.ts:65
- 3bc9b092-28 - ignored - error-messages-carry-context - packages/core/echo/echo/src/Relation.ts:158
- 3bc9b092-29 - ignored - no-casts - packages/core/echo/echo/src/Type.ts:152
- 3bc9b092-30 - ignored - no-casts - packages/sdk/client-e2e/src/spaces.test.ts:274
- 3bc9b092-31 - ignored - no-casts - packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:164

## Issues

# WARN 3bc9b092-1 error-messages-carry-context `packages/core/echo/echo-client/src/feed/feed-handle.ts:487`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 487-510 (`async waitForPendingWrites(): Promise<void> {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3bc9b092-2 use-context-scoped-cancellation `packages/core/echo/echo-client/src/feed/feed-handle.ts:751`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.89. The likeliest place is lines 751-774 (`this.#subscribeToFeed(generation);`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3bc9b092-3 error-messages-carry-context `packages/core/echo/echo-client/src/proxy-db/database.ts:532`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 532-555 (`private _query(query: Query.Any | Filter.Any) {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3bc9b092-4 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-executor.ts:639`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.80. The likeliest place is lines 639-662 (`export class QueryExecutor extends Resource {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3bc9b092-5 structured-logging-not-console `packages/core/echo/echo-host/src/query/query-executor.ts:807`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 807-830 (`this.#changeResultSet = next;`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3bc9b092-6 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:1697`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.87. The likeliest place is lines 1697-1720 (`bySpace.set(item.spaceId, [item.objectId]);`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3bc9b092-7 no-casts `packages/core/echo/echo-host/src/query/query-executor.ts:1841`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 1841-1864 (`Effect.gen(function* () {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3bc9b092-8 no-casts `packages/core/echo/echo-host/src/query/query-planner.test.ts:1782`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 1782-1805 (`expect((orderStep as any).limit).toBeUndefined();`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3bc9b092-9 no-casts `packages/core/echo/echo-host/src/query/query-planner.ts:1334`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 1334-1357 (`}`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3bc9b092-10 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-sqlite/src/database.ts:199`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 199-222 (`compile(query: Query.Any | Filter.Any): CompiledQuery {`, location confidence 0.10). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3bc9b092-11 schema-declare-and-brand `packages/core/echo/echo/src/Database.ts:522`

System One judges this a likely violation of `schema-declare-and-brand` (Use Schema.declare and Brand instead of hand-rolling the equivalent machinery), p=0.90. The likeliest place is lines 522-530 (`export const isDatabase = (obj: unknown): obj is Database => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3bc9b092-12 no-casts `packages/core/echo/echo/src/Database.ts:618`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 618-643 (`if (!object) {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3bc9b092-13 no-casts `packages/core/echo/echo/src/Entity.ts:75`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 75-82 (`export const Unknown: Schema.Codec<Unknown> = Schema.StructWithRest(Schema.St...`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3bc9b092-14 no-casts `packages/core/echo/echo/src/internal/common/proxy/json-serializer.ts:29`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 29-40 (`export const attachTypedJsonSerializer = (obj: any) => {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3bc9b092-15 name-for-general-behavior `packages/core/echo/echo/src/internal/common/types/model-symbols.ts:1`

System One judges this a likely violation of `name-for-general-behavior` (Name for what a function or concept actually does, not its first narrow case), p=0.83. The likeliest place is lines 1-12 (`//`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3bc9b092-16 no-casts `packages/core/echo/echo/src/internal/Entity/entity.ts:249`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 249-254 (`return entity as unknown as EchoTypeSchema<Self, {}, K, Fields>;`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3bc9b092-17 no-casts `packages/core/echo/echo/src/internal/Entity/event.ts:35`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 35-46 (`export const makeEventType = <Self, _Schema extends Schema.Top>(`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3bc9b092-18 no-casts `packages/core/echo/echo/src/internal/Entity/guard.ts:12`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 12-22 (`export const isEntity = (value: unknown): value is Entity.Unknown => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3bc9b092-19 no-casts `packages/core/echo/echo/src/internal/Entity/object.ts:91`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 91-102 (`export const makeObjectType = <Self, _Schema extends Schema.Top>(`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3bc9b092-20 no-casts `packages/core/echo/echo/src/internal/Obj/create-object.ts:68`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 68-79 (`export const createObject: {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3bc9b092-21 error-messages-carry-context `packages/core/echo/echo/src/internal/Obj/create-object.ts:68`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.87. The likeliest place is lines 68-79 (`export const createObject: {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3bc9b092-22 no-casts `packages/core/echo/echo/src/internal/Obj/json-serializer.ts:260`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 260-264 (`} = jsonData as any;`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3bc9b092-23 no-casts `packages/core/echo/echo/src/internal/Ref/ref.ts:376`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 376-388 (`const EncodedReferenceSchema = Schema.Struct({ '/': Schema.String }) as unkno...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3bc9b092-24 no-casts `packages/core/echo/echo/src/Obj.ts:203`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 203-250 (`const value = (props as any)[sym];`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3bc9b092-25 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo/src/Obj.ts:288`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 288-325 (`export const getReactive = <T extends Unknown>(snapshot: Snapshot<T>): Effect...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3bc9b092-26 no-casts `packages/core/echo/echo/src/Query.ts:573`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 573-596 (`from: { _tag: 'scope', scopes: arg as QueryAST.Scope[] },`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3bc9b092-27 no-casts `packages/core/echo/echo/src/Relation.ts:65`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 65-82 (`export const Unknown: internal.UnknownTypeSchema<Unknown, typeof Entity.Kind....`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3bc9b092-28 error-messages-carry-context `packages/core/echo/echo/src/Relation.ts:158`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.85. The likeliest place is lines 158-181 (`export const make = <T extends Type.AnyRelation>(`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3bc9b092-29 no-casts `packages/core/echo/echo/src/Type.ts:152`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 152-166 (`export const Type: Type<typeInternal.TypeSchema> = typeInternal.TypeSchema as...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3bc9b092-30 no-casts `packages/sdk/client-e2e/src/spaces.test.ts:274`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 274-297 (`const feed1 = hypercoreStore1.getHypercore(feedKey!)!;`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3bc9b092-31 no-casts `packages/sdk/client-services/src/internal/space-export/serialized-space-writer.ts:164`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 164-175 (`export const objectStructureToObjJson = (objectId: string, structure: EntityS...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `cbc22c6b38cdf91b6a9641af61f5991f5096cc00`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 31 violations written to fragments, 265 uncertain, 1270 clean, 0 unanswered
- left for an agentic reviewer: 63 batch(es)

```text
requests: 755 (155 verdicts re-asked with context the model requested)
estimated input tokens: 10849417
billed input tokens: 10544329 (cost $0.4429)
measured chars per token: 3.09
```

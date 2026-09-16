# Effect 4 Schema & AST

Rules that outlive the v3 → v4 migration. The failure mode most of these guard is the same:
**compile-clean and test-silent** — a blank form label or a dropped annotation, never a stack trace.

## Never import `effect/SchemaAST` directly

Go through `@dxos/effect`'s facade (`import { SchemaAST } from '@dxos/effect'`).

v4 keeps **9 of `SchemaAST`'s 138 exports public**; the rest are `@internal` and absent from the
published `.d.ts` — including `annotate`, `annotateKey`, `isMutable`, `replaceContext`,
`replaceChecks`, `struct`, `union`, `record`, and `getAST`. What remains public: the node classes,
the `is*` guards, `isOptional`, `resolve*`, `toEncoded`/`toType`, `mapOrSame`, `optionalKey`,
`decodeTo`, `flip`.

The facade re-expresses the missing pieces on public API (`annotate` via
`Schema.make(ast).annotate()`, mutability via `ast.context`, `omit`/`pick` by rebuilding `Objects`).
Reaching into the AST is tolerated but unsupported, and `effect/unstable/*` carries no semver
guarantee even after GA — so the exposure has to stay in one module that can absorb a break. It was
80 files before the migration; keep it at one.

## Read annotations through `resolveAnnotations`, never `ast.annotations`

`.annotate()` on a schema that carries checks attaches to the **last check**, not the node, and
`SchemaAST.resolve` reads back only that check's annotations. So `ast.annotations.title` returns
`undefined` for any refined type, and the mirror case (annotate first, `check` after) drops the
node's own annotations instead.

`@dxos/effect`'s `resolveAnnotations` layers both directions. Every annotation read in ECHO and the
form stack goes through it.

## `mutableKey` is field-position only

v4's `Schema.mutable` accepts Arrays only; struct-level mutability became per-field
`Schema.mutableKey(...)`.

Wrapping a whole `Schema.Record` in `mutableKey` is a **no-op** — it only affects a schema sitting in
struct-field position, and its `Type` is unchanged. Record _entry_ mutability comes from the value
schema. Getting this wrong silently drops the mutability v3 expressed with `Schema.mutable(Record)`.

## Brands survive — keep them

`S.String.check(S.isULID())` types as plain `string`. If the v3 schema was branded
(`S.ULID.pipe(S.brand(...))`), pipe `Schema.brand` back on and build values with `makeSync`;
dropping it silently widens a nominal type to `string` with no cast to grep for.

## `Schema.refine` for a branded codec, not a cast

A type-guard refinement (`Schema.refine((v): v is JsonPath => RE.test(v))`) types as
`Codec<JsonPath, string>` with no cast. Reach for `as unknown as Schema.Codec<…>` only when the
encoded side genuinely cannot be expressed — and say so in a comment. Note the JSON-Schema
representation: `check(isPattern(...))` also emits `pattern`, which a bare `refine` does not, so
keep the check when the emitted schema matters and add the guard alongside it.

## Validate after ref hydration

The **type** side of a `Ref` field admits only a live `Ref` instance. Callers send the encoded
`{'/': dxn}` form, so validating the raw input against `Schema.toType(...)` rejects every
ref-bearing payload. Hydrate refs first, then validate.

## The `toJsonSchema` output shape is a wire contract

ECHO's emitted JSON Schema has consumers on both sides of the LLM boundary (the assistant's
`schema-list`/`schema-add`, and EDGE's tool-parameter builder, which reads `description` off each
property and throws when it is missing). v4 changed the emitter's defaults — optional fields become
`anyOf: [T, null]`, refinement keywords nest under `allOf`.

ECHO normalizes both back to the v3-style shape deliberately: optional properties are the bare type
omitted from `required`, constraints sit at the property's top level. This is a stable contract, not
an accident — see `packages/core/echo/echo/src/internal/JsonSchema/json-schema.ts` and the
shape-pinning tests beside it.

## Persisted schemas: the v3 decoder is permanent

Spaces hold JSON Schema documents written by Effect 3. The legacy decoder retires on _space
coverage_, not on a release date — a space nobody opens keeps its v3 documents indefinitely, and the
eager per-space migration reads through the decoder to do its work. Do not delete it.

v3-only sentinels (`/schemas/unknown`, `/schemas/any`, `/schemas/{}`) exist only in already-stored
data; v4 emits none of them, and dropping their handling silently degrades those fields to `Unknown`.

## v3 → v4 name map

Useful when reading pre-migration code, old PRs, or upstream issues.

| v3                                     | v4                                                       |
| -------------------------------------- | -------------------------------------------------------- |
| `TypeLiteral` / `isTypeLiteral`        | `Objects` / `isObjects`                                  |
| `TupleType` / `isTupleType`            | `Arrays` / `isArrays` (`rest` holds bare ASTs)           |
| `Refinement` node + `.filter`          | `checks: ReadonlyArray<Check>` on the constrained node   |
| `StringKeyword` / `NumberKeyword` / …  | `String` / `Number` / …                                  |
| symbol annotation ids                  | plain **string** keys (`'title'`, `'description'`, …)    |
| `PropertySignature.isOptional`         | `type.context` (`isOptional` / `isMutable`)              |
| `encodedBoundAST`                      | `toEncoded`                                              |
| `S.transform`                          | `S.decodeTo(to, SchemaTransformation.transform({…}))`    |
| `S.compose`                            | `.pipe(S.decodeTo(target))`                              |
| `S.filter(pred)`                       | `S.check(S.makeFilter(pred))` / `S.check(S.isPattern())` |
| `S.Struct(fields, { key, value })`     | `S.StructWithRest(S.Struct(fields), [S.Record(k, v)])`   |
| `S.extend`                             | removed — `S.StructWithRest`                             |
| `S.optionalWith(X, { default })`       | `X.pipe(S.withDecodingDefault(...))` on the bare field   |
| `schema.pick(...)` / `.omit(...)`      | `schema.mapFields(Struct.pick([...]))`                   |
| `S.DateFromSelf`                       | `S.Date` (decoding from a string is `S.DateFromString`)  |
| `S.asserts(schema)(input)`             | `S.asserts(schema, input)`                               |
| `effect/Either`                        | `effect/Result` (`isFailure`/`isSuccess`, `.failure`)    |
| `decodeUnknownEither`                  | `decodeUnknownResult`                                    |
| `Effect.gen(this, f)`                  | `Effect.gen({ self: this }, f)`                          |
| `Effect.runtime<R>()`                  | `Effect.context<R>()`                                    |
| `Context.Tag` / `Context.Tag.Service`  | `Context.Service` / `Context.Service.Shape<typeof X>`    |
| `Layer.scoped`                         | `Layer.effect` (merged; runs in the layer scope)         |
| `Scope.CloseableScope`                 | `Scope.Closeable`                                        |
| `Schedule.compose(recurs(n))`          | `Effect.retry({ schedule, times: n })`                   |
| `Predicate.isNotNullable` / `isRecord` | `isNotNullish` / `isObject`                              |

## Upstream docs

Read these rather than recalling v4 from memory; the release candidate moves. The
pinned copy in `node_modules/effect` is the first stop and [SKILL.md](SKILL.md)
describes it. These are the migration notes it does not carry, now on
`Effect-TS/effect` (`effect-smol` is archived, and its links are dead):

- [`MIGRATION.md`](https://github.com/Effect-TS/effect/blob/effect%404.0.0-rc.108/MIGRATION.md) —
  package consolidation, the `effect/unstable/*` split, versioning.
- [`migration/schema.md`](https://github.com/Effect-TS/effect/blob/effect%404.0.0-rc.108/migration/schema.md)
  and [`migration/v3-to-v4.md`](https://github.com/Effect-TS/effect/blob/effect%404.0.0-rc.108/migration/v3-to-v4.md)
  — the rename tables `tools/codemods/effect-4-verified-renames.mjs` was built from.
- [`migration/layer-memoization.md`](https://github.com/Effect-TS/effect/blob/effect%404.0.0-rc.108/migration/layer-memoization.md)
  — background for §8 of [layer-composition.md](layer-composition.md).
- [`migration/yieldable.md`](https://github.com/Effect-TS/effect/blob/effect%404.0.0-rc.108/migration/yieldable.md)
  — why `return yield* new SomeError()` works for `Schema.TaggedError` and not for
  `BaseError.extend`.

## Bundling: watch for dynamic imports in `export *` chains

`effect/unstable/sql/Migrator` includes `fromFileSystem`, whose template-literal `import()` no static
module loader can resolve. Any `export *` chain materializes the whole namespace and rides it into
the bundle; workerd then rejects the entire worker with `ERR_MODULE_DYNAMIC_SPEC`. Re-export the
members you need by name — see `packages/common/sql-sqlite/src/SqliteMigrator.ts`.

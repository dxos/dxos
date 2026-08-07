# effect-smol — Design

Migrate `dxos/dxos` from Effect 3 to Effect 4 (`effect-smol`), then `dxos/edge`.

## Status of the dependency

`effect@4.0.0-beta.105` (2026-08-07); first beta 2026-02-18, no GA. Breaking changes are still
permitted during beta, and most of what DXOS uses lands under `effect/unstable/*`, which carries
no semver guarantee even after GA.

**D8 — Migrate on the beta; do not wait for GA.** User, 2026-08-07. `effect/unstable/*` never
gets a semver guarantee anyway, so waiting buys less than it costs; the migration proceeds against
`4.0.0-beta.105` and tracks subsequent betas. Practical consequence: the migration branch is red
until the port completes, and a beta bump mid-flight can reintroduce errors.

## Scope

| Metric                             | Value                       |
| ---------------------------------- | --------------------------- |
| Files importing effect             | 2,884 / 10,456 TS+TSX (28%) |
| LOC in effect-touching files       | 375,297 / 1,406,997 (27%)   |
| Packages declaring an `effect` dep | 208 / 322                   |
| `Effect.*` call sites              | 12,766                      |
| `Schema.*` call sites              | 13,599 (873 files)          |
| `SchemaAST.*` call sites           | 529 (**80 files**)          |
| `@effect-atom/*` files             | 433                         |
| `@effect/vitest` test files        | 202                         |

Concentrated: `packages/core/compute` (462 effect files) and `packages/core/echo` (176) are ~22%.

Estimate ~3–5 engineer-months, dominated by the Schema tier.

## Decisions

### D1 — Import rewrites are acceptable where an equivalent exists

User, 2026-08-07. The repo uses `import * as Effect from 'effect/Effect'` throughout — no barrel
destructuring — so path and symbol renames are codemod-able. Already on modern idiom: zero uses of
`Effect.Do`, `Effect.bind`, `Effect.gen(function* (_))`, `Effect.iterate`, `Effect.reduce`,
`Effect.if`, `Effect.once`, `Effect.Tag`.

### D2 — `@effect-atom` is not a blocker

It moved into the v4 release train, not abandoned:

| v3                           | v4                                        |
| ---------------------------- | ----------------------------------------- |
| `@effect-atom/atom`          | `effect/unstable/reactivity/Atom`         |
| `@effect-atom/atom/Registry` | `effect/unstable/reactivity/AtomRegistry` |
| `@effect-atom/atom/Result`   | `effect/unstable/reactivity/AsyncResult`  |
| `@effect-atom/atom-react`    | `@effect/atom-react@4.0.0-beta.105`       |

Every symbol in use is covered; `Atom.Context` → `Atom.AtomContext` is the only shape change.
React peers (`react >=19.2.7`, `scheduler >=0.27`) match the catalog exactly.
`packages/common/effect-atom-solid` is likely deletable — upstream ships `@effect/atom-solid`.

### D3 — Persisted-schema compatibility is needed in ONE direction only

User, 2026-08-07. Too few deployed clients for cross-version reads to matter: **v4 must read
v3-written data; v3 never has to read v4-written data.** This removes the "emit a v3-shaped
document" problem entirely.

### D4 — Normalize on read; migrate eagerly per space

User, 2026-08-07. Old data is transformed at the storage boundary so code only ever sees the v4
format. The eager migration is **not an alternative** to normalize-on-read — `runMigrations` reads
through that boundary to do its work, so the decoder is required either way. The migration only
decides how long the decoder must live.

Machinery already exists and is in production (`plugin-illustrator` ships one):

- `TypeMetaSchemaDXN = DXN.make('org.dxos.type.schema', '0.1.0')` (`internal/Entity/entity.ts:158`)
  — the meta-type is already versioned, so `0.1.0` → `0.2.0` fits `Migration.define`.
- `runMigrations` (`echo-client/src/proxy-db/database.ts:710`) queries `Filter.type(fromType)`,
  transforms, and `atomicReplaceObject`s with the new type URI.
- Transform body is `writeStoredSchema(readStoredSchema(old.jsonSchema))`.

**Caveat:** `runMigrations` is per-`Database`, so it is eager _within_ a space and lazy _across_
spaces. A space nobody opens keeps v3 documents indefinitely. The decoder (~280 LOC, tested)
retires on space coverage, not on a release date.

### D5 — The LLM wire format is a third boundary; keep it stable

There are three format boundaries, not two: storage, code-level (v4 `Schema`), and the LLM wire
contract. The model is on **both** sides of the third:

- `assistant-toolkit/.../schema-list.ts:33` returns `toJsonSchema(schema)` to the model.
- `assistant-toolkit/.../schema-add.ts:15` takes `jsonSchema` **from** the model into
  `Type.makeObjectFromJsonSchema`.
- `edge:packages/services/ai-service/src/generation/tools/types.ts:70` builds LLM tool parameter
  schemas from `toJsonSchema` — a cross-repo consumer.

`toJsonSchema` is ECHO's own function, so DXOS controls the shape. Decision: keep emitting and
accepting the current v3-style JSON Schema on the LLM boundary permanently — it is the dialect
models know, and it decouples the wire format from storage.

### D6 — EDGE needs no compat decoder

Verified against `dxos/edge` @ `2e59d8a`:

- **Writes zero types.** All 31 `addType` hits are `client.addTypes([...])` in tests (static
  registration). Zero `db.addType`, `makeObjectFromJsonSchema`, `makeRelationFromJsonSchema` in
  production code.
- **Reads zero stored schemas.** No `toEffectSchema`, no `Type.Type`. The one dynamic-type path,
  `mcp-space-service/src/mcp/space-tools.ts:98`, filters by DXN and returns raw `documentJson`.
- Its only `toJsonSchema` use operates on statically code-defined schemas.

So EDGE goes straight to v4. The mixed-format problem is Composer-only, and there is no
"EDGE drops v3 support" step.

### D7 — Release sequence uses pkg.pr.new, not npm

User, 2026-08-07, refined by inspection. EDGE already consumes `@dxos/*` from **pkg.pr.new pinned
at a commit SHA** (`pnpm-workspace.yaml:104`, `catalog:dxos`), not npm. `dxos/dxos` publishes every
public package per-commit via `.github/workflows/pkg-pr-new.yml`. This removes both the local-link
step and the wait-for-publish step from the plan.

1. Migrate `dxos/dxos` on-branch; dispatch pkg.pr.new for tarballs.
2. Repoint `catalog:dxos` in edge at that SHA; migrate EDGE against it.
3. Land the dxos PR (do not ship Composer).
4. Repoint edge at the landed SHA; land and ship EDGE.
5. Ship Composer with the `org.dxos.type.schema` `0.1.0` → `0.2.0` migration.

Wrinkle: `pkg-pr-new.yml` triggers on `push: [main]` + `workflow_dispatch`, so a feature branch
needs a manual dispatch (or a trigger change).

## Findings that shape the work

Full evidence: [`agents/superpowers/spikes/effect-4-schema-ast/REPORT.md`](../../../agents/superpowers/spikes/effect-4-schema-ast/REPORT.md).

### F1 — `SchemaAST` is effectively private in v4

**129 of 138 exports are `@internal`** and absent from the published `.d.ts` — including
`annotate`, `annotateKey`, `isMutable`, `replaceContext`, `replaceChecks`, `struct`, `union`,
`record`, `getAST`. Public: node classes, `is*` guards, `isOptional`, `resolve*`,
`toEncoded`/`toType`, `mapOrSame`, `optionalKey`, `decodeTo`, `flip`.

The spike's port works entirely on public API via three shims (`Schema.make(ast).annotate()`,
`ast.context?.isMutable`, rebuild through `optionalKey`/`mutableKey`) — but DXOS's AST-reaching
approach is unsupported, and any shim can break in a minor release. **This is the single biggest
risk in the migration.** Mitigation: consolidate the 80 direct `effect/SchemaAST` importers behind
`@dxos/effect`'s `ast.ts` _before_ migrating, shrinking the exposed surface to one module.

### F2 — Annotations on a checked node move to the check

`.annotate()` on a schema carrying checks attaches to the **last check**, and `SchemaAST.resolve`
reads back only that check's annotations. `ast.annotations.title` silently returns `undefined` for
any refined type — compile-clean, test-silent, surfaces as blank form labels. Every ECHO annotation
read must go through a resolver. Worth a lint rule during the migration.

### F3 — Layer memoization semantics changed

v4 shares the MemoMap across `Effect.provide` calls by default. With 233 `Layer.succeed`, 139
`Layer.effect`, 114 `Layer.mergeAll` and a documented composition convention, this produces no
compile errors — only shared-instance bugs and flaky tests. Highest risk-per-line item outside
Schema.

### F4 — EDGE's ai-service will break on v4-shaped emitter output

`edge:.../generation/tools/types.ts:69-78` reads `description` off each property at the top level
and **throws** if missing. v4 nests annotations under `allOf`, so it would throw for every property
with a check. Prevented by D5, but needs a shape-pinning test in dxos/dxos to stay prevented.

## Migration tiers

1. **Mechanical / codemod-able** (~2–3 wks): module paths (`effect/Either` → `effect/Result`,
   `effect/JSONSchema` → `effect/JsonSchema`, `T*` → `Tx*`), API renames (`catchAll` → `catch` ×194,
   `either` → `result` ×44, `Layer.scoped` → `Layer.effect` ×31, `async` → `callback` ×15,
   `Scope.extend` → `Scope.provide` ×17), plus the 433 atom files.
2. **Structural, bounded** (~3–6 wks): `Context.Tag` → `ServiceMap.Service` (126 class decls, 116
   `provideService`), `ManagedRuntime`/`Runtime<R>` (42 files — `@dxos/effect`'s `RuntimeProvider`
   and `dynamic-runtime`), layer memoization (F3), `Cause` flattening, forking renames,
   `FiberRef` → `Context.Reference`.
3. **Schema** (~6–12 wks senior): the rewrite — variadic→array, `annotations()` → `annotate()`
   ×205, `filter` → `check`/`refine`, `pick`/`omit`/`partial`/`extend` → `mapFields(Struct.*)`,
   `validate*` removed ×83 — plus the AST-dependent code (`@dxos/effect` `ast.ts` 535 LOC / 85 refs,
   `schema-validator.ts` 417 LOC / 55 refs, `json-schema.ts` 574 LOC, `react-ui-form` 15 files).
4. **Persistence** — bounded by D3/D4; the decoder is written and tested.

## References

- Spike: `agents/superpowers/spikes/effect-4-schema-ast/` (28 tests, clean tsc)
- [Effect v4 Beta](https://www.effect.website/blog/releases/effect/40-beta)
- [effect-smol MIGRATION.md](https://github.com/Effect-TS/effect-smol/blob/main/MIGRATION.md)
- [layer-memoization guide](https://github.com/Effect-TS/effect-smol/blob/main/migration/layer-memoization.md)

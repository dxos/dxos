# Audit: `@dxos/echo/internal` Import Removal

**Total files importing from `@dxos/echo/internal`**: 150+ files across plugins, sdk, compute,
devtools, and echo-db / echo-pipeline internals. The goal is to replace every import with either a
public subpath import, a proper API call, or an in-package internal import (for code that legitimately
needs low-level access).

---

## Summary by difficulty

| Difficulty                                              | Symbol count     | Effort                      |
| ------------------------------------------------------- | ---------------- | --------------------------- |
| Easy (1) — just change import path                      | ~65% of all uses | Mechanical sed/codemod      |
| Medium (2) — symbol needs promotion to a public subpath | ~20% of all uses | Small API surface additions |
| Hard (3) — true internal plumbing; needs API design     | ~15% of all uses | Design decision + refactor  |

---

## Tier 1 — Easy: Already in a public subpath, just change the import path

These symbols are already exported from public `@dxos/echo/<Subpath>` entrypoints.
Migration is mechanical: update the import string. No behavior change.

### 1a. Annotation symbols → `@dxos/echo/Annotation`

The public `Annotation.ts` module exports these as **flat names** (no namespace prefix needed):

| Symbol                  | Uses | Note                           |
| ----------------------- | ---- | ------------------------------ |
| `LabelAnnotation`       | 39   | Direct re-export from internal |
| `FormInputAnnotation`   | 38   | Direct re-export               |
| `HiddenAnnotation`      | 14   | Direct re-export               |
| `getTypeAnnotation`     | 7    | Direct re-export               |
| `GeneratorAnnotation`   | 5    | Direct re-export               |
| `DescriptionAnnotation` | 2    | Direct re-export               |

**Migration**: `import { LabelAnnotation, FormInputAnnotation } from '@dxos/echo/internal'`
→ `import { LabelAnnotation, FormInputAnnotation } from '@dxos/echo/Annotation'`

**Files**: All plugin type files (`plugin-board`, `plugin-chess`, `plugin-kanban`, `plugin-markdown`,
`plugin-map`, `plugin-feed`, `plugin-gallery`, `plugin-game`, `plugin-generator`, `plugin-inbox`,
`plugin-commerce`, `plugin-masonry`, `plugin-meeting`, `plugin-script`, `plugin-sketch`, `plugin-support`,
`plugin-trip`, `plugin-video`, `plugin-voxel`, `plugin-zen`, `plugin-outliner`), `sdk/schema/testing`,
`sdk/types/src/types/*`, `react-ui-form`, `react-ui-table`, `assistant-toolkit`.

---

### 1b. Format / TypeEnum / TypeFormat symbols → `@dxos/echo/Format`

The public `Format.ts` module does `export * from './internal/Format'`, so all of these are available:

| Symbol                                               | Uses | Note                                                     |
| ---------------------------------------------------- | ---- | -------------------------------------------------------- |
| `Format` (namespace with `.DateTime`, `.Text`, etc.) | 45   | The `Format` namespace object                            |
| `TypeEnum`                                           | 12   | Enum: `String`, `Number`, `Date`, `Boolean`, `Ref`, etc. |
| `SelectOption`                                       | 4    | `Schema.Struct({ id, label, ... })`                      |
| `FormatAnnotation`                                   | 4    | Annotation helper for TypeFormat                         |
| `GeoLocation`                                        | 3    | Schema for `{ lat, lng }`                                |
| `FormatEnums`                                        | 1    | `Object.values(TypeFormat).sort()`                       |
| `TypeFormat`                                         | 1    | The enum backing `Format.Format` type alias              |
| `formatToType`                                       | 2    | Lookup: TypeFormat → TypeEnum                            |
| `typeToFormat`                                       | 1    | Lookup: TypeEnum → TypeFormat                            |
| `GeoPoint`                                           | 1    | `{ geolocation: GeoLocation }`                           |
| `DecimalPrecision`                                   | 1    | Annotation for decimal display precision                 |
| `OptionsAnnotationId`                                | 1    | Symbol for options annotation (in Format/types.ts)       |

**Migration**: `import { Format, TypeEnum } from '@dxos/echo/internal'`
→ `import { Format, TypeEnum } from '@dxos/echo/Format'`

Note: `OptionsAnnotationId` lives in `Format/types.ts` but is not yet re-exported by the public
`Format.ts` subpath — it needs a one-line addition (see Tier 2).

**Files**: `sdk/schema/src/projection/format.ts`, `sdk/schema/src/projection/projection.ts`,
`react-ui-form/src/util/field.ts`, `react-ui-form/src/util/formatting.ts`,
`react-ui-form/components/FieldEditor/FieldEditor.tsx`, `react-ui-table/*`,
`plugin-crm`, `plugin-sheet`, `plugin-trip`, `plugin-video`, `plugin-kanban`,
`plugin-integration`, `plugin-map`, `plugin-sample`, `sdk/types/*`,
`devtools/src/panels/*` (Format only — devtools imports 14 files each doing
`import { Format } from '@dxos/echo/internal'`).

---

### 1c. Ref symbols → `@dxos/echo/Ref`

The public `Ref.ts` module exports `Ref` (class + namespace) and the ref utilities:

| Symbol                    | Uses | Note                                             |
| ------------------------- | ---- | ------------------------------------------------ |
| `Ref`                     | 5    | The `Ref<T>` schema / type                       |
| `refFromEncodedReference` | 1    | Construct a Ref from encoded wire data           |
| `createSchemaReference`   | 1    | JSON schema reference object builder             |
| `getSchemaReference`      | 1    | Extract reference info from JSON schema property |

**Migration**: `import { Ref } from '@dxos/echo/internal'`
→ `import { Ref } from '@dxos/echo/Ref'`

Note: `refFromEncodedReference`, `createSchemaReference`, `getSchemaReference` are in
`internal/Ref/ref.ts` but not yet re-exported from the public `Ref.ts`. Check before using —
if missing, add them (Tier 2).

**Files**: `sdk/client/src/tests/client.test.ts`, `sdk/client/src/tests/indexing.test.ts`,
`echo-db/src/testing/integration.test.ts`, `functions/src/protocol/protocol.ts`,
`react-ui-canvas-compute/src/shapes/Function.tsx`, `sdk/schema/src/projection/projection.ts`.

---

### 1d. JsonSchema symbols → `@dxos/echo/JsonSchema`

| Symbol           | Uses | Note                                                                                              |
| ---------------- | ---- | ------------------------------------------------------------------------------------------------- |
| `JsonSchemaType` | 5    | Use `JsonSchema.JsonSchema` type or `import type { JsonSchemaType } from '@dxos/echo/JsonSchema'` |
| `toJsonSchema`   | 2    | Available as `JsonSchema.toJsonSchema`                                                            |
| `toEffectSchema` | 2    | Available as `JsonSchema.toEffectSchema`                                                          |

**Migration**: `import { type JsonSchemaType, toJsonSchema } from '@dxos/echo/internal'`
→ `import type { JsonSchema as JsonSchemaType } from '@dxos/echo/JsonSchema'; import { toJsonSchema } from '@dxos/echo/JsonSchema'`

Note: `JsonSchemaType` (the internal type name) maps to `JsonSchema` (the public type name) in the
`JsonSchema` namespace module. Callers may need a type alias: `type JsonSchemaType = JsonSchema.JsonSchema`.

**Files**: `react-ui-table/src/model/table-model.ts`, `react-ui-canvas-compute/*`,
`functions-runtime-cloudflare/src/types.ts`, `functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts`,
`ui-editor/src/extensions/json.ts`.

---

### 1e. Entity / Obj symbols → `@dxos/echo/Entity` or `@dxos/echo/Obj`

| Symbol         | Uses | Public equivalent                                                                          |
| -------------- | ---- | ------------------------------------------------------------------------------------------ |
| `Mutable`      | 12   | `Entity.Mutable<T>` (from `@dxos/echo/Entity`) or `Obj.Mutable<T>` (from `@dxos/echo/Obj`) |
| `isInstanceOf` | 3    | `Entity.isInstanceOf` (from `@dxos/echo/Entity`)                                           |
| `getSnapshot`  | 2    | `Obj.getSnapshot` (from `@dxos/echo/Obj`)                                                  |
| `EntityKind`   | 6    | `Entity.Kind` enum (from `@dxos/echo/Entity`)                                              |

**Migration examples**:

```ts
// Before
import { type Mutable } from '@dxos/echo/internal';
// After (pick the most appropriate shape)
import type { Mutable } from '@dxos/echo/Obj';
// or
import type { Mutable } from '@dxos/echo/Entity';
```

```ts
// Before
import { isInstanceOf } from '@dxos/echo/internal';
// After
import { isInstanceOf } from '@dxos/echo/Entity';
```

```ts
// Before
import { getSnapshot } from '@dxos/echo/internal';
// After
import { getSnapshot } from '@dxos/echo/Obj';
```

**Files**: `plugin-assistant`, `plugin-kanban`, `plugin-pipeline`, `plugin-preview`,
`plugin-space`, `react-ui-canvas-compute`, `sdk/schema/src/experimental/json-schema.test.ts`,
`react-ui-form`, `conductor/src/nodes/registry.ts`,
`functions-runtime/src/url.ts`, `react-ui-form/src/components/ViewEditor/ViewEditor.test.tsx`.

---

## Tier 2 — Medium: Symbol needs a small promotion into a public subpath

These symbols exist in internal but are not yet exported from the right public subpath.
Fix = add an export line (or rename) in the relevant namespace file.

### 2a. Annotation ID symbols not yet in `@dxos/echo/Annotation`

| Symbol                      | Uses | Lives in                             | Proposed home           |
| --------------------------- | ---- | ------------------------------------ | ----------------------- |
| `PropertyMetaAnnotationId`  | 5    | `internal/Annotation/annotations.ts` | `@dxos/echo/Annotation` |
| `PropertyMetaAnnotation`    | 1    | `internal/Annotation/annotations.ts` | `@dxos/echo/Annotation` |
| `PropertyMeta`              | 1    | `internal/Annotation/annotations.ts` | `@dxos/echo/Annotation` |
| `getPropertyMetaAnnotation` | 1    | `internal/Annotation/annotations.ts` | `@dxos/echo/Annotation` |
| `ReferenceAnnotationId`     | 4    | `internal/Annotation/annotations.ts` | `@dxos/echo/Annotation` |
| `ReferenceAnnotationValue`  | 3    | `internal/Annotation/annotations.ts` | `@dxos/echo/Annotation` |
| `FieldLookupAnnotationId`   | 1    | `internal/Annotation/annotations.ts` | `@dxos/echo/Annotation` |

**Fix**: Add these to the explicit export list in `src/Annotation.ts`.

**Consumers**: `plugin-kanban`, `plugin-preview`, `plugin-search`,
`react-ui-form/src/components/Form/fields/RefField.tsx`,
`react-ui-form/src/components/Form/fields/InlineRefField.tsx`,
`react-ui-form/src/util/refs.ts`, `sdk/schema/src/testing/deprecated.ts`.

---

### 2b. `OptionsAnnotationId` not yet in `@dxos/echo/Format`

| Symbol                | Uses | Lives in                   | Proposed home       |
| --------------------- | ---- | -------------------------- | ------------------- |
| `OptionsAnnotationId` | 1    | `internal/Format/types.ts` | `@dxos/echo/Format` |

`Format/types.ts` is already re-exported via `Format/index.ts` which is re-exported by
the public `Format.ts`. So `OptionsAnnotationId` should already be in `@dxos/echo/Format` —
verify with: `grep OptionsAnnotationId packages/core/echo/echo/src/Format.ts`. If missing,
add it to `Format.ts`.

**Consumer**: `packages/core/compute/compute/src/Trigger.ts`.

---

### 2c. `createAnnotationHelper` — replace with `Annotation.make`

| Symbol                   | Uses | Lives in                      |
| ------------------------ | ---- | ----------------------------- |
| `createAnnotationHelper` | 9    | `internal/Annotation/util.ts` |

`createAnnotationHelper` is the internal API for registering Effect-schema–backed annotations
with `get`/`set` helpers. The public API is `Annotation.make` (from `@dxos/echo`), which takes
`{ id: string, schema: Schema }`.

**Migration**: Each call site must be converted from the symbol-based internal helper to the
public string-ID–based `Annotation.make`. These are in:

- `sdk/schema/src/annotations/api-key.ts`
- `sdk/schema/src/annotations/factory.ts`
- `sdk/schema/src/annotations/feed.ts`
- `sdk/schema/src/annotations/icon.ts`
- `sdk/schema/src/annotations/parent-label.ts`
- `sdk/schema/src/annotations/queue.ts`
- `sdk/schema/src/annotations/view.ts`
- `react-ui-form/src/components/Form/Layout/annotation.ts`

Effort is low per file but requires verifying that `Annotation.make` provides the same
`get/set` semantics as the internal helper. One risk: `createAnnotationHelper` is used with
`Symbol.for(...)` IDs (for backwards-compat serialization); `Annotation.make` uses string IDs —
check they serialize identically before migration.

---

### 2d. `AnyEntity` → express as `Entity.Unknown | Relation.Unknown`

| Symbol      | Uses | Lives in                        |
| ----------- | ---- | ------------------------------- |
| `AnyEntity` | 2    | `internal/common/types/base.ts` |

`AnyEntity` is `{ id: EntityId } & AnyProperties`. It predates the typed entity model.
In all current consumer contexts it can be replaced with `Entity.Unknown` (from
`@dxos/echo/Entity`) since those callers work with objects. The two consumers are:
`functions-runtime-cloudflare/src/internal/service-container.ts` and
`functions-runtime-cloudflare/src/queues-api.ts`.

---

### 2e. `EntityMeta` type → use `ReturnType<typeof Entity.getMeta>`

| Symbol       | Uses | Lives in                        |
| ------------ | ---- | ------------------------------- |
| `EntityMeta` | 2    | `internal/common/types/meta.ts` |

Used as a type annotation in `functions-runtime/src/url.ts` and
`packages/core/echo/echo-db/src/core-db/object-core.ts`. The latter is internal to echo-db
and should use the in-package path. For `functions-runtime`, the type can be
expressed via `ReturnType<typeof Entity.getMeta>` (the public API shape), or promoted to
`@dxos/echo/Entity` via a `export type { EntityMeta }` addition.

---

### 2f. `getSchemaURI` → `@dxos/echo/Annotation` or a designated migration entrypoint

| Symbol         | Uses | Lives in                             |
| -------------- | ---- | ------------------------------------ |
| `getSchemaURI` | 1    | `internal/Annotation/annotations.ts` |

Used only in `sdk/migrations/src/migration-builder.ts`. This belongs in
`@dxos/echo/Annotation` as a public utility (it returns the fully-qualified DXN URI for a
schema's `@type` annotation). Add to `src/Annotation.ts` exports.

---

## Tier 3 — Hard: True internal plumbing; needs design before removal

These symbols expose internal implementation mechanics that should not be part of any public API.
Each one requires a decision about what the _right_ abstraction is.

---

### 3a. Proxy inspection utilities — `isProxy`, `getProxyTarget`, `getProxyHandler`

| Symbol            | Uses | Lives in                                           |
| ----------------- | ---- | -------------------------------------------------- |
| `isProxy`         | 7    | `internal/common/proxy/proxy-utils.ts`             |
| `getProxyTarget`  | 2    | `internal/common/proxy/proxy-utils.ts`             |
| `getProxyHandler` | 1    | `internal/common/proxy/proxy-utils.ts` (test-only) |

**`isProxy`** is used broadly to guard "is this thing an ECHO live object?" checks before
doing mutations. It deserves promotion to the public API under a better name.
Proposed: `Obj.isLive(obj)` (or `isEchoObject`) in the `@dxos/echo/Obj` subpath.

**Consumers of `isProxy`**: `echo-db/src/core-db/object-core.ts`,
`echo-db/src/echo-handler/doc-accessor.ts`, `echo-db/src/echo-handler/echo-object-utils.ts`,
`echo-db/src/text.ts`, `echo-generator/src/generator.ts`,
`react-ui-canvas-editor/src/types/model.ts`, `echo-db/src/proxy-db/database.ts`.

**`getProxyTarget`** — used in `echo-db/src/echo-handler/echo-object-utils.ts` and
`echo-db/src/proxy-db/database.ts` to strip the proxy layer and access underlying storage.
This is used inside echo-client itself (future: echo-client/src) and is a legitimate
internal-to-echo-client use; once S2 lands these files are inside `@dxos/echo-client`
and can use a package-internal import instead. No public API needed.

**`getProxyHandler`** — used only in `echo-handler.skill-test.ts`. After S8 (handler
split), this will become redundant. No public API needed; keep in internal.

**Decision**: Promote `isProxy` to public as `Obj.isLive`. Internalize `getProxyTarget` and
`getProxyHandler` into echo-client via `@dxos/echo-client/internal` (created in S4).

---

### 3b. Reactive event batching — `batchEvents`

| Symbol        | Uses | Lives in                               |
| ------------- | ---- | -------------------------------------- |
| `batchEvents` | 4    | `internal/common/proxy/event-batch.ts` |

Used in: `echo-db/src/core-db/core-database.ts`,
`echo-db/src/echo-handler/echo-array.ts`, `echo-db/src/hypergraph.ts`,
`plugin-comments/src/operations/restore.ts`.

All three echo-db uses are inside the future `@dxos/echo-client` package (after S2) and
should be converted to a package-internal import once `@dxos/echo-client/internal` is
created (S4). The plugin use (`plugin-comments`) is the interesting case: it batch-wraps
mutations on ECHO objects to avoid redundant subscriber notifications. This capability
belongs in a public reactive-writes API — e.g., `Obj.update(obj, () => { ... })` already
provides this semantics for single-object updates. `plugin-comments` is doing a
multi-object batch. **Proposed public API**: `Obj.batch(() => { ... })` wrapper in
`@dxos/echo/Obj`.

**Decision**: Add `Obj.batch` to the public API (thin wrapper over `batchEvents`). Convert
echo-client internal uses to an in-package internal import.

---

### 3c. Raw JSON model attribute keys — `ATTR_TYPE`, `ATTR_META`, `ATTR_PARENT`, `ATTR_RELATION_SOURCE`, `ATTR_RELATION_TARGET`, `ATTR_DELETED`

| Symbol                 | Uses | Lives in                                 |
| ---------------------- | ---- | ---------------------------------------- |
| `ATTR_TYPE`            | 8    | `internal/common/types/typename.ts`      |
| `ATTR_META`            | 3    | `internal/common/types/meta.ts`          |
| `ATTR_RELATION_SOURCE` | 3    | `internal/common/types/model-symbols.ts` |
| `ATTR_RELATION_TARGET` | 3    | `internal/common/types/model-symbols.ts` |
| `ATTR_PARENT`          | 2    | `internal/common/types/typename.ts`      |
| `ATTR_DELETED`         | 2    | `internal/common/types/model-symbols.ts` |

These are the raw JSON property keys used in the Automerge document model:
`"@type"`, `"@meta"`, `"@parent"`, `"@relationSource"`, `"@relationTarget"`, `"@deleted"`.
They are not user-facing — they're the wire format inside CRDTs.

**Consumers** are all internal to the packages being refactored:

- `echo-db/src/client/index-query-source-provider.ts`
- `echo-db/src/core-db/core-database.ts`
- `echo-db/src/echo-handler/edit-history.ts`
- `echo-db/src/queue/queue-service.ts`
- `echo-db/src/queue/queue.ts`
- `echo-pipeline/src/filter/filter-match.ts`
- `echo-pipeline/src/query/query-executor.ts`
- `index-core/src/index-engine.ts` and `indexes/entity-meta-index.ts`
- `index-core/src/indexes/fts-index.test.ts`
- `index-core/src/indexes/reverse-ref-index.test.ts`

**Decision**: These should NOT become public. Instead:

1. The echo-db / echo-client files move to a package-internal import after S2.
2. The echo-pipeline / echo-host and index-core files should import them through
   `@dxos/echo-host/internal` (a new `@dxos/echo-host` designated internal entrypoint,
   similar to S4's `@dxos/echo-client/internal`). This keeps the wire-format knowledge
   co-located with the host-side storage engine.

---

### 3d. `ObjectJSON` and queue-level serialization types

| Symbol                  | Uses | Lives in                          |
| ----------------------- | ---- | --------------------------------- |
| `ObjectJSON`            | 5    | `internal/Obj/json-serializer.ts` |
| `objectStructureToJson` | 1    | `internal/Obj/json-serializer.ts` |
| `assertObjectModel`     | 1    | `internal/Obj/json-serializer.ts` |
| `setRefResolverOnData`  | 1    | `internal/Ref/ref.ts`             |

`ObjectJSON` is the snapshot-JSON wire format: `{ id, '@type', '@meta', ... }`. It is used
heavily in the queue subsystem (`echo-db/src/queue/queue.ts`, `queue-service.ts`) and in
echo-pipeline's queue data sources. All of these are internal to the storage layer.

**Decision**: After S6 (queue cleanup) and S2 (echo-client rename), these become in-package
uses inside echo-client. No public API needed. For echo-pipeline's
`local-queue-service.ts`, `queue-data-source.ts`, and `automerge-data-source.ts` —
these move to echo-host after S1 is fully in place, and should import from a shared
`@dxos/echo-host/internal` path.

---

### 3e. `EventId`, `objectData`, `SelfURIId`, `ParentId` — internal proxy/identity symbols

| Symbol       | Uses | Lives in                                 |
| ------------ | ---- | ---------------------------------------- |
| `EventId`    | 1    | `internal/common/proxy/symbols.ts`       |
| `objectData` | 1    | `internal/common/proxy/proxy-types.ts`   |
| `SelfURIId`  | 1    | `internal/common/types/model-symbols.ts` |
| `ParentId`   | 1    | `internal/common/types/model-symbols.ts` |

All four are used inside `echo-db` (future echo-client) internals:

- `EventId` → `echo-db/src/echo-handler/echo-proxy-target.ts`
- `objectData` → `echo-db/src/util/devtools-formatter.ts`
- `SelfURIId`, `ParentId` → `echo-db/src/queue/queue.ts`

**Decision**: All become in-package internal uses after S2. `devtools-formatter.ts` is
borderline — it is only loaded in devtools mode and `objectData` is the symbol key for the
devtools protocol. Consider moving the devtools formatter into echo-client's
`@dxos/echo-client/internal` entrypoint.

---

### 3f. `defineHiddenProperty` — JS property plumbing

| Symbol                 | Uses | Lives in                                          |
| ---------------------- | ---- | ------------------------------------------------- |
| `defineHiddenProperty` | 1    | `internal/common/proxy/define-hidden-property.ts` |

Used in `echo-db/src/queue/queue.ts` to stamp a hidden property on a queue item.
This is internal echo-client plumbing. After S2 this becomes an in-package import.
No public API needed.

---

### 3g. `setRefResolver` — internal ref resolution wiring

| Symbol           | Uses | Lives in              |
| ---------------- | ---- | --------------------- |
| `setRefResolver` | 1    | `internal/Ref/ref.ts` |

Used in `echo-db/src/hypergraph.ts` to wire the global ref resolver. After S2, in-package.
No public API needed — this is a one-time wiring call inside the database initialization.

---

## Consolidated migration plan

### Phase A — Mechanical import renames (Tier 1, ~1 day)

Run a codemod / sed over the 120+ Tier 1 call sites:

```sh
# Annotation symbols
sed -i "s/from '@dxos\/echo\/internal'/from '@dxos\/echo\/Annotation'/" <files importing only annotation symbols>

# Format symbols
sed -i "s/from '@dxos\/echo\/internal'/from '@dxos\/echo\/Format'/" <files importing only format symbols>

# Obj symbols
# Entity symbols
# Ref/JsonSchema symbols
```

In practice most files import a mix of symbols from different categories, so the codemod
must split the single `import { ... }` into multiple imports by destination. A TypeScript
codemod or ts-morph script is more reliable than sed.

After the rename, verify: `grep -rn "from '@dxos/echo/internal'" packages/plugins packages/sdk/schema packages/devtools | grep -v node_modules` should return only files with Tier 2 or Tier 3 symbols.

---

### Phase B — Small public API additions (Tier 2, ~half day)

1. Add to `packages/core/echo/echo/src/Annotation.ts`:
   - `PropertyMetaAnnotationId`, `PropertyMetaAnnotation`, `PropertyMeta`, `getPropertyMetaAnnotation`
   - `ReferenceAnnotationId`, `ReferenceAnnotationValue`
   - `FieldLookupAnnotationId`
   - `getSchemaURI`

2. Add `Obj.batch` to `packages/core/echo/echo/src/Obj.ts` (wraps `batchEvents`).

3. Add `Obj.isLive` (wraps `isProxy`) to `packages/core/echo/echo/src/Obj.ts`.

4. Migrate `createAnnotationHelper` callers in `sdk/schema` to `Annotation.make`.

5. Replace `AnyEntity` in `functions-runtime-cloudflare` with `Entity.Unknown`.

6. Verify `Ref` subpath exports include `refFromEncodedReference`, `createSchemaReference`, `getSchemaReference`.

---

### Phase C — Internalize within echo-client (Tier 3, part of S2–S4)

After S2 (echo-db renamed to echo-client):

- `ATTR_*` constants, `ObjectJSON`, `objectData`, `defineHiddenProperty`, `setRefResolver`,
  `EventId`, `SelfURIId`, `ParentId` all move to in-package imports
  (e.g., `import { ATTR_TYPE } from '../common/types/typename'` instead of
  `import { ATTR_TYPE } from '@dxos/echo/internal'`).

After S4 (`@dxos/echo-client/internal` is created):

- `getProxyTarget` — move its uses inside echo-client to the internal entrypoint or direct file import.
- `batchEvents` — plugin-comments use migrates to `Obj.batch`.
- echo-pipeline / index-core `ATTR_*` uses → import from a new `@dxos/echo-host/internal` entrypoint
  (created alongside `@dxos/echo-client/internal` in S4; the ATTR constants live closer to the host
  storage layer anyway).

---

## Open questions

1. **`Obj.batch` semantics**: `batchEvents` currently defers all reactive notifications until the
   callback returns. Should `Obj.batch` be Effect-based (returning an `Effect`) or callback-based?
   Callback style is simpler and matches existing patterns in `Obj.update`.

2. **`Obj.isLive` naming**: `isProxy` is a low-level name. `Obj.isLive` (live reactive object,
   not a snapshot) more accurately captures the user-facing meaning. Alternative: `Obj.isReactive`.

3. **`createAnnotationHelper` compatibility**: Verify that symbols created with
   `Symbol.for('@dxos/schema/annotation/X')` and string IDs `'@dxos/schema/annotation/X'` in
   `Annotation.make` serialize identically over the wire and in Effect Schema AST nodes. If not,
   a compatibility shim is needed before migrating.

4. **echo-pipeline ATTR\_ path**: echo-pipeline is being renamed to echo-host (S1). Once the rename
   is complete, the question is whether to create `@dxos/echo-host/internal` as a separate
   entrypoint or co-locate the ATTR constants inside echo-host itself (moving them out of
   `@dxos/echo/internal` entirely). The latter is cleaner but requires moving source files.

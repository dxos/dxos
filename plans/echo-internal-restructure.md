# ECHO Internal Directory Restructure

## Goal

Restructure `@dxos/echo` `src/internal/` directory so that its subdirectory structure mirrors the exported API modules (Obj, Ref, Annotation, etc.), without changing any behavior.

Each API module will import from its own internal subdirectory:

```ts
// Obj.ts
import * as objInternal from './internal/Obj';
```

Modules that don't map cleanly to a single API module go in `internal/common/`.

## Rules

1. **common/ must not import from non-common modules.** The dependency direction is:
   `Annotation/`, `Entity/`, `Obj/`, `Ref/`, etc. → `common/` (never the reverse).
   `common/` is the shared foundation; non-common modules depend on it.
2. `internal/index.ts` must continue to re-export everything (backward compat for `@dxos/echo/internal`).
3. No behavioral changes — only file moves and import path updates.
4. Each internal subdir must NOT create circular imports with common/.

## Final Structure

```
internal/
  Annotation/      ← annotations + sorting helpers
  Entity/          ← entity model, api helpers (getDXN, getDatabase), version
  Format/          ← format definitions
  JsonSchema/      ← json-schema conversion
  Obj/             ← object operations (create, clone, snapshot, serialization)
  Ref/             ← references
  Type/            ← echo schema (EchoSchema, compose, persistent)
  common/
    api/           ← meta helpers only (getMetaChecked, getKeys, addTag, etc.)
    proxy/         ← proxy/reactivity (make-object, reactive, change-context, etc.)
    types/         ← base types, entity kinds, model symbols, meta, typename, version
  index.ts         ← re-exports everything (backward compat)
```

## API Module → Internal Import Mapping

| API Module    | Internal import                         |
| ------------- | --------------------------------------- |
| Annotation.ts | `./internal/Annotation`                 |
| Entity.ts     | `./internal/Entity` + `./internal`      |
| Format.ts     | `./internal/Format`                     |
| JsonSchema.ts | `./internal/JsonSchema`                 |
| Obj.ts        | `./internal/Obj`                        |
| Ref.ts        | `./internal/Ref`                        |
| Relation.ts   | `./internal/Obj` (shares obj internals) |
| Type.ts       | `./internal/Type`                       |
| Collection.ts | `./internal` (only uses annotations)    |
| Database.ts   | `./internal` (deep imports)             |
| Feed.ts       | `./internal` (only uses annotations)    |
| Filter.ts     | `./internal` (only uses getTypeDXN)     |
| Query.ts      | `./internal` (only uses getTypeDXN)     |
| Tag.ts        | `./internal` (only uses annotations)    |
| View.ts       | `./internal` (only uses annotations)    |

## Stages

### Stage 1: Move to common — **DONE**

- [x] Move all internal subdirs into `internal/common/`
- [x] Create `internal/common/index.ts` (same exports as old `internal/index.ts`)
- [x] Update `internal/index.ts` to `export * from './common'`
- [x] Fix deep imports: Database.ts, Annotation.ts, Format.ts
- [x] Verify: cycles, build, tests

### Stage 2: Annotation — **DONE**

- [x] Move `common/annotations/` → `internal/Annotation/`
- [x] Update `common/index.ts` re-export: `./annotations` → `../Annotation`
- [x] Update cross-references within common that import from `../annotations/`
- [x] Update `Annotation.ts` to `import * from './internal/Annotation'`
- [x] Verify: cycles, build, tests

### Stage 3: Ref — **DONE**

- [x] Move `common/ref/` → `internal/Ref/`
- [x] Update `common/index.ts` re-export
- [x] Update `Ref.ts` to `import * as refInternal from './internal/Ref'`
- [x] Fix cross-references (Database.ts deep import)
- [x] Verify: cycles, build, tests

### Stage 4: Format — **DONE**

- [x] Move `common/formats/` → `internal/Format/`
- [x] Update `common/index.ts` re-export
- [x] Update `Format.ts` to `import * from './internal/Format'`
- [x] Verify: cycles, build, tests

### Stage 5: JsonSchema — **DONE**

- [x] Move `common/json-schema/` → `internal/JsonSchema/`
- [x] Update `common/index.ts` re-export
- [x] Update `JsonSchema.ts` to `import * as jsInternal from './internal/JsonSchema'`
- [x] Verify: cycles, build, tests

### Stage 6: Type — **DONE**

- [x] Move `common/schema/` → `internal/Type/`
- [x] Update `common/index.ts` re-export
- [x] Update `Type.ts` to `import * as typeInternal from './internal/Type'`
- [x] Verify: cycles, build, tests

### Stage 7: Entity — **DONE**

- [x] Move `common/entities/` → `internal/Entity/`
- [x] Update `common/index.ts` re-export
- [x] Update `Entity.ts` to `import * as entityInternal from './internal/Entity'`
- [x] Verify: cycles, build, tests

### Stage 8: Obj — **DONE**

- [x] Move `common/object/` → `internal/Obj/`
- [x] Update `common/index.ts` re-export
- [x] Update `Obj.ts` to `import * as objInternal from './internal/Obj'`
- [x] Verify: cycles, build, tests

### Stage 9: Enforce common/ isolation — **DONE**

- [x] Move `common/api/sorting.ts` → `Annotation/sorting.ts` (depends on Annotation)
- [x] Move `common/api/entity.ts` → `Entity/api.ts` (depends on Entity)
- [x] Move `common/api/version.ts` → `Entity/version.ts` (depends on Entity)
- [x] Move `common/api/annotations.ts` content → `Annotation/annotations.ts` (previous stage)
- [x] Move model symbol constants (`ObjectDeletedId`, `SelfDXNId`, `RelationSourceId`, etc.) from Entity/ into `common/types/model-symbols.ts` so proxy/ can use them
- [x] Entity/ re-exports moved symbols for backward compat
- [x] `common/api/` now contains only `meta.ts` (no non-common imports)
- [x] Verify: cycles, build, tests

## Remaining common/ violations (proxy/)

The following `common/proxy/` source files still import from non-common modules.
These are function/class imports that cannot be trivially moved to common/ without
pulling in significant dependency trees:

| File                       | Non-common import  | Symbol              |
| -------------------------- | ------------------ | ------------------- |
| `proxy/make-object.ts`     | `../../Annotation` | `getTypeAnnotation` |
| `proxy/typed-handler.ts`   | `../../Annotation` | `getSchemaDXN`      |
| `proxy/json-serializer.ts` | `../../Ref`        | `Ref`               |
| `proxy/reactive.ts`        | `../../Ref/ref`    | `RefTypeId`         |

Fixing these requires either moving the referenced functions/types into common/
or restructuring proxy/ to not depend on them directly (e.g., via dependency injection
or by splitting proxy/ into a common core and module-specific parts).

## Verification

```bash
# Check cycles
pnpm run check-cycles

# Build
moon run echo:build

# Test
moon run echo:test

# Verify common/ isolation (source files only, excluding index.ts barrel and tests)
# Should return only the 4 known proxy violations listed above.
rg "from ['\"]\.\./(Annotation|Entity|Ref|Obj|Format|JsonSchema|Type)" \
  packages/core/echo/echo/src/internal/common/ \
  --glob '!**/index.ts' --glob '!**/*.test.ts'
```

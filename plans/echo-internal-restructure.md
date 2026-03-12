# ECHO Internal Directory Restructure

## Goal

Restructure `@dxos/echo` `src/internal/` directory so that its subdirectory structure mirrors the exported API modules (Obj, Ref, Annotation, etc.), without changing any behavior.

Each API module will import from its own internal subdirectory:
```ts
// Obj.ts
import * as objInternal from './internal/Obj';
```

Modules that don't map cleanly to a single API module go in `internal/common/`.

## Current Structure

```
internal/
  annotations/     → used by Annotation.ts (+ many others)
  api/             → used by Entity, Obj, Relation (shared helpers)
  entities/        → used by Entity, Obj, Relation
  formats/         → used by Format.ts
  json-schema/     → used by JsonSchema.ts
  object/          → used by Obj.ts
  proxy/           → used by Obj, Relation (shared)
  ref/             → used by Ref.ts
  schema/          → used by Type.ts
  types/           → used by many (shared base types)
  index.ts         → re-exports everything
```

## Target Structure

```
internal/
  Annotation/      ← from annotations/
  Entity/          ← from entities/
  Format/          ← from formats/
  JsonSchema/      ← from json-schema/
  Obj/             ← from object/
  Ref/             ← from ref/
  Type/            ← from schema/
  common/          ← from api/, proxy/, types/
  index.ts         ← re-exports everything (backward compat for @dxos/echo/internal)
```

## API Module → Internal Import Mapping

| API Module      | Internal import                        |
|-----------------|----------------------------------------|
| Annotation.ts   | `./internal/Annotation`                |
| Entity.ts       | `./internal/Entity` + `./internal`     |
| Format.ts       | `./internal/Format`                    |
| JsonSchema.ts   | `./internal/JsonSchema`                |
| Obj.ts          | `./internal/Obj`                       |
| Ref.ts          | `./internal/Ref`                       |
| Relation.ts     | `./internal/Obj` (shares obj internals)|
| Type.ts         | `./internal/Type`                      |
| Collection.ts   | `./internal` (only uses annotations)   |
| Database.ts     | `./internal` (deep imports)            |
| Feed.ts         | `./internal` (only uses annotations)   |
| Filter.ts       | `./internal` (only uses getTypeDXN)    |
| Query.ts        | `./internal` (only uses getTypeDXN)    |
| Tag.ts          | `./internal` (only uses annotations)   |
| View.ts         | `./internal` (only uses annotations)   |

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

## Verification Commands

```bash
# Check cycles
pnpm run check-cycles

# Build
moon run echo:build

# Test
moon run echo:test
```

## Constraints

- `internal/index.ts` must continue to re-export everything (backward compat for `@dxos/echo/internal`)
- No behavioral changes — only file moves and import path updates
- Shared modules (proxy, api, types) remain in `common/`
- Each internal subdir must NOT create circular imports with common/

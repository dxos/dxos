# Task Plan

## Objective
Fix type inference issues in the @dxos/echo API so that consumers can use the API without needing type casts.

**Critical Constraint**: No casts to fix type issues, except:
- Internal to the echo package
- Only as a last resort when no other options exist

## Phases

### Phase 1: Research & Discovery ✅
- [x] Understand the current codebase structure
- [x] Identify relevant files and dependencies
- [x] Document findings in findings.md
- [x] Analyze gap between current and desired API

### Phase 1.5: Type.ts API Refactor ⬅️ CURRENT
Goal: Refactor Type.ts to have cleaner API with runtime schemas

#### Summary of Changes
| Current | New | Description |
|---------|-----|-------------|
| `Type.Obj.Any` | `Type.Obj.Any` | Alias for `Type.Obj<any>` |
| `Type.Obj.Of<Self>` | `Type.Obj<T>` | Schema type (Self=schema → T=instance) |
| `Type.makeObject({...})` | `Type.makeObject({...})` | Factory function |
| (none) | `Type.Obj` (value) | Runtime schema for any ECHO object |

#### Implementation Steps

- [ ] **1.5.1** Create runtime "any object" schema
  - Create `AnyObjectSchema` that validates ECHO objects (has id, typename, brand)
  - Export as `Type.Obj` value

- [ ] **1.5.2** Define `Type.Obj<T>` generic type
  - `T` is instance type (not schema type)
  - Must extend AnnotableClass for `.pipe()` support
  - Include typename, version properties

- [ ] **1.5.3** Add `Type.Obj.Any` namespace alias
  - `Type.Obj.Any = Type.Obj<any>`

- [ ] **1.5.4** Rename `Type.Obj()` to `Type.makeObject()`
  - Keep same functionality
  - Update return type to use new `Type.Obj<T>`

- [ ] **1.5.5** Repeat for Relations
  - Create `AnyRelationSchema` runtime value
  - Define `Type.Relation<T>` generic type
  - Add `Type.Relation.Any` alias
  - Rename `Type.Relation()` to `Type.makeRelation()`

- [ ] **1.5.6** Repeat for Entity
  - Create `AnyEntitySchema` (union of Obj | Relation)
  - Define `Type.Entity<T>` generic type
  - Add `Type.Entity.Any` alias

- [ ] **1.5.7** Update all usages
  - `Type.makeObject({...})` → `Type.makeObject({...})`
  - `Type.makeRelation({...})` → `Type.makeRelation({...})`
  - `Type.Obj.Of<typeof Schema>` → `Type.Obj<InstanceType>`

- [ ] **1.5.8** Remove old exports
  - Remove `Type.Obj.Of`
  - Remove `Type.Relation.Of`
  - Remove `Type.Entity.Of`

#### Files to Modify
- `packages/core/echo/echo/src/Type.ts` - Main changes
- `packages/core/echo/echo/src/internal/schema/echo-schema.ts` - Runtime schema creation
- All files using `Type.makeObject({...})` - Update to `Type.makeObject({...})`
- All files using `Type.Obj.Of<T>` - Update to `Type.Obj<T>`

#### Technical Notes

**Declaration Merging Pattern:**
```ts
// Value: runtime schema
export const Obj: Schema<AnyObject, AnyObjectEncoded> = AnyObjectSchema;

// Type: generic interface with instance type parameter
export interface Obj<T = any> extends
  TypeMeta,
  EchoBrand,
  AnnotableClass<Obj<T>, T & { id: ObjectId }, EncodedT> {}

// Namespace: for .Any alias
export namespace Obj {
  export type Any = Obj<any>;
}
```

**Instance vs Schema Type Parameter:**
- Old: `Type.Obj.Of<typeof PersonSchema>` (schema type)
- New: `Type.Obj<Person>` (instance type)
- More intuitive for users
- AnnotableClass still works via interface extension

### Phase 2: Type System Foundation
Goal: Establish proper type hierarchy for objects, relations, and entities

- [ ] **2.1** Add `Obj.Unknown` type (forces type checking before use)
- [ ] **2.2** Refine `Obj.Any` vs `Obj.Unknown` distinction
- [ ] **2.3** Add `Obj.Snapshot<T>` type for readonly serialized objects
- [ ] **2.4** Constrain `Type.Obj.Any` to only match object schemas
- [ ] **2.5** Constrain `Type.Relation.Any` to only match relation schemas

### Phase 3: Object API
Goal: Ensure `Obj.make`, `Obj.change` work only with objects

- [ ] **3.1** Constrain `Obj.make` to only accept `Type.Obj.Any`
- [ ] **3.2** Constrain `Obj.change` to only accept `Obj.Any` (not relations)
- [ ] **3.3** Make `Obj.Obj<T>` readonly by default
- [ ] **3.4** Ensure `Obj.getTypename` works on live objects but not snapshots

### Phase 4: Relation API
Goal: Add proper relation-specific functions

- [ ] **4.1** Add `Relation.Unknown` type
- [ ] **4.2** Add `Relation.Snapshot<T>` type
- [ ] **4.3** Add `Relation.change(rel, fn)` function
- [ ] **4.4** Ensure `Relation.make` only accepts `Type.Relation.Any`

### Phase 5: Entity API
Goal: Provide unified API for both objects and relations

- [ ] **5.1** Add `Entity.change(entity, fn)` function
- [ ] **5.2** Ensure `Entity.Unknown` properly encompasses both `Obj.Unknown` and `Relation.Unknown`

### Phase 6: React Hooks
Goal: Type-safe React integration

- [ ] **6.1** Constrain `useObject` to only accept objects
- [ ] **6.2** Add `useRelation` hook for relations
- [ ] **6.3** Ensure hooks return proper snapshot types

### Phase 7: Testing & Verification
- [ ] Write comprehensive type tests (compile-time checks)
- [ ] Update existing tests
- [ ] Run `pnpm -w pre-ci`
- [ ] Verify all tests pass

## Decisions Log

| Decision | Rationale | Date |
|----------|-----------|------|
| Use branded types for schema constraints | Ensures `Type.Obj.Any` and `Type.Relation.Any` are distinct at type level | 2026-01-28 |
| `Obj.Unknown` vs `Obj.Any` distinction | `Any` allows any property access, `Unknown` requires `instanceOf` | 2026-01-28 |
| Separate `change` functions | Prevents accidental use of `Obj.change` on relations | 2026-01-28 |
| `KindId` as string literal not unique symbol | Enables declaration file portability (avoids TS4023 errors) | 2026-01-28 |
| `Type.Obj<T>` uses instance type parameter | More intuitive than schema type; `Type.Obj<Person>` vs `Type.Obj<typeof PersonSchema>` | 2026-01-28 |
| Rename `Type.Obj()` to `Type.makeObject()` | Frees `Type.Obj` to be both a runtime schema value and a generic type | 2026-01-28 |
| Add runtime schemas for any object/relation/entity | Enables validation, parsing, type guards for unknown values | 2026-01-28 |
| Keep internal types unexported | Cleaner API surface; `obj`, `relation`, `EchoSchemaBranded`, etc. are internal | 2026-01-28 |

## Blockers & Risks

1. **Effect-TS Schema covariance** - Schema types may not support the level of type discrimination needed
2. **Breaking changes** - Existing code may rely on current permissive types
3. **Internal cast necessity** - May need internal casts to bridge type gaps

## Key Implementation Notes

- Start with `Type.ts` to establish schema type constraints
- Then update `Obj.ts` and `Relation.ts` to use those constraints
- Finally update `Entity.ts` to unify the types
- React hooks should be last since they depend on core types

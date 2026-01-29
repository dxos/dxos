# Findings

## Type API Refactor (2026-01-28)

### Current API
```ts
Type.Obj.Any              // Type alias for any object schema
Type.Obj.Of<Self>         // TypeScript type for effect schema (Self = schema type)
Type.makeObject({...})           // Function that adds object metadata annotation

Type.Relation.Any         // Type alias for any relation schema
Type.Relation.Of<Self>    // TypeScript type for effect schema (Self = schema type)
Type.makeRelation({...})      // Function that adds relation metadata annotation

Type.Entity.Any           // Type alias for any entity schema
Type.Entity.Of<Self>      // TypeScript type for effect schema
```

### Proposed API
```ts
// Objects
Type.Obj                  // Runtime Effect schema for any object (validates ECHO objects)
Type.Obj<T>               // TypeScript type for effect schema (T = instance type)
Type.Obj<any>             // TypeScript type for any object schema
Type.Obj.Any              // Alias for Type.Obj<any>
Type.makeObject({...})    // Factory function that adds object metadata annotation

// Relations
Type.Relation             // Runtime Effect schema for any relation
Type.Relation<T>          // TypeScript type for effect schema (T = instance type)
Type.Relation<any>        // TypeScript type for any relation schema
Type.Relation.Any         // Alias for Type.Relation<any>
Type.makeRelation({...})  // Factory function that adds relation metadata annotation

// Entities (union of Object | Relation)
Type.Entity               // Runtime Effect schema for any entity
Type.Entity<T>            // TypeScript type for effect schema (T = instance type)
Type.Entity<any>          // TypeScript type for any entity schema
Type.Entity.Any           // Alias for Type.Entity<any>
```

### Key Changes

1. **`Type.Obj` becomes dual-purpose**: Both a runtime Effect schema AND a generic type
2. **Instance type parameter**: `Type.Obj<T>` uses instance type (e.g., `Person`), not schema type
3. **Factory rename**: `Type.makeObject({...})` → `Type.makeObject({...})`
4. **Runtime schemas**: Actual Effect schemas for validating/parsing any ECHO object/relation/entity
5. **`.Any` preserved**: `Type.Obj.Any` remains as alias for `Type.Obj<any>`

### TypeScript Implementation Pattern

Uses declaration merging to combine value + type + namespace:
```ts
// Runtime schema value
export const Obj: Schema<...> = createAnyObjectSchema();

// Generic type (instance type parameter)
export type Obj<T = any> = Schema<T, ...> & EchoBrand & { typename: string; version: string; };

// Namespace for .Any alias
export namespace Obj {
  export type Any = Obj<any>;
}
```

### Migration Examples

Before:
```ts
const PersonSchema = Schema.Struct({ name: Schema.String }).pipe(
  Type.makeObject({ typename: 'Person', version: '0.1.0' })
);
export const Person: Type.Obj.Of<typeof PersonSchema> = PersonSchema;
```

After:
```ts
const PersonSchema = Schema.Struct({ name: Schema.String }).pipe(
  Type.makeObject({ typename: 'Person', version: '0.1.0' })
);
export const Person: Type.Obj<Person> = PersonSchema;
// Or just: export const Person = PersonSchema; (type inferred)
```

### Runtime Schema Use Cases

The runtime `Type.Obj` schema enables:
- Validating that an unknown value is an ECHO object
- Parsing JSON into ECHO objects
- Type guards: `Schema.is(Type.Obj)(value)`
- Schema composition: `Schema.Union(Type.Obj, Schema.Null)`

---

## Original Desired API Shape

### Type Hierarchy (Schema Types)
- `Type.Obj` - Schema type created via `Type.makeObject()` pipe
- `Type.Obj.Any` - Any object schema
- `Type.Relation` - Relation schema via `Type.makeRelation()` pipe
- `Type.Relation.Any` - Any relation schema
- `Type.Expando` - Special expandable object type

### Instance Types
- `Obj.Obj<T>` - Reactive object instance, **readonly by default**
- `Obj.Mutable<T>` - Mutable version (inside `Obj.change`)
- `Obj.Any` - Any object instance (accepts any object)
- `Obj.Unknown` - Forces type checking before use
- `Obj.Snapshot<T>` - Readonly serialized version
- `Obj.ID` - Object ID type

### Relation Types
- `Relation.Relation<T>` - Relation instance
- `Relation.Source` / `Relation.Target` - Symbols for endpoints
- `Relation.Snapshot<T>` - Readonly serialized version

### Entity (Parent of Obj and Relation)
- `Entity.Unknown` - Accepts both `Obj.Unknown` and `Relation.Unknown`

### Key Functions & Constraints
| Function | Accepts | Returns | Notes |
|----------|---------|---------|-------|
| `Obj.make(schema, data)` | `Type.Obj.Any` only | `Obj.Obj<T>` | NOT `Type.Relation.Any` |
| `Obj.change(obj, fn)` | `Obj.Any` only | void | fn receives `Obj.Mutable<T>` |
| `Obj.instanceOf(schema, obj)` | schema, obj | type guard | |
| `Obj.getTypename(obj)` | `Obj.Obj<T>` | string | NOT on snapshots |
| `Relation.make(schema, data)` | `Type.Relation.Any` | `Relation.Relation<T>` | |
| `Relation.change(rel, fn)` | `Relation.Any` | void | |
| `Entity.change(entity, fn)` | `Entity.Any` | void | Works on both |
| `useObject(obj)` | `Obj.Obj<T>` | `[Snapshot, updateFn]` | NOT relations |
| `useRelation(rel)` | `Relation.Relation<T>` | `[Snapshot, updateFn]` | |

## Codebase Structure

Main echo package: `packages/core/echo/echo/src/`
- `Obj.ts` - Object types and functions
- `Entity.ts` - Entity (parent of Obj and Relation) types
- `Type.ts` - Schema types (Type.Obj, Type.Relation)
- `Relation.ts` - Relation types and functions
- `internal/` - Internal implementations

React hooks: `packages/core/echo/echo-react/src/`
- `useObject.ts` - Hook for subscribing to objects

## Key Files

| File | Purpose |
|------|---------|
| `packages/core/echo/echo/src/Obj.ts` | Object types (`Any`, `Obj<T>`, `AnyProps`) and functions (`make`, `change`, `getTypename`, etc.) |
| `packages/core/echo/echo/src/Entity.ts` | Entity types (`Unknown`, `Any`, `Kind`) |
| `packages/core/echo/echo/src/Type.ts` | Schema types (`Type.Obj`, `Type.Relation`, `Type.Expando`) |
| `packages/core/echo/echo/src/Relation.ts` | Relation types and functions (`make`, `isRelation`, etc.) |
| `packages/core/echo/echo/src/internal/proxy/reactive.ts` | `Mutable<T>` type and `change` function |
| `packages/core/echo/echo/src/internal/object/snapshot.ts` | `getSnapshot` function |
| `packages/core/echo/echo-react/src/useObject.ts` | React hook for object subscriptions |

## Gap Analysis: Current vs Desired API

### 1. Missing `Obj.Unknown` type
- **Current**: Only `Entity.Unknown` exists
- **Desired**: `Obj.Unknown` that forces type checking before use
- **Note**: `Obj.Any` should accept any object freely, `Obj.Unknown` requires `instanceOf` check

### 2. Missing `Obj.Snapshot<T>` type
- **Current**: No distinct snapshot type
- **Desired**: `Obj.Snapshot<T>` - readonly serialized version that disallows `Obj.getTypename()`

### 3. `Obj.change` accepts relations
- **Current**: `Obj.change` accepts `Entity.Unknown` (includes relations)
- **Desired**: `Obj.change` only accepts `Obj.Any` (not relations)

### 4. Missing `Relation.change`
- **Current**: No `Relation.change` function
- **Desired**: `Relation.change(rel, fn)` - only accepts `Relation.Any`

### 5. Missing `Entity.change`
- **Current**: No `Entity.change` function
- **Desired**: `Entity.change(entity, fn)` - accepts both objects and relations

### 6. `Obj.make` type constraint
- **Current**: Accepts `Schema.Schema.AnyNoContext`
- **Desired**: Only accepts `Type.Obj.Any` (should error on `Type.Relation.Any`)

### 7. `Type.Relation.Any` too permissive
- **Current**: `Type.Relation.Any = Schema.Schema.AnyNoContext`
- **Desired**: Should be constrained to relation schemas only

### 8. Objects not readonly by default
- **Current**: Objects are mutable
- **Desired**: `Obj.Obj<T>` is readonly, mutations only via `Obj.change`

### 9. Missing `useRelation` hook
- **Current**: Only `useObject` which accepts any entity
- **Desired**: Separate `useRelation` hook that only accepts relations

### 10. `useObject` accepts relations
- **Current**: `useObject` accepts `Entity.Unknown`
- **Desired**: `useObject` only accepts `Obj.Obj<T>`, should error on relations

## Dependencies

- `effect/Schema` - Effect-TS schema library
- `@dxos/echo-protocol` - Protocol definitions
- `@dxos/keys` - ObjectId, DXN types

## Patterns Observed

- Namespaced exports (`Obj`, `Entity`, `Type`, `Relation`)
- Effect-TS Schema for type definitions
- `pipe()` pattern for schema composition
- `Type.Obj()` and `Type.Relation()` as schema transformers
- Internal symbols for entity kind identification (`KindId`)

## Notes

- The critical constraint is: **NO CASTS** in consumer code
- Internal casts allowed only as last resort
- Type inference must work without explicit type annotations in most cases

## Terminology

- **"Live object" is DEPRECATED** - Use "echo object" instead
- Echo objects are echo objects whether in the database or not
- `Obj.change` is required for ALL mutations, even objects not yet in a database
- This ensures consistent API regardless of database state

# Plan: Move `echo-atom` into `@dxos/echo`

## Goal

Expose atom bindings as first-class methods on ECHO's existing namespaces (`Obj`, `Entity`, `Relation`, `Ref`, `QueryResult`, `Database`), eliminating the need for a separate `@dxos/echo-atom` import. After the migration, `@dxos/echo-atom` should be deleted (no forwarding shims).

---

## Background

`@dxos/echo-atom` is a thin integration layer between ECHO's reactive object model and `@effect-atom/atom`. It wraps ECHO subscriptions (`Obj.subscribe`, `QueryResult.subscribe`, `Ref.onResolved`) into atoms so that UI code (React via `useAtom`) can derive reactive state without manual subscription management.

Currently 39 source files import from `@dxos/echo-atom`. They all live in `packages/plugins/` and `packages/sdk/`. No `packages/core/echo` packages consume `echo-atom`.

### Current packages and dependency chain

```text
@dxos/echo        (core reactive model, no atom dep)
    ↑
@dxos/echo-atom   (atom wrappers, depends on @effect-atom/atom + @dxos/echo)
    ↑
plugins / sdk     (consumer code)
```

After migration:

```text
@dxos/echo        (core model + atom wrappers, adds @effect-atom/atom dep)
    ↑
plugins / sdk     (consumer code, imports only @dxos/echo)
```

`@dxos/echo-atom` is deleted.

---

## New API Surface

### Symbol-by-symbol migration table

| Old (`@dxos/echo-atom`)          | New (`@dxos/echo`)           | Return type                          | Notes                                                            |
| -------------------------------- | ---------------------------- | ------------------------------------ | ---------------------------------------------------------------- |
| `AtomObj.make(obj)`              | `Obj.atom(obj)`              | `Atom<Obj.Snapshot<T>>`              | Main path                                                        |
| `AtomObj.make(ref)`              | `Obj.atom(ref)`              | `Atom<Obj.Snapshot<T> \| undefined>` | Also subscribes to target object changes (see distinction below) |
| `AtomObj.make(entity)`           | `Entity.atom(entity)`        | `Atom<Entity.Snapshot>`              | For kind-agnostic code                                           |
| `AtomObj.make(relation)`         | `Relation.atom(relation)`    | `Atom<Relation.Snapshot<T>>`         |                                                                  |
| `AtomObj.makeWithReactive(obj)`  | `Obj.atomReactive(obj)`      | `Atom<T>`                            | Returns live proxy, not snapshot                                 |
| `AtomObj.makeWithReactive(ref)`  | `Obj.atomReactive(ref)`      | `Atom<T \| undefined>`               |                                                                  |
| `AtomObj.makeProperty(obj, key)` | `Obj.atomProperty(obj, key)` | `Atom<T[K]>`                         | Fine-grained, only fires on key change                           |
| `AtomRef.make(ref)`              | `ref.atom`                   | `Atom<T \| undefined>`               | Resolves ref once; does NOT subscribe to target mutation         |
| `AtomQuery.fromQuery(result)`    | `queryResult.atom`           | `Atom<T[]>`                          | Memoized per QueryResult instance                                |
| `AtomQuery.make(db, query)`      | `db.query(query).atom`       | `Atom<T[]>`                          | Memoized per QueryResult instance                                |

### New API sketch

```ts
// --- Obj namespace additions ---
export namespace Obj {
  // Snapshot atom (most common)
  export function atom<T extends Obj.Unknown>(obj: T): Atom<Obj.Snapshot<T>>;
  export function atom<T extends Obj.Unknown>(ref: Ref.Ref<T>): Atom<Obj.Snapshot<T> | undefined>;

  // Live reactive atom (for Obj.update calls)
  export function atomReactive<T extends Obj.Unknown>(obj: T): Atom<T>;
  export function atomReactive<T extends Obj.Unknown>(ref: Ref.Ref<T>): Atom<T | undefined>;

  // Property atom (fine-grained)
  export function atomProperty<T extends Obj.Unknown, K extends keyof T>(obj: T, key: K): Atom<T[K]>;
}

// --- Entity namespace additions ---
export namespace Entity {
  export function atom(entity: Entity.Unknown): Atom<Entity.Snapshot>;
}

// --- Relation namespace additions ---
export namespace Relation {
  export function atom<T extends Relation.Unknown>(relation: T): Atom<Relation.Snapshot<T>>;
}

// --- Ref interface addition ---
export interface Ref<T> {
  // ... existing members ...

  /** Read-only atom for the ref target. Resolves once; does not subscribe to target mutations. */
  readonly atom: Atom<T | undefined>;
}

// --- QueryResult interface addition ---
export interface QueryResult<T> {
  // ... existing members ...

  /** Self-updating atom, memoized per QueryResult instance. */
  readonly atom: Atom<T[]>;
}

// Usage: db.query(query).atom — no separate Database namespace addition needed
```

---

## Implementation Steps

### Step 1 — Add `@effect-atom/atom` to `@dxos/echo`

```diff
// packages/core/echo/echo/package.json
 "dependencies": {
   "@dxos/async": "workspace:*",
   ...
   "effect": "catalog:"
+  "@effect-atom/atom": "catalog:"
 }
```

### Step 2 — Create `packages/core/echo/echo/src/atom-impl/`

Create the implementation files in `atom-impl/`:

```text
packages/core/echo/echo/src/atom-impl/
  ref-utils.ts      — loadRefTarget helper
  entity-atoms.ts   — objectFamily, refFamily, propertyFamily, objectWithReactiveFamily, refWithReactiveFamily, entityFamily, relationFamily
  ref-atoms.ts      — refSimpleFamily (one-shot ref load)
  query-atoms.ts    — fromQueryResult
```

These files are internal; no direct public export. The `atom-impl/` directory is consumed by the namespace files.

### Step 3 — Add `Obj.atom`, `Obj.atomReactive`, `Obj.atomProperty`

In `packages/core/echo/echo/src/Obj.ts`, add after the existing exports:

```ts
import * as atomInternal from './atom-impl/entity-atoms';

export const atom = atomInternal.make;
export const atomReactive = atomInternal.makeWithReactive;
export const atomProperty = atomInternal.makeProperty;
```

### Step 4 — Add `Entity.atom` and `Relation.atom`

In `packages/core/echo/echo/src/Entity.ts`:

```ts
export const atom = atomInternal.makeEntity;
```

In `packages/core/echo/echo/src/Relation.ts`:

```ts
export const atom = atomInternal.makeRelation;
```

### Step 5 — Add `atom` getter to `Ref<T>`

The `Ref` interface lives in `packages/core/echo/echo/src/internal/Ref/ref.ts` (interface) and has a concrete implementation. Add:

```ts
// In the Ref interface:
readonly atom: Atom<T | undefined>;

// In RefImpl (implementation):
get atom(): Atom<T | undefined> {
  return refSimpleFamily(this);  // The simple one-shot family, same as AtomRef.make
}
```

The `refSimpleFamily` is the simple version (one-shot load, no subscription to target changes), equivalent to the current `AtomRef.make`.

### Step 6 — Add `atom` getter to `QueryResult<T>`

The `QueryResult` interface lives in `packages/core/echo/echo/src/QueryResult.ts`. Its implementations live in `@dxos/echo-db` and other packages.

Two options:

- **Option A**: Add `atom` to the `QueryResult` interface and update all implementations.
- **Option B**: Make `atom` a default-implemented extension (standalone function) and expose it as both `result.atom` and a stand-alone `QueryResult.atom(result)` function.

**Recommendation: Option B** — avoids touching `@dxos/echo-db` in this PR. Expose `QueryResult.atom` as a standalone function that wraps the subscription pattern:

```ts
// In QueryResult.ts namespace:
export const atom = <T>(result: QueryResult<T>): Atom<T[]> => fromQueryResult(result);
```

Later, once the interface `QueryResult` is stable, a getter can be added. The `db.query(q).atom` shorthand then reads as `QueryResult.atom(db.query(q))` initially, with the getter form coming in a follow-up.

**Note**: If adding a getter to the interface is preferred immediately, mark it optional `readonly atom?: Atom<T[]>` and add it as a computed property inside the `QueryResultImpl` in `@dxos/echo-db`.

### Step 7 — Deprecate and delete `@dxos/echo-atom`

Do NOT leave forwarding shims. Instead:

1. Run codemod to update all 39 call sites.
2. Delete `packages/core/echo/echo-atom/`.
3. Remove `@dxos/echo-atom` from any `package.json` dependency lists.

---

## Call-site Migration (39 files)

### Pattern table

| Old import                                    | New import                                           |
| --------------------------------------------- | ---------------------------------------------------- |
| `import { AtomObj } from '@dxos/echo-atom'`   | `import { Obj } from '@dxos/echo'`                   |
| `import { AtomQuery } from '@dxos/echo-atom'` | `import { Database, QueryResult } from '@dxos/echo'` |
| `import { AtomRef } from '@dxos/echo-atom'`   | _(use `ref.atom` directly)_                          |

### Usage rewrites

```ts
// --- Snapshot atoms ---
AtomObj.make(obj)                   → Obj.atom(obj)
AtomObj.make(ref)                   → Obj.atom(ref)      // subscribes to obj changes
AtomObj.make(entity)                → Entity.atom(entity)
AtomObj.make(relation)              → Relation.atom(relation)

// --- Reactive atoms (live proxy) ---
AtomObj.makeWithReactive(obj)       → Obj.atomReactive(obj)
AtomObj.makeWithReactive(ref)       → Obj.atomReactive(ref)

// --- Property atoms ---
AtomObj.makeProperty(obj, key)      → Obj.atomProperty(obj, key)

// --- Ref atoms (one-shot, no mutation subscription) ---
AtomRef.make(ref)                   → ref.atom

// --- Query atoms ---
AtomQuery.fromQuery(result)         → result.atom
AtomQuery.make(db, query)           → db.query(query).atom
AtomQuery.make(db, filter)          → db.query(filter).atom
```

### Files to update (grouped by package)

**`@dxos/plugin-graph` (22 files)** — app-graph-builder files in each plugin.
All follow the same pattern: `AtomObj.make(obj)` and `AtomQuery.make(db, query/filter)`.

**`packages/sdk/app-framework`** — uses `AtomQuery.make` for service queries.

**`packages/plugins/plugin-*/src/capabilities/`** — 8 container files using `AtomObj`.

**`packages/plugins/plugin-table/`** — uses `AtomObj.makeProperty`.

**`packages/plugins/plugin-form/`** — uses `AtomObj.make`.

**`packages/sdk/schema`** — uses `AtomQuery.make` for schema projection.

---

## Package Dependency Changes

| Package                  | Change                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `@dxos/echo`             | Add `"@effect-atom/atom": "catalog:"` to dependencies                                 |
| All 39 consumer packages | Remove `"@dxos/echo-atom": "workspace:*"`, already have `"@dxos/echo": "workspace:*"` |
| `@dxos/echo-atom`        | Deleted                                                                               |

---

## Open Questions

1. **`atomReactive` naming** — Alternatives: `Obj.liveAtom`, `Obj.reactiveAtom`. The `atomReactive` name mirrors the existing `getReactive`/`getSnapshot` pair in `Obj`.

2. **`echo-atom` package deletion timing** — Can delete in the same PR since all call sites are in-repo. No external consumers to consider (package is private).

---

## Checklist

- [ ] Add `@effect-atom/atom` dependency to `@dxos/echo/package.json`
- [ ] Create `packages/core/echo/echo/src/atom-impl/` with moved implementations
- [ ] Add `Obj.atom`, `Obj.atomReactive`, `Obj.atomProperty` to `Obj.ts`
- [ ] Add `Entity.atom` to `Entity.ts`
- [ ] Add `Relation.atom` to `Relation.ts`
- [ ] Add `readonly atom` getter to `Ref<T>` interface and `RefImpl`
- [ ] Add `readonly atom` getter to `QueryResult<T>` interface and implementations
- [ ] Update all 39 call sites (codemod)
- [ ] Delete `packages/core/echo/echo-atom/`
- [ ] Verify `moon run @dxos/echo:build` and `moon run :test` pass

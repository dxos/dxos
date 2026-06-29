//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Equal from 'effect/Equal';
import * as Exit from 'effect/Exit';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Utils from 'effect/Utils';

import type { ForeignKey } from '@dxos/echo-protocol';
import { SchemaEx } from '@dxos/effect';
import { assertArgument, invariant } from '@dxos/invariant';
import { EntityId, type URI } from '@dxos/keys';
import { assumeType, deepMapValues } from '@dxos/util';

import type * as Database from './Database';
import * as Entity from './Entity';
import * as Err from './Err';
import * as internal from './internal';
import { getProxyTarget, isProxy } from './internal/common/proxy/proxy-utils';
import * as objInternal from './internal/Obj';
import * as Ref from './Ref';
import type * as Tag from './Tag';
import * as Type from './Type';

/**
 * Base type for all ECHO objects.
 */
interface BaseObj extends internal.AnyEntity, Entity.OfKind<typeof Entity.Kind.Object> {}

/**
 * Object type with specific properties.
 */
export type OfShape<Props> = BaseObj & Props;

/**
 * Object with no known properties beyond id and kind.
 * Use this when the object's schema/properties are not known.
 * For objects with arbitrary properties, use `Obj.AnyProps`.
 *
 * NOTE: This is a TypeScript type only, not a schema.
 * To validate that a value is an ECHO object, use `Schema.is(Type.Obj)`.
 */
export interface Unknown extends BaseObj {}

/**
 * Runtime Effect schema for any ECHO object.
 * Use for validation, parsing, or as a reference target for collections.
 *
 * NOTE: `Schema.is(Type.Obj)` does STRUCTURAL validation only (checks for `id` field).
 * Use `Obj.isObject()` for proper ECHO instance type guards that check the KindId brand.
 *
 * @example
 * ```ts
 * // Structural type guard (accepts any object with id field)
 * if (Schema.is(Type.Obj)(unknownValue)) { ... }
 *
 * // ECHO instance type guard (checks KindId brand)
 * if (Obj.isObject(unknownValue)) { ... }
 *
 * // Reference to any object type
 * class Collection extends Type.makeObject<Collection>(DXN.make('com.example.type.collection', '0.1.0'))(
 *   Schema.Struct({ objects: Schema.Array(Ref.Ref(Obj.Unknown)) }),
 * ) {}
 * ```
 */
// TODO(wittjosiah): Investigate if Schema.filter can validate KindId on ECHO instances.
//   Effect Schema normalizes proxy objects to plain objects before calling filter predicates.
//   Possible approaches: custom Schema.declare, AST manipulation, or upstream contribution.
export const Unknown: internal.UnknownTypeSchema<Unknown, typeof Entity.Kind.Object> = Schema.Struct({
  id: Schema.String,
}).pipe(
  Schema.extend(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  Schema.annotations({
    [internal.TypeAnnotationId]: {
      kind: Entity.Kind.Object,
      typename: internal.ANY_OBJECT_TYPENAME,
      version: internal.ANY_OBJECT_VERSION,
    },
  }),
) as unknown as internal.UnknownTypeSchema<Unknown, typeof Entity.Kind.Object>;

/**
 * Object with arbitrary properties.
 *
 * NOTE: Due to how TypeScript works, this type is not assignable to a specific schema type.
 * In that case, use `Obj.instanceOf` to check if an object is of a specific type.
 *
 * Prefer using `Obj.Unknown` when you don't need to access arbitrary properties.
 */
export interface Any extends BaseObj, internal.AnyProperties {}

/**
 * Base type for snapshot objects (has SnapshotKindId instead of KindId).
 */
interface BaseSnapshot extends internal.AnyEntity {
  readonly [Entity.SnapshotKindId]: typeof Entity.Kind.Object;
  readonly id: EntityId;
}

/**
 * Immutable snapshot of an ECHO object.
 * Branded with SnapshotKindId (not KindId).
 * Property values are frozen at the time the snapshot was created.
 * Returned by getSnapshot() and hooks like useObject().
 *
 * Snapshots are structurally identical to reactive objects but have a different brand,
 * making them distinguishable at the TypeScript level. Neither is assignable to the other.
 */
export type Snapshot<T extends Unknown = Unknown> = Omit<T, Entity.KindId> & BaseSnapshot;

/**
 * JSON-encoded properties for objects.
 */
export interface BaseObjJson {
  id: string;
}

// Factory (not a shared const): each object must get its own `keys`/`tags`/`annotations` containers,
// otherwise mutating one object's meta would leak into every other object via the shared references.
const defaultMeta = (): internal.EntityMeta => ({
  keys: [],
  tags: [],
  annotations: {},
});

// TODO(burdon): Should we allow the caller to set the id?
/**
 * Props type for object creation with a given type. Accepts a `Type.AnyObj`
 * entity and derives the instance shape via `Type.InstanceType`. Relation-kind
 * entities are rejected at the type level — use `Relation.MakeProps` for those.
 *
 * When the schema is the unconstrained `Type.AnyObj` (`Obj<unknown>` — e.g. a
 * dynamic type from `schemaRegistry.register`), the instance shape is not
 * statically known, so data props widen to `Record<string, unknown>` and the
 * caller can pass arbitrary fields without a cast.
 */
export type MakeProps<S extends Type.AnyObj> = {
  id?: EntityId;
  [Meta]?: Partial<internal.EntityMeta>;
  [Parent]?: Unknown;
  // When the resolved instance has no known data keys, widen to a permissive
  // record (the `Obj<unknown>` case); otherwise use the precise property shape.
  // `[keyof …] extends [never]` is wrapped in tuples so the check is
  // non-distributive — a `never` instance type (e.g. when narrowing collapses
  // the schema) stays a single branch instead of distributing to `never`.
} & ([keyof Entity.Properties<Type.InstanceType<S>>] extends [never]
  ? Record<string, unknown>
  : Entity.Properties<Type.InstanceType<S>>);

/**
 * Creates a new echo object of the given schema or `Type.Type`.
 *
 * @param typeOrSchema - A static object schema (`Type.makeObject(...)`) or a
 *   `Type.Type` entity (e.g. one returned by `db.addType(schemaEntity)`).
 * @param props - Object properties.
 *
 * Meta can be passed as a symbol in `props`.
 *
 * Example:
 * ```ts
 * const obj = Obj.make(Person, { [Obj.Meta]: { keys: [...] }, name: 'John' });
 * ```
 *
 * Note: Only accepts object schemas / object-kind types, not relation schemas.
 * Use `Relation.make` for relations.
 */
export function make<T extends Type.AnyObj>(type: T, props: NoInfer<MakeProps<T>>): OfShape<Type.InstanceType<T>>;
export function make(input: Type.AnyObj, props: any): OfShape<any> {
  // `Type.Type` entities aren't `Schema.Schema` themselves; derive the Effect
  // Schema via `Type.getSchema(...)`. Pass the entity through to `makeObject`
  // so subsequent schema mutations (`Type.addFields`, etc.) propagate.
  const schema = Type.getSchema(input);
  assertArgument(
    internal.getTypeAnnotation(schema)?.kind === Entity.Kind.Object,
    'schema',
    'Expected an object schema',
  );

  let meta: internal.EntityMeta | undefined = undefined;

  // Set default fields on meta on creation.
  if (props[internal.MetaId] != null) {
    meta = { ...defaultMeta(), ...props[internal.MetaId] };
    delete props[internal.MetaId];
  }

  // Filter undefined values (Object.entries only returns string-keyed properties).
  const filterUndefined: any = Object.fromEntries(Object.entries(props).filter(([_, v]) => v !== undefined));

  // Copy symbol properties (like ParentId) that Object.entries doesn't include.
  for (const sym of Object.getOwnPropertySymbols(props)) {
    const value = (props as any)[sym];
    if (value !== undefined) {
      filterUndefined[sym] = value;
    }
  }

  return internal.makeObject(
    schema,
    filterUndefined,
    {
      ...defaultMeta(),
      ...meta,
    },
    input,
  );
}

/**
 * Determine if object is an ECHO object.
 */
export const isObject = (obj: unknown): obj is Unknown => {
  assumeType<internal.InternalObjectProps>(obj);
  return typeof obj === 'object' && obj !== null && obj[Entity.KindId] === Entity.Kind.Object;
};

export const isSnapshot = (obj: unknown): obj is Snapshot => {
  assumeType<internal.InternalObjectProps>(obj);
  return typeof obj === 'object' && obj !== null && (obj as any)[Entity.SnapshotKindId] === Entity.Kind.Object;
};

/**
 * Subscribe to object updates.
 * The callback is called synchronously when the object is modified.
 * Only accepts reactive objects (not snapshots).
 * @returns Unsubscribe function.
 */
export const subscribe = (obj: Unknown, callback: () => void): (() => void) => {
  return internal.subscribe(obj, callback);
};

//
// Snapshot
//

/**
 * Returns an immutable snapshot of an object.
 * The snapshot is branded with SnapshotKindId instead of KindId,
 * making it distinguishable from the reactive object at the type level.
 */
export const getSnapshot: <T extends Unknown>(obj: T) => Snapshot<T> = objInternal.getSnapshot as any;

/**
 * Returns the reactive version of an object from the database, given its snapshot.
 * Inverse of `Obj.getSnapshot`.
 *
 * Uses `Obj.getDatabase` internally to get the database from the snapshot,
 * then resolves the reactive object by ID.
 *
 * @param snapshot - A snapshot of the object (from `Obj.getSnapshot`).
 * @returns Effect that succeeds with the reactive object, or fails with `GetReactiveError`.
 * @example
 * ```ts
 * const snapshot = Obj.getSnapshot(obj);
 * const reactive = Obj.getReactive(snapshot).pipe(
 *   Effect.runSync
 * );
 * ```
 */
export const getReactive = <T extends Unknown>(snapshot: Snapshot<T>): Effect.Effect<T, Err.GetReactiveError> =>
  Effect.gen(function* () {
    const db = internal.getDatabase(snapshot);
    if (!db) {
      return yield* Effect.fail(new Err.GetReactiveError({ reason: 'no-database', snapshotId: snapshot.id }));
    }
    const obj = db.getObjectById(snapshot.id);
    if (!obj) {
      return yield* Effect.fail(new Err.GetReactiveError({ reason: 'object-not-found', snapshotId: snapshot.id }));
    }
    return obj as T;
  });

/**
 * Like `Obj.getReactive` but returns `Option.none()` instead of failing when the object
 * cannot be resolved (no database, object not found).
 *
 * @param snapshot - A snapshot of the object (from `Obj.getSnapshot`).
 * @returns Effect that succeeds with `Option.some(reactive)` or `Option.none()`.
 */
export const getReactiveOption = <T extends Unknown>(snapshot: Snapshot<T>): Effect.Effect<Option.Option<T>, never> =>
  getReactive(snapshot).pipe(
    Effect.map(Option.some),
    Effect.catchAll(() => Effect.succeed(Option.none())),
  );

/**
 * Synchronous version of `Obj.getReactive`. Returns the reactive object or throws
 * `GetReactiveError` when the object cannot be resolved (no database, object not found).
 *
 * @param snapshot - A snapshot of the object (from `Obj.getSnapshot`).
 * @returns The reactive object.
 * @throws {Err.GetReactiveError} When the object cannot be resolved.
 */
export const getReactiveOrThrow = <T extends Unknown>(snapshot: Snapshot<T>): T =>
  Effect.runSync(getReactive(snapshot));

/**
 * Synchronous version of `Obj.getReactive` that returns `undefined` instead of throwing.
 * Accepts `undefined` input so callers can pass the result of `useObject` directly.
 *
 * @param snapshot - A snapshot of the object (from `Obj.getSnapshot` or `useObject`), or `undefined`.
 * @returns The reactive object, or `undefined` if the snapshot is `undefined` or unresolvable.
 */
export const getReactiveOrUndefined = <T extends Unknown>(snapshot: Snapshot<T> | undefined): T | undefined => {
  if (snapshot === undefined) {
    return undefined;
  }
  return Effect.runSyncExit(getReactive(snapshot)).pipe(
    Exit.match({ onSuccess: (value) => value, onFailure: () => undefined }),
  );
};

export type CloneOptions = {
  /**
   * Retain the original object's ID.
   * @default false
   */
  retainId?: boolean;

  /**
   * Recursively clone referenced objects.
   * - `'parent'`: clone only refs whose target is transitively parented under the clone root (children
   *   that cascade-delete with it); shared refs (registry operations, context objects, …) are copied as-is.
   * - `'all'`: clone every referenced object recursively.
   * Omit for a shallow clone (refs copied as-is).
   */
  deep?: 'parent' | 'all';
};

/**
 * Clones an object or relation.
 * This does not clone referenced objects, only the properties in the object.
 * @returns A new object with the same schema and properties.
 */
export const clone: <T extends Unknown>(obj: T, opts?: CloneOptions) => T = objInternal.clone;

//
// Change
//

/**
 * Makes all properties mutable recursively.
 * Used to provide a mutable view of an object within `Obj.update`.
 */
export type Mutable<T> = internal.Mutable<T>;

/**
 * Perform mutations on an echo object within a controlled context.
 *
 * All mutations within the callback are batched and trigger a single notification
 * when the callback completes. Direct mutations outside of `Obj.update` will throw
 * an error for echo objects.
 *
 * This function also works with nested objects within echo objects (e.g., Template structs)
 * that are reactive at runtime.
 *
 * @param obj - The echo object to mutate. Use `Relation.update` for relations.
 * @param callback - The callback that performs mutations on the object.
 *
 * @example
 * ```ts
 * const person = Obj.make(Person, { name: 'John', age: 25 });
 *
 * // Mutate within Obj.update
 * Obj.update(person, (obj) => {
 *   obj.name = 'Jane';
 *   obj.age = 30;
 * });
 * // ONE notification fires here
 *
 * // Direct mutation throws
 * person.name = 'Bob'; // Error: Cannot modify outside Obj.update()
 * ```
 *
 * Note: Only accepts objects. Use `Relation.update` for relations.
 */
export const update = <T extends Unknown>(obj: T, callback: internal.ChangeCallback<T>): void => {
  internal.change(obj, callback);
};

/**
 * Get a deeply nested property from an object.
 *
 * Similar to lodash.get and getDeep from @dxos/util.
 * This is the complementary function to setValue.
 * Accepts both reactive objects and snapshots.
 *
 * @param obj - The ECHO object to get the property from.
 * @param path - Path to the property (array of keys).
 * @returns The value at the path, or undefined if not found.
 *
 * @example
 * ```ts
 * const person = Obj.make(Person, {
 *   name: 'John',
 *   addresses: [{ street: '123 Main St' }]
 * });
 *
 * Obj.getValue(person, ['addresses', 0, 'street']); // '123 Main St'
 * Obj.getValue(person, ['addresses', 1, 'street']); // undefined
 * ```
 */
export const getValue = (obj: Unknown | Snapshot, path: readonly (string | number)[]): any => {
  return SchemaEx.getValue(obj, SchemaEx.createJsonPath(path));
};

/**
 * Set a deeply nested property on an object, using the object's schema to determine
 * whether to initialize nested data as an empty object or array.
 *
 * Similar to lodash.set and setDeep from @dxos/util, but schema-aware.
 * Must be called within an `Obj.update` callback.
 *
 * NOTE: TypeScript's structural typing allows readonly objects to be passed to `Mutable<T>`
 * parameters, so there is no compile-time error. Enforcement is runtime-only.
 *
 * @param obj - The mutable ECHO object to set the property on.
 * @param path - Path to the property (array of keys).
 * @param value - Value to set.
 * @returns The value that was set.
 *
 * @example
 * ```ts
 * const person = Obj.make(Person, { name: 'John' });
 * // Person schema has: addresses: Schema.Array(Address)
 * Obj.update(person, (obj) => {
 *   Obj.setValue(obj, ['addresses', 0, 'street'], '123 Main St');
 * });
 * // Creates: person.addresses = [{ street: '123 Main St' }]
 * ```
 */
// TODO(wittjosiah): Compute possible path values + type value based on generic object type.
export const setValue: (obj: Mutable<Unknown>, path: readonly (string | number)[], value: any) => void =
  objInternal.setValue as any;

//
// Type
//

export const ID = EntityId;
export type ID = EntityId;

/**
 * Test if an object is an instance of a given object type.
 *
 * @example
 * ```ts
 * const john = Obj.make(Person, { name: 'John' });
 * const isPerson = Obj.instanceOf(Person);
 * if (isPerson(john)) {
 *   // john is Person
 * }
 * ```
 *
 * Only accepts `Type.AnyObj` — use `Relation.instanceOf` for relations and
 * `Type.isType(value)` to test for `Type.Type` meta-schema entities.
 */
export const instanceOf: {
  // Reject `Type.Type` at the type level — those are meta-schema entities, not
  // object instances. Use `Type.isType(value)` instead.
  <T extends Type.Type>(
    type: T,
    _hint?: never,
    // eslint-disable-next-line @typescript-eslint/unified-signatures
    ..._error: ['ERROR: Obj.instanceOf does not accept Type.Type; use Type.isType(value) instead']
  ): never;
  // Reject relation types — use `Relation.instanceOf` instead.
  <R extends Type.AnyRelation>(
    type: R,
    _hint?: never,
    // eslint-disable-next-line @typescript-eslint/unified-signatures
    ..._error: ['ERROR: Obj.instanceOf does not accept relation types; use Relation.instanceOf instead']
  ): never;
  <S extends Type.AnyObj>(schema: S): (value: unknown) => value is Type.InstanceType<S>;
  <S extends Type.AnyObj>(schema: S, value: unknown): value is Type.InstanceType<S>;
} = ((...args: [schema: Type.AnyEntity, value?: unknown]) => {
  if (args.length === 1) {
    return (entity: unknown) => internal.isInstanceOf(args[0], entity);
  }

  return internal.isInstanceOf(args[0], args[1]);
}) as any;

/**
 * Test if a snapshot is an instance of a schema.
 * Mirrors `instanceOf` but only accepts values branded with SnapshotKindId.
 * Use when the value is known to be a snapshot (e.g. from `getSnapshot` or `useObject`).
 *
 * @example
 * ```ts
 * const snapshot = Obj.getSnapshot(person);
 * if (Obj.snapshotOf(Person, snapshot)) {
 *   // snapshot is Obj.Snapshot<Person>
 * }
 * ```
 */
export const snapshotOf: {
  <S extends Type.AnyObj>(schema: S): (value: unknown) => value is Snapshot<Type.InstanceType<S>>;
  <S extends Type.AnyObj>(schema: S, value: unknown): value is Snapshot<Type.InstanceType<S>>;
} = ((...args: [schema: Type.AnyObj, value: unknown] | [schema: Type.AnyObj]) => {
  const check = (entity: unknown) =>
    entity != null &&
    typeof entity === 'object' &&
    Entity.SnapshotKindId in entity &&
    internal.isInstanceOf(args[0], entity);

  if (args.length === 1) {
    return (entity: unknown) => check(entity);
  }

  return check(args[1]);
}) as any;

export type { GetURIOptions } from './internal';

// TODO(dmaretskyi): Allow returning undefined.
/**
 * Get the URI of the object.
 * Accepts both reactive objects and snapshots.
 *
 * @param options.prefer - Controls the URI form (see {@link GetURIOptions}).
 */
export const getURI = (entity: Unknown | Snapshot, options?: internal.GetURIOptions): URI.URI => {
  assertArgument(!Schema.isSchema(entity), 'obj', 'Object should not be a schema.');
  return internal.getUri(entity, options);
};

/**
 * @returns The DXN of the object's type.
 * @example dxn:com.example.type.person:1.0.0
 * @throws If the object is missing its type (corrupted object).
 */
export const getTypeURI = (obj: Unknown | Snapshot): URI.URI => {
  const type = internal.getTypeURI(obj);
  invariant(type != null, 'Corrupted object: missing type.');
  return type;
};

/**
 * Get the type entity (`Type.AnyObj`) the object was created from.
 *
 * Returns `undefined` when the object's type isn't registered in this runtime
 * (e.g. a freshly deserialized snapshot whose type entity hasn't been wired
 * up yet, or an object loaded from storage before its schema is known). To
 * get the Effect Schema from the returned entity, use `Type.getSchema(...)`.
 */
export const getType = (obj: Unknown | Snapshot): Type.AnyObj | undefined =>
  internal.getType(obj) as Type.AnyObj | undefined;

/**
 * @returns The typename of the object's type.
 * Accepts both reactive objects and snapshots.
 * @example `com.example.type.person`
 */
export const getTypename = (entity: Unknown | Snapshot): string | undefined => internal.getTypename(entity);

//
// Database
//

/**
 * Get the database the object belongs to.
 * Accepts both reactive objects and snapshots.
 *
 * @idiom org.dxos.echo.objGetDatabase
 *   applies: Reaching an object's database — to query, add, or remove — when the surrounding Space is not otherwise needed
 *   instead-of: `getSpace(obj)?.db` (resolving the whole Space just to read its `.db`)
 *   uses: {@link getDatabase}
 */
export const getDatabase = (entity: Entity.Unknown | Entity.Snapshot): Database.Database | undefined =>
  internal.getDatabase(entity);

//
// Meta
//

/**
 * Property that accesses metadata for an entity.
 *
 * Alias for `Entity.Meta`.
 */
export const Meta = internal.MetaId;

/**
 * Deeply read-only version of EntityMeta.
 * Prevents mutation at all nesting levels (e.g., `meta.keys.push()` is a TypeScript error).
 */
export type ReadonlyMeta = internal.ReadonlyMeta;

/**
 * Mutable meta type returned by `Obj.getMeta` inside an `Obj.update` callback.
 */
export type Meta = internal.Meta;

// TODO(burdon): Narrow type.
// TODO(dmaretskyi): Allow returning undefined.
/**
 * Get the metadata for an object.
 * Returns mutable meta when passed a mutable object (inside `Obj.update` callback).
 * Returns read-only meta when passed a regular object or snapshot.
 *
 * @example
 * ```ts
 * // Read-only access outside change callback
 * const meta = Obj.getMeta(person);  // ReadonlyMeta
 *
 * // Mutable access inside change callback
 * Obj.update(person, (obj) => {
 *   const meta = Obj.getMeta(obj);     // EntityMeta (mutable)
 *   meta.tags.push(Ref.make(tag));     // tags are refs to Tag objects
 * });
 * ```
 */
// TODO(wittjosiah): When passed a Snapshot, should return a snapshot of meta, not the live meta proxy.
export function getMeta(entity: Mutable<Unknown>): Meta;
export function getMeta(entity: Unknown | Snapshot): ReadonlyMeta;
export function getMeta(entity: Unknown | Snapshot | Mutable<Unknown>): Meta | ReadonlyMeta {
  return internal.getMetaChecked(entity);
}

/**
 * @returns Foreign keys for the object from the specified source.
 * Accepts both reactive objects and snapshots.
 */
export const getKeys: {
  (entity: Unknown | Snapshot, source: string): ForeignKey[];
  (source: string): (entity: Unknown | Snapshot) => ForeignKey[];
} = Function.dual(2, (entity: Unknown | Snapshot, source?: string): ForeignKey[] => internal.getKeys(entity, source!));

/**
 * Delete all keys from the object for the specified source.
 * Must be called within an `Obj.update` callback.
 *
 * NOTE: TypeScript's structural typing allows readonly objects to be passed to `Mutable<T>`
 * parameters, so there is no compile-time error. Enforcement is runtime-only.
 */
export const deleteKeys = (entity: Mutable<Unknown>, source: string): void => internal.deleteKeys(entity, source);

/**
 * Add a tag to the object.
 * Must be called within an `Obj.update` callback.
 *
 * NOTE: TypeScript's structural typing allows readonly objects to be passed to `Mutable<T>`
 * parameters, so there is no compile-time error. Enforcement is runtime-only.
 */
export const addTag = (entity: Mutable<Unknown>, tag: Ref.Ref<Tag.Tag>): void => internal.addTag(entity, tag);

/**
 * Remove a tag from the object.
 * Must be called within an `Obj.update` callback.
 *
 * NOTE: TypeScript's structural typing allows readonly objects to be passed to `Mutable<T>`
 * parameters, so there is no compile-time error. Enforcement is runtime-only.
 */
export const removeTag = (entity: Mutable<Unknown>, tag: Ref.Ref<Tag.Tag>): void => internal.removeTag(entity, tag);

/**
 * Check if the object is deleted.
 * Accepts both reactive objects and snapshots.
 */
// TODO(dmaretskyi): Default to `false`.
export const isDeleted = (entity: Unknown | Snapshot): boolean => objInternal.isDeleted(entity);

//
// Annotations
//

/**
 * Get the label of the object.
 * Accepts both reactive objects and snapshots.
 *
 * @param options.fallback `'typename'` returns the object's typename when no
 *   label is set (e.g. `org.dxos.type.table`).
 */
export const getLabel = (entity: Unknown | Snapshot, options?: internal.GetLabelOptions): string | undefined =>
  internal.getLabel(entity, options);

/**
 * Set the label of the object.
 * Must be called within an `Obj.update` callback.
 *
 * NOTE: TypeScript's structural typing allows readonly objects to be passed to `Mutable<T>`
 * parameters, so there is no compile-time error. Enforcement is runtime-only.
 */
export const setLabel = (entity: Mutable<Unknown>, label: string): void => internal.setLabel(entity, label);

/**
 * Get the description of the object.
 * Accepts both reactive objects and snapshots.
 */
export const getDescription = (entity: Unknown | Snapshot): string | undefined => internal.getDescription(entity);

/**
 * Get the icon annotation for the object (or any entity), resolved via its type-level
 * `IconAnnotation`. Accepts both reactive entities and snapshots, and either Objects or
 * Relations — the underlying schema-based lookup works for both.
 *
 * Returns the full `{ icon, hue }` annotation; callers wanting just the icon name typically
 * write `Obj.getIcon(obj)?.icon ?? 'ph--cube--regular'`.
 */
export const getIcon = (entity: Entity.Unknown | Entity.Snapshot): internal.IconAnnotation | undefined =>
  internal.getIcon(entity);

/**
 * Set the description of the object.
 * Must be called within an `Obj.update` callback.
 *
 * NOTE: TypeScript's structural typing allows readonly objects to be passed to `Mutable<T>`
 * parameters, so there is no compile-time error. Enforcement is runtime-only.
 */
export const setDescription = (entity: Mutable<Unknown>, description: string): void =>
  internal.setDescription(entity, description);

/**
 * Symbol to set parent when creating objects with `Obj.make`.
 * @example
 * ```ts
 * Obj.make(TestSchema.Person, {
 *   [Obj.Parent]: parentObject,
 *   name: 'John',
 * })
 * ```
 */
export const Parent: unique symbol = internal.ParentId as any;

/**
 * Get the parent of an object.
 * The parent is always loaded together with the object.
 * Only objects are allowed to have a parent
 * @returns The parent object, or undefined if the object has no parent.
 */
export const getParent = (entity: Unknown | Snapshot): Unknown | undefined => {
  assertArgument(isObject(entity) || isSnapshot(entity), 'Expected an object');
  assumeType<internal.InternalObjectProps>(entity);
  return entity[internal.ParentId] as Unknown | undefined;
};

/**
 * Sets the parent of an object.
 * If a parent (or any transitive parent) is deleted, the object will be deleted.
 * Only objects are allowed to have a parent.
 */
export const setParent = (entity: Unknown, parent: Any | undefined) => {
  assertArgument(isObject(entity), 'Expected an object');
  assertArgument(parent === undefined || isObject(parent), 'Expected an object');
  assumeType<internal.InternalObjectProps>(entity);
  assumeType<internal.InternalObjectProps | undefined>(parent);
  entity[internal.ParentId] = parent;
  return entity;
};

interface UpdateFromOptions<T> {
  exclude?: (keyof T)[];
  include?: (keyof T)[];
}

const valuesEqual = (left: unknown, right: unknown): boolean => {
  if (left === right) {
    return true;
  }
  if (left === null || right === null) {
    return left === right;
  }
  if (typeof left !== 'object' || typeof right !== 'object') {
    return Utils.structuralRegion(() => Equal.equals(left, right));
  }
  if (Ref.isRef(left) && Ref.isRef(right)) {
    return left.uri === right.uri;
  }
  if (Ref.isRef(left) || Ref.isRef(right)) {
    return false;
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return false;
    }
    for (let index = 0; index < left.length; index++) {
      if (!valuesEqual(left[index], right[index])) {
        return false;
      }
    }
    return true;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return false;
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const keys = new Set([
    ...Object.keys(leftRecord).filter((key) => key !== 'id'),
    ...Object.keys(rightRecord).filter((key) => key !== 'id'),
  ]);
  for (const key of keys) {
    const leftHas = Object.hasOwn(leftRecord, key);
    const rightHas = Object.hasOwn(rightRecord, key);
    const leftValue = leftHas ? leftRecord[key] : undefined;
    const rightValue = rightHas ? rightRecord[key] : undefined;
    if (!valuesEqual(leftValue, rightValue)) {
      return false;
    }
  }
  return true;
};

/**
 * Breaks reactive proxies on assigned values so echo-db assignment accepts nested structs (same idea as link assignment).
 */
const prepareAssignValue = (value: unknown): unknown =>
  deepMapValues(value, (nested, recurse) => {
    if (nested === null || typeof nested !== 'object') {
      return nested;
    }
    if (Ref.isRef(nested)) {
      return nested;
    }
    if (Array.isArray(nested)) {
      return recurse(nested);
    }
    if (isProxy(nested)) {
      return recurse({ ...getProxyTarget(nested) });
    }
    return recurse(nested);
  });

/**
 * For each key present on `source` (except `id`), assigns `target[key]` when the current value differs.
 * References are compared by target DXN; other values use Effect `Equal.equals` inside a structural region,
 * with recursive comparison for arrays and plain object-shaped property bags (excluding `id`).
 *
 * Must be called within an `Obj.update` callback.
 *
 * @returns Whether any property was updated.
 */
export const updateFrom = <T extends Unknown>(
  target: Mutable<T>,
  source: T,
  options?: UpdateFromOptions<T>,
): boolean => {
  assertArgument(isObject(target), 'Expected an echo object target.');
  assertArgument(isObject(source), 'Expected an echo object source.');
  let keys = Object.keys(source as Record<string, unknown>).filter((key) => key !== 'id');
  if (options?.include !== undefined) {
    const include = new Set(options.include.map((key) => String(key)));
    keys = keys.filter((key) => include.has(key));
  }
  if (options?.exclude !== undefined) {
    const exclude = new Set(options.exclude.map((key) => String(key)));
    keys = keys.filter((key) => !exclude.has(key));
  }
  let updated = false;
  const sourceRecord = source as Record<string, unknown>;
  const targetRecord = target as Record<string, unknown>;
  for (const key of keys) {
    if (!Object.hasOwn(sourceRecord, key)) {
      continue;
    }
    const nextValue = sourceRecord[key];
    const prevValue = Object.hasOwn(targetRecord, key) ? targetRecord[key] : undefined;
    if (valuesEqual(prevValue, nextValue)) {
      continue;
    }
    targetRecord[key] = prepareAssignValue(nextValue) as never;
    updated = true;
  }
  return updated;
};

//
// JSON
//

/**
 * JSON representation of an object.
 */
export type JSON = internal.ObjectJSON;

/**
 * Converts object to its JSON representation.
 * Accepts both reactive objects and snapshots.
 *
 * The same algorithm is used when calling the standard `JSON.stringify(obj)` function.
 */
export const toJSON = (entity: Unknown | Snapshot): JSON => objInternal.objectToJSON(entity);

/**
 * Creates an object from its json representation, performing schema validation.
 * References and schemas will be resolvable if the `refResolver` is provided.
 *
 * The function must be async to support resolving the schema as well as the relation endpoints.
 *
 * @param options.refResolver - Resolver for references. Produces hydrated references that can be resolved.
 * @param options.uri - Override object URI. Changes the result of `Obj.getURI`.
 * @param options.database - Database to associate with the object.
 */
export const fromJSON: (
  json: unknown,
  options?: { refResolver?: Ref.Resolver; uri?: URI.URI; database?: Database.Database; parent?: Unknown },
) => Promise<Unknown> = objInternal.objectFromJSON as any;

/**
 * Comparator function type for sorting objects.
 * Accepts both reactive objects and snapshots.
 */
export type Comparator = internal.Comparator<Unknown | Snapshot>;

export const sortByLabel: Comparator = internal.sortByLabel as Comparator;
export const sortByTypename: Comparator = internal.sortByTypename as Comparator;
export const sort = (...comparators: Comparator[]): Comparator => internal.sort(...comparators) as Comparator;

//
// Version
//

export const VersionTypeId = internal.VersionTypeId;
export type VersionCompareResult = internal.VersionCompareResult;

/**
 * Represent object version.
 * May be backed by Automerge.
 * Objects with no history are not versioned.
 */
export type Version = internal.EntityVersion;

export const isVersion = internal.isVersion;
export const versionValid = internal.versionValid;
export const compareVersions = internal.compareVersions;
export const encodeVersion = internal.encodeVersion;
export const decodeVersion = internal.decodeVersion;

/**
 * Returns the version of the object.
 * Accepts both reactive objects and snapshots.
 */
export const version = (entity: Unknown | Snapshot): Version => internal.version(entity);

//
// Atoms
//

/**
 * Create a reactive snapshot atom for an ECHO object or ref.
 * Use inside atom computations (e.g. `Atom.make((get) => get(Obj.atom(ref)))`) to subscribe
 * to a ref's target — the atom re-fires when the target loads or changes.
 *
 * @idiom org.dxos.echo.objAtomReactive
 *   applies: Subscribing to a ref's target inside an atom computation or a non-React reactive context
 *   instead-of: `ref.target` — synchronous and not reactive; returns `undefined` when the target isn't loaded yet and never notifies when it becomes available
 *   uses: {@link atom}
 *   related: org.dxos.echo-react.useObjectReactive
 */
export const atom = objInternal.makeAtom;
export const atomReactive = objInternal.makeWithReactive;
export const atomProperty = objInternal.makeProperty;
export const labelAtom = objInternal.makeLabelAtom;
export const labelProperty = internal.getLabelProperty;

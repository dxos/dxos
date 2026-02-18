//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import type { ForeignKey } from '@dxos/echo-protocol';
import { createJsonPath, getValue as getValue$ } from '@dxos/effect';
import { assertArgument } from '@dxos/invariant';
import { type DXN, ObjectId } from '@dxos/keys';
import { assumeType } from '@dxos/util';

import type * as Database from './Database';
import * as Entity from './Entity';
import * as Err from './Err';
import {
  type ObjectJSON as APIJSON,
  type AnyEntity,
  type AnyProperties,
  type Comparator as ApiComparator,
  type Meta as ApiMeta,
  type ReadonlyMeta as ApiReadonlyMeta,
  type EntityVersion as ApiVersion,
  type ChangeCallback,
  type InternalObjectProps,
  type KindId,
  MetaId,
  type Mutable,
  type ObjectMeta,
  // TODO(dmaretskyi): Export ParentId?
  ParentId,
  SnapshotKindId,
  type VersionCompareResult,
  VersionTypeId,
  addTag as addTag$,
  change as change$,
  clone as clone$,
  compareVersions,
  decodeVersion,
  deleteKeys as deleteKeys$,
  encodeVersion,
  getDXN as getDXN$,
  getDatabase as getDatabase$,
  getDescription as getDescription$,
  getKeys as getKeys$,
  getLabel as getLabel$,
  getMetaChecked as getMeta$,
  getSchema as getSchema$,
  getSnapshot as getSnapshot$,
  getTypeAnnotation,
  getTypeDXN as getTypeDXN$,
  getTypename as getTypename$,
  isDeleted as isDeleted$,
  isInstanceOf,
  isVersion,
  makeObject,
  objectFromJSON,
  removeTag as removeTag$,
  setDescription as setDescription$,
  setLabel as setLabel$,
  setValue as setValue$,
  sort as sort$,
  sortByLabel as sortByLabel$,
  sortByTypename as sortByTypename$,
  subscribe as subscribe$,
  objectToJSON as toJSON$,
  version as version$,
  versionValid,
} from './internal';
import type * as Ref from './Ref';
import type * as Type from './Type';

/**
 * Base type for all ECHO objects.
 */
interface BaseObj extends AnyEntity, Entity.OfKind<typeof Entity.Kind.Object> {}

/**
 * Object type with specific properties.
 */
export type Obj<Props> = BaseObj & Props;

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
 * Object with arbitrary properties.
 *
 * NOTE: Due to how TypeScript works, this type is not assignable to a specific schema type.
 * In that case, use `Obj.instanceOf` to check if an object is of a specific type.
 *
 * Prefer using `Obj.Unknown` when you don't need to access arbitrary properties.
 */
export interface Any extends BaseObj, AnyProperties {}

/**
 * Base type for snapshot objects (has SnapshotKindId instead of KindId).
 */
interface BaseSnapshot extends AnyEntity {
  readonly [SnapshotKindId]: typeof Entity.Kind.Object;
  readonly id: ObjectId;
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
export type Snapshot<T extends Unknown = Unknown> = Omit<T, KindId> & BaseSnapshot;

const defaultMeta: ObjectMeta = {
  keys: [],
};

type Props<T = any> = {
  id?: ObjectId;
  [Meta]?: Partial<ObjectMeta>;
} & Type.Properties<T>;

// TODO(burdon): Should we allow the caller to set the id?
/**
 * Props type for object creation with a given schema.
 */
export type MakeProps<S extends Schema.Schema.AnyNoContext> = {
  id?: ObjectId;
  [Meta]?: Partial<ObjectMeta>;
  [Parent]?: Unknown;
} & NoInfer<Props<Schema.Schema.Type<S>>>;

/**
 * Creates a new echo object of the given schema.
 * @param schema - Object schema.
 * @param props - Object properties.
 * @param meta - Object metadata (deprecated) -- pass with Obj.Meta.
 *
 * Meta can be passed as a symbol in `props`.
 *
 * Example:
 * ```ts
 * const obj = Obj.make(Person, { [Obj.Meta]: { keys: [...] }, name: 'John' });
 * ```
 *
 * Note: Only accepts object schemas, not relation schemas. Use `Relation.make` for relations.
 */
export const make: {
  <S extends Type.Obj.Any>(schema: S, props: MakeProps<S>): Obj<Schema.Schema.Type<S>>;
  /**
   * @deprecated Pass meta as in the example: `Obj.make(Person, { [Obj.Meta]: { keys: [...] }, name: 'John' })`.
   */
  <S extends Type.Obj.Any>(schema: S, props: MakeProps<S>, meta: Partial<ObjectMeta>): Obj<Schema.Schema.Type<S>>;
} = <S extends Type.Obj.Any>(
  schema: S,
  props: MakeProps<S>,
  meta?: Partial<ObjectMeta>,
): Obj<Schema.Schema.Type<S>> => {
  assertArgument(getTypeAnnotation(schema)?.kind === Entity.Kind.Object, 'schema', 'Expected an object schema');

  // Set default fields on meta on creation.
  if (props[MetaId] != null) {
    meta = { ...structuredClone(defaultMeta), ...props[MetaId] };
    delete props[MetaId];
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

  return makeObject<Schema.Schema.Type<S>>(schema, filterUndefined as any, {
    ...defaultMeta,
    ...meta,
  });
};

/**
 * Determine if object is an ECHO object.
 */
export const isObject = (obj: unknown): obj is Unknown => {
  assumeType<InternalObjectProps>(obj);
  return typeof obj === 'object' && obj !== null && obj[Entity.KindId] === Entity.Kind.Object;
};

/**
 * Subscribe to object updates.
 * The callback is called synchronously when the object is modified.
 * Only accepts reactive objects (not snapshots).
 * @returns Unsubscribe function.
 */
export const subscribe = (obj: Unknown, callback: () => void): (() => void) => {
  return subscribe$(obj, callback);
};

//
// Snapshot
//

/**
 * Returns an immutable snapshot of an object.
 * The snapshot is branded with SnapshotKindId instead of KindId,
 * making it distinguishable from the reactive object at the type level.
 */
export const getSnapshot: <T extends Unknown>(obj: T) => Snapshot<T> = getSnapshot$ as any;

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
    const db = getDatabase$(snapshot);
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

export type CloneOptions = {
  /**
   * Retain the original object's ID.
   * @default false
   */
  retainId?: boolean;

  /**
   * Recursively clone referenced objects.
   * @default false
   */
  deep?: boolean;
};

/**
 * Clones an object or relation.
 * This does not clone referenced objects, only the properties in the object.
 * @returns A new object with the same schema and properties.
 */
export const clone: <T extends Unknown>(obj: T, opts?: CloneOptions) => T = clone$;

//
// Change
//

/**
 * Makes all properties mutable recursively.
 * Used to provide a mutable view of an object within `Obj.change`.
 */
export type { Mutable };

/**
 * Perform mutations on an echo object within a controlled context.
 *
 * All mutations within the callback are batched and trigger a single notification
 * when the callback completes. Direct mutations outside of `Obj.change` will throw
 * an error for echo objects.
 *
 * This function also works with nested objects within echo objects (e.g., Template structs)
 * that are reactive at runtime.
 *
 * @param obj - The echo object to mutate. Use `Relation.change` for relations.
 * @param callback - The callback that performs mutations on the object.
 *
 * @example
 * ```ts
 * const person = Obj.make(Person, { name: 'John', age: 25 });
 *
 * // Mutate within Obj.change
 * Obj.change(person, (p) => {
 *   p.name = 'Jane';
 *   p.age = 30;
 * });
 * // ONE notification fires here
 *
 * // Direct mutation throws
 * person.name = 'Bob'; // Error: Cannot modify outside Obj.change()
 * ```
 *
 * Note: Only accepts objects. Use `Relation.change` for relations.
 */
export const change = <T extends Unknown>(obj: T, callback: ChangeCallback<T>): void => {
  change$(obj, callback);
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
  return getValue$(obj, createJsonPath(path));
};

/**
 * Set a deeply nested property on an object, using the object's schema to determine
 * whether to initialize nested data as an empty object or array.
 *
 * Similar to lodash.set and setDeep from @dxos/util, but schema-aware.
 * Must be called within an `Obj.change` callback.
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
 * Obj.change(person, (p) => {
 *   Obj.setValue(p, ['addresses', 0, 'street'], '123 Main St');
 * });
 * // Creates: person.addresses = [{ street: '123 Main St' }]
 * ```
 */
// TODO(wittjosiah): Compute possible path values + type value based on generic object type.
export const setValue: (obj: Mutable<Unknown>, path: readonly (string | number)[], value: any) => void =
  setValue$ as any;

//
// Type
//

// TODO(burdon): To discuss: prefer over ObjectId or Key.ObjectId or Type.ID?
export const ID = ObjectId;
export type ID = ObjectId;

/**
 * Test if object or relation is an instance of a schema.
 * @example
 * ```ts
 * const john = Obj.make(Person, { name: 'John' });
 * const isPerson = Obj.instanceOf(Person);
 * if (isPerson(john)) {
 *   // john is Person
 * }
 * ```
 */
export const instanceOf: {
  <S extends Type.Entity.Any>(schema: S): (value: unknown) => value is Schema.Schema.Type<S>;
  <S extends Type.Entity.Any>(schema: S, value: unknown): value is Schema.Schema.Type<S>;
} = ((...args: [schema: Type.Entity.Any, value: unknown] | [schema: Type.Entity.Any]) => {
  if (args.length === 1) {
    return (entity: unknown) => isInstanceOf(args[0], entity);
  }

  return isInstanceOf(args[0], args[1]);
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
  <S extends Type.Entity.Any>(schema: S): (value: unknown) => value is Snapshot<Schema.Schema.Type<S>>;
  <S extends Type.Entity.Any>(schema: S, value: unknown): value is Snapshot<Schema.Schema.Type<S>>;
} = ((...args: [schema: Type.Entity.Any, value: unknown] | [schema: Type.Entity.Any]) => {
  const check = (entity: unknown) =>
    entity != null && typeof entity === 'object' && SnapshotKindId in entity && isInstanceOf(args[0], entity);

  if (args.length === 1) {
    return (entity: unknown) => check(entity);
  }

  return check(args[1]);
}) as any;

// TODO(dmaretskyi): Allow returning undefined.
/**
 * Get the DXN of the object.
 * Accepts both reactive objects and snapshots.
 */
export const getDXN = (entity: Unknown | Snapshot): DXN => {
  assertArgument(!Schema.isSchema(entity), 'obj', 'Object should not be a schema.');
  return getDXN$(entity);
};

/**
 * @returns The DXN of the object's type.
 * @example dxn:example.com/type/Person:1.0.0
 */
// TODO(wittjosiah): Narrow types.
export const getTypeDXN: (obj: unknown | undefined) => DXN | undefined = getTypeDXN$ as any;

/**
 * Get the schema of the object.
 * Returns the branded ECHO schema used to create the object.
 */
// TODO(wittjosiah): Narrow types.
export const getSchema: (obj: unknown | undefined) => Type.Entity.Any | undefined = getSchema$ as any;

/**
 * @returns The typename of the object's type.
 * Accepts both reactive objects and snapshots.
 * @example `example.com/type/Person`
 */
export const getTypename = (entity: Unknown | Snapshot): string | undefined => getTypename$(entity);

//
// Database
//

/**
 * Get the database the object belongs to.
 * Accepts both reactive objects and snapshots.
 */
export const getDatabase = (entity: Entity.Unknown | Entity.Snapshot): Database.Database | undefined =>
  getDatabase$(entity);

//
// Meta
//

export const Meta: unique symbol = MetaId as any;

/**
 * Deeply read-only version of ObjectMeta.
 * Prevents mutation at all nesting levels (e.g., `meta.keys.push()` is a TypeScript error).
 */
export type ReadonlyMeta = ApiReadonlyMeta;

/**
 * Mutable meta type returned by `Obj.getMeta` inside an `Obj.change` callback.
 */
export type Meta = ApiMeta;

// TODO(burdon): Narrow type.
// TODO(dmaretskyi): Allow returning undefined.
/**
 * Get the metadata for an object.
 * Returns mutable meta when passed a mutable object (inside `Obj.change` callback).
 * Returns read-only meta when passed a regular object or snapshot.
 *
 * @example
 * ```ts
 * // Read-only access outside change callback
 * const meta = Obj.getMeta(person);  // ReadonlyMeta
 *
 * // Mutable access inside change callback
 * Obj.change(person, (p) => {
 *   const meta = Obj.getMeta(p);     // ObjectMeta (mutable)
 *   meta.tags ??= [];
 *   meta.tags.push('important');
 * });
 * ```
 */
// TODO(wittjosiah): When passed a Snapshot, should return a snapshot of meta, not the live meta proxy.
export function getMeta(entity: Mutable<Unknown>): Meta;
export function getMeta(entity: Unknown | Snapshot): ReadonlyMeta;
export function getMeta(entity: Unknown | Snapshot | Mutable<Unknown>): Meta | ReadonlyMeta {
  return getMeta$(entity);
}

/**
 * @returns Foreign keys for the object from the specified source.
 * Accepts both reactive objects and snapshots.
 */
export const getKeys: {
  (entity: Unknown | Snapshot, source: string): ForeignKey[];
  (source: string): (entity: Unknown | Snapshot) => ForeignKey[];
} = Function.dual(2, (entity: Unknown | Snapshot, source?: string): ForeignKey[] => getKeys$(entity, source!));

/**
 * Delete all keys from the object for the specified source.
 * Must be called within an `Obj.change` callback.
 *
 * NOTE: TypeScript's structural typing allows readonly objects to be passed to `Mutable<T>`
 * parameters, so there is no compile-time error. Enforcement is runtime-only.
 */
export const deleteKeys = (entity: Mutable<Unknown>, source: string): void => deleteKeys$(entity, source);

/**
 * Add a tag to the object.
 * Must be called within an `Obj.change` callback.
 *
 * NOTE: TypeScript's structural typing allows readonly objects to be passed to `Mutable<T>`
 * parameters, so there is no compile-time error. Enforcement is runtime-only.
 */
export const addTag = (entity: Mutable<Unknown>, tag: string): void => addTag$(entity, tag);

/**
 * Remove a tag from the object.
 * Must be called within an `Obj.change` callback.
 *
 * NOTE: TypeScript's structural typing allows readonly objects to be passed to `Mutable<T>`
 * parameters, so there is no compile-time error. Enforcement is runtime-only.
 */
export const removeTag = (entity: Mutable<Unknown>, tag: string): void => removeTag$(entity, tag);

/**
 * Check if the object is deleted.
 * Accepts both reactive objects and snapshots.
 */
// TODO(dmaretskyi): Default to `false`.
export const isDeleted = (entity: Unknown | Snapshot): boolean => isDeleted$(entity);

//
// Annotations
//

/**
 * Get the label of the object.
 * Accepts both reactive objects and snapshots.
 */
export const getLabel = (entity: Unknown | Snapshot): string | undefined => getLabel$(entity);

/**
 * Set the label of the object.
 * Must be called within an `Obj.change` callback.
 *
 * NOTE: TypeScript's structural typing allows readonly objects to be passed to `Mutable<T>`
 * parameters, so there is no compile-time error. Enforcement is runtime-only.
 */
export const setLabel = (entity: Mutable<Unknown>, label: string): void => setLabel$(entity, label);

/**
 * Get the description of the object.
 * Accepts both reactive objects and snapshots.
 */
export const getDescription = (entity: Unknown | Snapshot): string | undefined => getDescription$(entity);

/**
 * Set the description of the object.
 * Must be called within an `Obj.change` callback.
 *
 * NOTE: TypeScript's structural typing allows readonly objects to be passed to `Mutable<T>`
 * parameters, so there is no compile-time error. Enforcement is runtime-only.
 */
export const setDescription = (entity: Mutable<Unknown>, description: string): void =>
  setDescription$(entity, description);

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
export const Parent: unique symbol = ParentId as any;

/**
 * Get the parent of an object.
 * The parent is always loaded together with the object.
 * Only objects are allowed to have a parent
 * @returns The parent object, or undefined if the object has no parent.
 */
export const getParent = (entity: Unknown | Snapshot): Unknown | undefined => {
  assertArgument(isObject(entity), 'Expected an object');
  assumeType<InternalObjectProps>(entity);
  return entity[ParentId] as Unknown | undefined;
};

/**
 * Sets the parent of an object.
 * If a parent (or any transitive parent) is deleted, the object will be deleted.
 * Only objects are allowed to have a parent.
 */
export const setParent = (entity: Unknown, parent: Any | undefined) => {
  assertArgument(isObject(entity), 'Expected an object');
  assertArgument(parent === undefined || isObject(parent), 'Expected an object');
  assumeType<InternalObjectProps>(entity);
  assumeType<InternalObjectProps | undefined>(parent);
  entity[ParentId] = parent;
};

//
// JSON
//

/**
 * JSON representation of an object.
 */
export type JSON = APIJSON;

/**
 * Converts object to its JSON representation.
 * Accepts both reactive objects and snapshots.
 *
 * The same algorithm is used when calling the standard `JSON.stringify(obj)` function.
 */
export const toJSON = (entity: Unknown | Snapshot): JSON => toJSON$(entity);

/**
 * Creates an object from its json representation, performing schema validation.
 * References and schemas will be resolvable if the `refResolver` is provided.
 *
 * The function must be async to support resolving the schema as well as the relation endpoints.
 *
 * @param options.refResolver - Resolver for references. Produces hydrated references that can be resolved.
 * @param options.dxn - Override object DXN. Changes the result of `Obj.getDXN`.
 */
export const fromJSON: (json: unknown, options?: { refResolver?: Ref.Resolver; dxn?: DXN }) => Promise<Unknown> =
  objectFromJSON as any;

/**
 * Comparator function type for sorting objects.
 * Accepts both reactive objects and snapshots.
 */
export type Comparator = ApiComparator<Unknown | Snapshot>;

export const sortByLabel: Comparator = sortByLabel$ as Comparator;
export const sortByTypename: Comparator = sortByTypename$ as Comparator;
export const sort = (...comparators: Comparator[]): Comparator => sort$(...comparators) as Comparator;

//
// Version
//

export { VersionTypeId };
export type { VersionCompareResult };

/**
 * Represent object version.
 * May be backed by Automerge.
 * Objects with no history are not versioned.
 */
export type Version = ApiVersion;

export { isVersion, versionValid, compareVersions, encodeVersion, decodeVersion };

/**
 * Returns the version of the object.
 * Accepts both reactive objects and snapshots.
 */
export const version = (entity: Unknown | Snapshot): Version => version$(entity);

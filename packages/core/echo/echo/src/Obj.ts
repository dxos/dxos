//
// Copyright 2025 DXOS.org
//

import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';

import { type ForeignKey } from '@dxos/echo-protocol';
import { createJsonPath, getValue as getValue$ } from '@dxos/effect';
import { assertArgument, invariant } from '@dxos/invariant';
import { type DXN, ObjectId } from '@dxos/keys';
import { type DeepReadonly, assumeType, deepMapValues } from '@dxos/util';

import type * as Database from './Database';
import * as Entity from './Entity';
import {
  type AnyEntity,
  type AnyProperties,
  type ChangeCallback,
  type InternalObjectProps,
  MetaId,
  type Mutable,
  ObjectDatabaseId,
  type ObjectJSON,
  type ObjectMeta,
  ObjectVersionId,
  VersionTypeId,
  change as change$,
  getDescription as getDescription$,
  getLabel as getLabel$,
  getMeta as getMeta$,
  getObjectDXN,
  getSchema as getSchema$,
  getSchemaTypename,
  getSnapshot as getSnapshot$,
  getTypeAnnotation,
  getTypeDXN as getTypeDXN$,
  isDeleted as isDeleted$,
  isInstanceOf,
  makeObject,
  objectFromJSON,
  objectToJSON,
  setDescription as setDescription$,
  setLabel as setLabel$,
  setValue as setValue$,
  subscribe as subscribe$,
} from './internal';
import * as Ref from './Ref';
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

  // Filter undefined values.
  const filterUndefined = Object.fromEntries(Object.entries(props).filter(([_, v]) => v !== undefined));

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
 * @returns Unsubscribe function.
 */
export const subscribe = (obj: Entity.Unknown, callback: () => void): (() => void) => {
  return subscribe$(obj, callback);
};

//
// Snapshot
//

/**
 * Returns an immutable snapshot of an object.
 */
export const getSnapshot: <T extends Unknown>(obj: T) => T = getSnapshot$;

export type CloneOptions = {
  /**
   * Retain the original object's ID.
   * @default false
   */
  retainId?: boolean;
};

/**
 * Clones an object or relation.
 * This does not clone referenced objects, only the properties in the object.
 * @returns A new object with the same schema and properties.
 */
export const clone = <T extends Unknown>(obj: T, opts?: CloneOptions): T => {
  const { id, ...data } = obj;
  const schema = getSchema$(obj);
  invariant(schema != null, 'Object should have a schema');
  const props: any = deepMapValues(data, (value, recurse) => {
    if (Ref.isRef(value)) {
      return value;
    }
    return recurse(value);
  });

  if (opts?.retainId) {
    props.id = id;
  }
  const meta = getMeta(obj);
  props[MetaId] = deepMapValues(meta, (value, recurse) => {
    if (Ref.isRef(value)) {
      return value;
    }
    return recurse(value);
  });

  return make(schema as Type.Obj.Any, props);
};

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
export const getValue = (obj: Entity.Unknown, path: readonly (string | number)[]): any => {
  return getValue$(obj, createJsonPath(path));
};

/**
 * Set a deeply nested property on an object, using the object's schema to determine
 * whether to initialize nested data as an empty object or array.
 *
 * Similar to lodash.set and setDeep from @dxos/util, but schema-aware.
 *
 * @param obj - The ECHO object to set the property on.
 * @param path - Path to the property (array of keys).
 * @param value - Value to set.
 * @returns The value that was set.
 *
 * @example
 * ```ts
 * const person = Obj.make(Person, { name: 'John' });
 * // Person schema has: addresses: Schema.mutable(Schema.Array(Address))
 * Obj.setValue(person, ['addresses', 0, 'street'], '123 Main St');
 * // Creates: person.addresses = [{ street: '123 Main St' }]
 * ```
 */
// TODO(wittjosiah): Compute possible path values + type value based on generic object type.
export const setValue: (obj: Entity.Unknown, path: readonly (string | number)[], value: any) => void = setValue$ as any;

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

// TODO(dmaretskyi): Allow returning undefined.
export const getDXN = (entity: Entity.Unknown): DXN => {
  assertArgument(!Schema.isSchema(entity), 'obj', 'Object should not be a schema.');
  const dxn = getObjectDXN(entity);
  invariant(dxn != null, 'Invalid object.');
  return dxn;
};

/**
 * @returns The DXN of the object's type.
 * @example dxn:example.com/type/Person:1.0.0
 */
// TODO(burdon): Must define and return type for expando.
export const getTypeDXN = getTypeDXN$;

/**
 * Get the schema of the object.
 * Returns the branded ECHO schema used to create the object.
 */
export const getSchema: (obj: unknown | undefined) => Type.Entity.Any | undefined = getSchema$ as any;

/**
 * @returns The typename of the object's type.
 * @example `example.com/type/Person`
 */
export const getTypename = (entity: Entity.Unknown): string | undefined => {
  const schema = getSchema$(entity);
  if (schema == null) {
    // Try to extract typename from DXN.
    return getTypeDXN$(entity)?.asTypeDXN()?.type;
  }

  return getSchemaTypename(schema);
};

//
// Database
//

/**
 * Get the database the object belongs to.
 */
export const getDatabase = (entity: Entity.Unknown): Database.Database | undefined => {
  assumeType<InternalObjectProps>(entity);
  return entity[ObjectDatabaseId];
};

//
// Meta
//

export const Meta: unique symbol = MetaId as any;

/**
 * Deeply read-only version of ObjectMeta.
 * Prevents mutation at all nesting levels (e.g., `meta.keys.push()` is a TypeScript error).
 */
export type ReadonlyMeta = DeepReadonly<ObjectMeta>;

/**
 * Mutable meta type received in the `Obj.changeMeta()` callback.
 */
export type Meta = ObjectMeta;

// TODO(burdon): Narrow type.
// TODO(dmaretskyi): Allow returning undefined.
/**
 * Get the metadata for an entity.
 * Returns a read-only view of the metadata.
 * Use `Obj.changeMeta` to mutate metadata.
 */
export const getMeta = (entity: AnyProperties): ReadonlyMeta => {
  assertArgument(entity, 'entity', 'Should be an object.');
  const meta = getMeta$(entity);
  invariant(meta != null, 'Invalid object.');
  return meta;
};

/**
 * Perform mutations on an entity's metadata within a controlled context.
 *
 * @param entity - The entity whose metadata to mutate.
 * @param callback - The callback that performs mutations on the metadata.
 *
 * @example
 * ```ts
 * Obj.changeMeta(person, (meta) => {
 *   meta.keys.push({ source: 'external', id: '123' });
 * });
 * ```
 */
export const changeMeta = (entity: Entity.Unknown, callback: (meta: ObjectMeta) => void): void => {
  assertArgument(entity, 'entity', 'Should be an object.');
  const meta = getMeta$(entity);
  invariant(meta != null, 'Invalid object.');
  change$(entity, () => {
    callback(meta);
  });
};

/**
 * @returns Foreign keys for the object from the specified source.
 */
export const getKeys: {
  (entity: Entity.Unknown, source: string): ForeignKey[];
  (source: string): (entity: Entity.Unknown) => ForeignKey[];
} = Function.dual(2, (entity: Entity.Unknown, source?: string): ForeignKey[] => {
  assertArgument(entity, 'entity', 'Should be an object.');
  const meta = getMeta(entity);
  invariant(meta != null, 'Invalid object.');
  return meta.keys.filter((key) => key.source === source);
});

/**
 * Delete all keys from the object for the specified source.
 * @param entity
 * @param source
 */
export const deleteKeys = (entity: Entity.Unknown, source: string) => {
  changeMeta(entity, (meta) => {
    for (let i = 0; i < meta.keys.length; i++) {
      if (meta.keys[i].source === source) {
        meta.keys.splice(i, 1);
        i--;
      }
    }
  });
};

export const addTag = (entity: Entity.Unknown, tag: string) => {
  changeMeta(entity, (meta) => {
    meta.tags ??= [];
    meta.tags.push(tag);
  });
};

export const removeTag = (entity: Entity.Unknown, tag: string) => {
  changeMeta(entity, (meta) => {
    if (!meta.tags) {
      return;
    }
    for (let i = 0; i < meta.tags.length; i++) {
      if (meta.tags[i] === tag) {
        meta.tags.splice(i, 1);
        i--;
      }
    }
  });
};

// TODO(dmaretskyi): Default to `false`.
export const isDeleted = (entity: Entity.Unknown): boolean => {
  const deleted = isDeleted$(entity);
  invariant(typeof deleted === 'boolean', 'Invalid object.');
  return deleted;
};

//
// Annotations
//

export const getLabel = (entity: Entity.Unknown): string | undefined => {
  const schema = getSchema$(entity);
  if (schema != null) {
    return getLabel$(schema, entity);
  }
};

export const setLabel = (entity: Entity.Unknown, label: string) => {
  const schema = getSchema$(entity);
  if (schema != null) {
    setLabel$(schema, entity, label);
  }
};

export const getDescription = (entity: Entity.Unknown): string | undefined => {
  const schema = getSchema$(entity);
  if (schema != null) {
    return getDescription$(schema, entity);
  }
};

export const setDescription = (entity: Entity.Unknown, description: string) => {
  const schema = getSchema$(entity);
  if (schema != null) {
    setDescription$(schema, entity, description);
  }
};

//
// JSON
//

/**
 * JSON representation of an object.
 */
export type JSON = ObjectJSON;

/**
 * Converts object to its JSON representation.
 *
 * The same algorithm is used when calling the standard `JSON.stringify(obj)` function.
 */
export const toJSON = (entity: Entity.Unknown): JSON => objectToJSON(entity);

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

//
// Sorting
//

const compare = (a?: string, b?: string) => {
  if (a == null) {
    return b == null ? 0 : 1;
  }

  if (b == null) {
    return -1;
  }

  return a.localeCompare(b);
};

export type Comparator = (a: Entity.Unknown, b: Entity.Unknown) => number;

export const sortByLabel: Comparator = (a: Entity.Unknown, b: Entity.Unknown) => compare(getLabel(a), getLabel(b));
export const sortByTypename: Comparator = (a: Entity.Unknown, b: Entity.Unknown) =>
  compare(getTypename(a), getTypename(b));
export const sort = (...comparators: Comparator[]): Comparator => {
  return (a: Entity.Unknown, b: Entity.Unknown) => {
    for (const comparator of comparators) {
      const result = comparator(a, b);
      if (result !== 0) {
        return result;
      }
    }

    return 0;
  };
};

//
// Version
//

/**
 * Unique symbol for version type identification.
 */
export { VersionTypeId };

/**
 * Represent object version.
 * May be backed by Automerge.
 * Objects with no history are not versioned.
 */
export interface Version {
  [VersionTypeId]: {};

  /**
   * Whether the object is versioned.
   */
  versioned: boolean;

  /**
   * Automerge heads.
   */
  automergeHeads?: string[];
}

const unversioned: Version = {
  [VersionTypeId]: {},
  versioned: false,
};

/**
 * Checks that `obj` is a version object.
 */
export const isVersion = (entity: unknown): entity is Version => {
  return entity != null && typeof entity === 'object' && VersionTypeId in entity;
};

/**
 * Returns the version of the object.
 */
export const version = (entity: Entity.Unknown): Version => {
  const version = (entity as any)[ObjectVersionId];
  if (version === undefined) {
    return unversioned;
  }

  return version;
};

/**
 * Checks that `version` is a valid version object.
 */
export const versionValid = (version: Version): boolean => {
  assertArgument(isVersion(version), 'version', 'Invalid version object');
  return !!version.versioned;
};

export type VersionCompareResult = 'unversioned' | 'equal' | 'different';

/**
 * Compares two versions.
 * @param version1
 * @param version2
 * @returns 'unversioned' if either object is unversioned, 'equal' if the versions are equal, 'different' if the versions are different.
 */
export const compareVersions = (version1: Version, version2: Version): VersionCompareResult => {
  assertArgument(isVersion(version1), 'version1', 'Invalid version object');
  assertArgument(isVersion(version2), 'version2', 'Invalid version object');

  if (!versionValid(version1) || !versionValid(version2)) {
    return 'unversioned';
  }

  if (version1.automergeHeads?.length !== version2.automergeHeads?.length) {
    return 'different';
  }
  if (version1.automergeHeads?.some((head) => !version2.automergeHeads?.includes(head))) {
    return 'different';
  }

  return 'equal';
};

export const encodeVersion = (version: Version): string => {
  return JSON.stringify(version);
};

export const decodeVersion = (version: string): Version => {
  const parsed = JSON.parse(version);
  parsed[VersionTypeId] = {};
  return parsed;
};

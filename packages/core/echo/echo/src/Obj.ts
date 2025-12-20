//
// Copyright 2025 DXOS.org
//

import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';

import { type ForeignKey } from '@dxos/echo-protocol';
import { createJsonPath, getValue as getValue$ } from '@dxos/effect';
import { assertArgument, invariant } from '@dxos/invariant';
import { type DXN, ObjectId } from '@dxos/keys';
import { getSnapshot as getSnapshot$ } from '@dxos/live-object';
import { assumeType, deepMapValues } from '@dxos/util';

import type * as Database from './Database';
import * as Entity from './Entity';
import {
  type AnyEchoObject,
  type AnyProperties,
  type InternalObjectProps,
  MetaId,
  ObjectDatabaseId,
  type ObjectJSON,
  type ObjectMeta,
  ObjectVersionId,
  VersionTypeId,
  getDescription as getDescription$,
  getLabel as getLabel$,
  getMeta as getMeta$,
  getObjectDXN,
  getSchema as getSchema$,
  getSchemaTypename,
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
} from './internal';
import * as Ref from './Ref';
import * as Type from './Type';

/**
 * Base type for all ECHO objects.
 * @private
 */
interface BaseObj extends AnyEchoObject, Entity.OfKind<typeof Entity.Kind.Object> {}

/**
 * Base type for all Obj objects.
 */
export interface Any extends BaseObj {}

export const Any = Schema.Struct({}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Any',
    version: '0.1.0',
  }),
);

/**
 * Object type with specific properties.
 */
export type Obj<Props> = BaseObj & Props;

/**
 * Object with arbitrary properties.
 *
 * NOTE: Due to how typescript works, this type is not assignable to a specific schema type.
 * In that case, use `Obj.instanceOf` to check if an object is of a specific type.
 */
export interface AnyProps extends BaseObj, AnyProperties {}

const defaultMeta: ObjectMeta = {
  keys: [],
};

type Props<T = any> = {
  id?: ObjectId;
  [Meta]?: Partial<ObjectMeta>;
} & Type.Properties<T>;

// TODO(burdon): Should we allow the caller to set the id?
export type MakeProps<T extends Schema.Schema.AnyNoContext> = {
  id?: ObjectId;
  [Meta]?: Partial<ObjectMeta>;
} & NoInfer<Props<Schema.Schema.Type<T>>>;

/**
 * Creates a new object of the given types.
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
 */
export const make = <S extends Schema.Schema.AnyNoContext>(
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
export const isObject = (obj: unknown): obj is Any => {
  assumeType<InternalObjectProps>(obj);
  return typeof obj === 'object' && obj !== null && obj[Entity.KindId] === Entity.Kind.Object;
};

//
// Snapshot
//

/**
 * Returns an immutable snapshot of an object.
 */
export const getSnapshot: <T extends Any>(obj: Obj<T>) => T = getSnapshot$;

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
export const clone = <T extends Any>(obj: T, opts?: CloneOptions): T => {
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
 */
export const getSchema = getSchema$;

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

// TODO(burdon): Narrow type.
// TODO(dmaretskyi): Allow returning undefined.
export const getMeta = (entity: AnyProperties): ObjectMeta => {
  const meta = getMeta$(entity);
  invariant(meta != null, 'Invalid object.');
  return meta;
};

/**
 * @returns Foreign keys for the object from the specified source.
 */
export const getKeys: {
  (entity: Entity.Unknown, source: string): ForeignKey[];
  (source: string): (entity: Entity.Unknown) => ForeignKey[];
} = Function.dual(2, (entity: Entity.Unknown, source?: string): ForeignKey[] => {
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
  const meta = getMeta(entity);
  for (let i = 0; i < meta.keys.length; i++) {
    if (meta.keys[i].source === source) {
      meta.keys.splice(i, 1);
      i--;
    }
  }
};

export const addTag = (entity: Entity.Unknown, tag: string) => {
  const meta = getMeta(entity);
  meta.tags ??= [];
  meta.tags.push(tag);
};

export const removeTag = (entity: Entity.Unknown, tag: string) => {
  const meta = getMeta(entity);
  if (!meta.tags) {
    return;
  }
  for (let i = 0; i < meta.tags.length; i++) {
    if (meta.tags[i] === tag) {
      meta.tags.splice(i, 1);
      i--;
    }
  }
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
export const fromJSON: (json: unknown, options?: { refResolver?: Ref.Resolver; dxn?: DXN }) => Promise<Any> =
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

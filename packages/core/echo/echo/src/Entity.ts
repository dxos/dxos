//
// Copyright 2025 DXOS.org
//

import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';

import { type ForeignKey } from '@dxos/echo-protocol';
import { assertArgument, invariant } from '@dxos/invariant';
import { type DXN } from '@dxos/keys';

import {
  MetaId,
  type ObjectJSON,
  type ObjectMeta,
  ObjectVersionId,
  type VersionType,
  VersionTypeId,
  getDescription as getDescription$,
  getLabel as getLabel$,
  getObjectDXN,
  getSchema,
  getSchemaTypename,
  getTypeDXN as getTypeDXN$,
  isInstanceOf,
  objectFromJSON,
  objectToJSON,
  setDescription as setDescription$,
  setLabel as setLabel$,
} from './internal';
import type * as Obj from './Obj';
import type * as Ref from './Ref';
import type * as Relation from './Relation';
import type * as Type from './Type';

export { getSchema, type VersionType, VersionTypeId };

/**
 * Base type for Obj and Relation.
 * NOTE: For naming purposes, entity values are sometimes referred to as objects; this doesn't imply Obj vs. Relation.
 */
export type Any = Obj.Any | Relation.Any;

//
// Type
//

/**
 * Test if object or relation is an instance of a schema.
 * @example
 * ```ts
 * const john = Obj.make(Person, { name: 'John' });
 * const johnIsPerson = Obj.instanceOf(Person)(john);
 *
 * const isPerson = Obj.instanceOf(Person);
 * if (isPerson(john)) {
 *   // john is Person
 * }
 * ```
 */
export const instanceOf: {
  <S extends Type.Relation.Any | Type.Obj.Any>(schema: S): (value: unknown) => value is Schema.Schema.Type<S>;
  <S extends Type.Relation.Any | Type.Obj.Any>(schema: S, value: unknown): value is Schema.Schema.Type<S>;
} = ((
  ...args: [schema: Type.Relation.Any | Type.Obj.Any, value: unknown] | [schema: Type.Relation.Any | Type.Obj.Any]
) => {
  if (args.length === 1) {
    return (obj: unknown) => isInstanceOf(args[0], obj);
  }

  return isInstanceOf(args[0], args[1]);
}) as any;

// TODO(dmaretskyi): Allow returning undefined.
export const getDXN = (obj: Any | Relation.Any): DXN => {
  assertArgument(!Schema.isSchema(obj), 'obj', 'Object should not be a schema.');
  const dxn = getObjectDXN(obj);
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
 * @returns The typename of the object's type.
 * @example `example.com/type/Person`
 */
export const getTypename = (obj: Any): string | undefined => {
  const schema = getSchema(obj);
  if (schema == null) {
    // Try to extract typename from DXN.
    return getTypeDXN$(obj)?.asTypeDXN()?.type;
  }

  return getSchemaTypename(schema);
};

//
// Meta
//

export const Meta: unique symbol = MetaId as any;

// TODO(dmaretskyi): Allow returning undefined.
export const getMeta = (obj: Any): ObjectMeta => {
  const meta = getMeta(obj);
  invariant(meta != null, 'Invalid object.');
  return meta;
};

/**
 * @returns Foreign keys for the object from the specified source.
 */
export const getKeys: {
  (entity: Any, source: string): ForeignKey[];
  (source: string): (entity: Any) => ForeignKey[];
} = Function.dual(2, (entity: Any, source?: string): ForeignKey[] => {
  const meta = getMeta(entity);
  invariant(meta != null, 'Invalid object.');
  return meta.keys.filter((key) => key.source === source);
});

/**
 * Delete all keys from the object for the specified source.
 * @param entity
 * @param source
 */
export const deleteKeys = (entity: Any, source: string) => {
  const meta = getMeta(entity);
  for (let i = 0; i < meta.keys.length; i++) {
    if (meta.keys[i].source === source) {
      meta.keys.splice(i, 1);
      i--;
    }
  }
};

export const addTag = (obj: Any, tag: string) => {
  const meta = getMeta(obj);
  meta.tags ??= [];
  meta.tags.push(tag);
};

export const removeTag = (obj: Any, tag: string) => {
  const meta = getMeta(obj);
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
export const isDeleted = (obj: Any): boolean => {
  const deleted = isDeleted(obj);
  invariant(typeof deleted === 'boolean', 'Invalid object.');
  return deleted;
};

//
// Annotations
//

export const getLabel = (obj: Any): string | undefined => {
  const schema = getSchema(obj);
  if (schema != null) {
    return getLabel$(schema, obj);
  }
};

export const setLabel = (obj: Any, label: string) => {
  const schema = getSchema(obj);
  if (schema != null) {
    setLabel$(schema, obj, label);
  }
};

export const getDescription = (obj: Any): string | undefined => {
  const schema = getSchema(obj);
  if (schema != null) {
    return getDescription$(schema, obj);
  }
};

export const setDescription = (obj: Any, description: string) => {
  const schema = getSchema(obj);
  if (schema != null) {
    setDescription$(schema, obj, description);
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
export const toJSON = (obj: Any): JSON => objectToJSON(obj);

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

export type Comparator = (a: Any, b: Any) => number;

export const sortByLabel: Comparator = (a: Any, b: Any) => compare(getLabel(a), getLabel(b));
export const sortByTypename: Comparator = (a: Any, b: Any) => compare(getTypename(a), getTypename(b));
export const sort = (...comparators: Comparator[]): Comparator => {
  return (a: Any, b: Any) => {
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
export const isVersion = (obj: unknown): obj is Version => {
  return obj != null && typeof obj === 'object' && VersionTypeId in obj;
};

/**
 * Returns the version of the object.
 */
export const version = (obj: Any): Version => {
  const version = (obj as any)[ObjectVersionId];
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

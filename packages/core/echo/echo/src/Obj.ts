//
// Copyright 2025 DXOS.org
//

import { dual } from 'effect/Function';
import * as Schema from 'effect/Schema';

import * as EchoSchema from '@dxos/echo-schema';
import { assertArgument, invariant } from '@dxos/invariant';
import { type DXN } from '@dxos/keys';
import * as LiveObject from '@dxos/live-object';
import { live } from '@dxos/live-object';
import { assumeType, deepMapValues } from '@dxos/util';

import type * as Ref from './Ref';
import type * as Relation from './Relation';
import * as Type from './Type';

/**
 * NOTE: Don't export: Obj.Any and Obj.Obj form the public API.
 */
interface BaseObj extends EchoSchema.HasId, Type.OfKind<EchoSchema.EntityKind.Object> {}

/**
 * Object type with specific properties.
 */
export type Obj<Props> = BaseObj & Props;

/**
 * Base type for all ECHO objects.
 */
export interface Any extends BaseObj {}

export const Any = Schema.Struct({}).pipe(
  Type.Obj({
    typename: 'dxos.org/types/Any',
    version: '0.1.0',
  }),
);

type Props<T = any> = { id?: EchoSchema.ObjectId } & Type.Properties<T>;

export type MakeProps<T extends Type.Obj.Any> = NoInfer<Props<Schema.Schema.Type<T>>> & {
  [Meta]?: Partial<EchoSchema.ObjectMeta>;
};

export const Meta: unique symbol = EchoSchema.MetaId as any;

const DEFAULT_META: EchoSchema.ObjectMeta = {
  keys: [],
};

/**
 * Creates new object.
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
export const make = <S extends Type.Obj.Any>(
  schema: S,
  props: MakeProps<S>,
  meta?: Partial<EchoSchema.ObjectMeta>,
): LiveObject.Live<Schema.Schema.Type<S>> => {
  assertArgument(
    EchoSchema.getTypeAnnotation(schema)?.kind === EchoSchema.EntityKind.Object,
    'schema',
    'Expected an object schema',
  );

  if (props[EchoSchema.MetaId] != null) {
    // Set default fields on meta on creation
    meta = { ...structuredClone(DEFAULT_META), ...props[EchoSchema.MetaId] };
    delete props[EchoSchema.MetaId];
  }

  return live<Schema.Schema.Type<S>>(schema, props as any, { keys: [], ...meta });
};

export const isObject = (obj: unknown): obj is Any => {
  assumeType<EchoSchema.InternalObjectProps>(obj);
  return typeof obj === 'object' && obj !== null && obj[EchoSchema.EntityKindId] === EchoSchema.EntityKind.Object;
};

/**
 * Test if object or relation is an instance of a schema.
 * @example
 * ```ts
 * const john = Obj.make(Person, { name: 'John' });
 * const johnIsPerson = Obj.instanceOf(Person)(john);
 *
 * const isPerson = Obj.instanceOf(Person);
 * if(isPerson(john)) {
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
    return (obj: unknown) => EchoSchema.isInstanceOf(args[0], obj);
  }

  return EchoSchema.isInstanceOf(args[0], args[1]);
}) as any;

export const getSchema = EchoSchema.getSchema;

// TODO(dmaretskyi): Allow returning undefined.
export const getDXN = (obj: Any | Relation.Any): DXN => {
  assertArgument(!Schema.isSchema(obj), 'obj', 'Object should not be a schema.');
  const dxn = EchoSchema.getObjectDXN(obj);
  invariant(dxn != null, 'Invalid object.');
  return dxn;
};

/**
 * @returns The DXN of the object's type.
 * @example dxn:example.com/type/Contact:1.0.0
 */
// TODO(burdon): Expando does not have a type.
export const getTypeDXN = EchoSchema.getType;

/**
 * @returns The typename of the object's type.
 * @example `example.com/type/Contact`
 */
export const getTypename = (obj: Any | Relation.Any): string | undefined => {
  const schema = getSchema(obj);
  if (schema == null) {
    // Try to extract typename from DXN.
    return EchoSchema.getType(obj)?.asTypeDXN()?.type;
  }

  return EchoSchema.getSchemaTypename(schema);
};

// TODO(dmaretskyi): Allow returning undefined.
export const getMeta = (obj: Any | Relation.Any): EchoSchema.ObjectMeta => {
  const meta = EchoSchema.getMeta(obj);
  invariant(meta != null, 'Invalid object.');
  return meta;
};

/**
 * @returns Foreign keys for the object from the specified source.
 */
export const getKeys: {
  (obj: Any | Relation.Any, source: string): EchoSchema.ForeignKey[];
  (source: string): (obj: Any | Relation.Any) => EchoSchema.ForeignKey[];
} = dual(2, (obj: Any | Relation.Any, source?: string): EchoSchema.ForeignKey[] => {
  const meta = EchoSchema.getMeta(obj);
  invariant(meta != null, 'Invalid object.');
  return meta.keys.filter((key) => key.source === source);
});

/**
 * Delete all keys from the object for the specified source.
 * @param obj
 * @param source
 */
export const deleteKeys = (obj: Any | Relation.Any, source: string) => {
  const meta = EchoSchema.getMeta(obj);
  for (let i = 0; i < meta.keys.length; i++) {
    if (meta.keys[i].source === source) {
      meta.keys.splice(i, 1);
      i--;
    }
  }
};

// TODO(dmaretskyi): Default to `false`.
export const isDeleted = (obj: Any | Relation.Any): boolean => {
  const deleted = EchoSchema.isDeleted(obj);
  invariant(typeof deleted === 'boolean', 'Invalid object.');
  return deleted;
};

export const getLabel = (obj: Any | Relation.Any): string | undefined => {
  const schema = getSchema(obj);
  if (schema != null) {
    return EchoSchema.getLabel(schema, obj);
  }
};

export const setLabel = (obj: Any | Relation.Any, label: string) => {
  const schema = getSchema(obj);
  if (schema != null) {
    EchoSchema.setLabel(schema, obj, label);
  }
};

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

/**
 * JSON representation of an object.
 */
export type JSON = EchoSchema.ObjectJSON;

/**
 * Converts object to its JSON representation.
 *
 * The same algorithm is used when calling the standard `JSON.stringify(obj)` function.
 */
// TODO(burdon): Base util type for Obj/Relation?
export const toJSON = (obj: Any | Relation.Any): JSON => EchoSchema.objectToJSON(obj);

/**
 * Creates an object from its json representation, performing schema validation.
 * References and schemas will be resolvable if the `refResolver` is provided.
 *
 * The function need to be async to support resolving the schema as well as the relation endpoints.
 *
 * @param options.refResolver - Resolver for references. Produces hydrated references that can be resolved.
 * @param options.dxn - Override object DXN. Changes the result of `Obj.getDXN`.
 */
export const fromJSON: (json: unknown, options?: { refResolver?: Ref.Resolver; dxn?: DXN }) => Promise<Any> =
  EchoSchema.objectFromJSON as any;

/**
 * Returns an immutable snapshot of an object.
 */
export const getSnapshot: <T extends Any>(obj: Obj<T>) => T = LiveObject.getSnapshot;

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
export const clone = <T extends Any | Relation.Any>(obj: T, opts?: CloneOptions): T => {
  const { id, ...data } = obj;
  const schema = getSchema(obj);
  invariant(schema != null, 'Object should have a schema');
  const props: any = deepMapValues(data, (value, recurse) => {
    if (EchoSchema.Ref.isRef(value)) {
      return value;
    }
    return recurse(value);
  });
  if (opts?.retainId) {
    props.id = id;
  }
  const meta = getMeta(obj);
  props[EchoSchema.MetaId] = deepMapValues(meta, (value, recurse) => {
    if (EchoSchema.Ref.isRef(value)) {
      return value;
    }
    return recurse(value);
  });
  return make(schema, props);
};

export const VersionTypeId = EchoSchema.VersionTypeId;
export type VersionType = typeof VersionTypeId;

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
export const version = (obj: Any | Relation.Any): Version => {
  const version = (obj as any)[EchoSchema.ObjectVersionId];
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

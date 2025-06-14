//
// Copyright 2024 DXOS.org
//

import { SchemaAST, Schema } from 'effect';

import { Reference } from '@dxos/echo-protocol';
import { splitJsonPath, type JsonPath } from '@dxos/effect';
import { DXN, ObjectId } from '@dxos/keys';
import { getDeep, setDeep } from '@dxos/util';

import { getSchemaDXN, getTypeAnnotation, getTypeIdentifierAnnotation } from '../ast';
import { getTypename, type ObjectMeta } from '../object';

// TODO(burdon): Use consistently (with serialization utils).
export const ECHO_ATTR_META = '@meta';

/**
 * Base type for all data objects (reactive, ECHO, and other raw objects).
 * NOTE: This describes the base type for all database objects.
 * It is stricter than `T extends {}` or `T extends object`.
 */
// TODO(dmaretskyi): Rename AnyProperties.
export type BaseObject = Record<string, any>;

/**
 * Marker interface for object with an `id`.
 */
export type HasId = {
  readonly id: string;
};

// TODO(burdon): Reconcile with AnyLiveObject. This type is used in some places (e.g. Ref) to mean LiveObject? Do we need branded types?
export type WithId = BaseObject & HasId;

export type ExcludeId<T extends BaseObject> = Omit<T, 'id'>;

export type PropertyKey<T extends BaseObject> = Extract<keyof ExcludeId<T>, string>;

export type WithMeta = { [ECHO_ATTR_META]?: ObjectMeta };

/**
 * The raw object should not include the ECHO id, but may include metadata.
 */
export const RawObject = <S extends Schema.Schema.AnyNoContext>(
  schema: S,
): Schema.Schema<ExcludeId<Schema.Schema.Type<S>> & WithMeta, Schema.Schema.Encoded<S>> => {
  return Schema.make(SchemaAST.omit(schema.ast, ['id']));
};

//
// Data
//

/**
 * @deprecated No longer used.
 */
export interface CommonObjectData {
  id: string;
  // TODO(dmaretskyi): Document cases when this can be null.
  // TODO(dmaretskyi): Convert to @typename and @meta.
  __typename: string | null;
  __meta: ObjectMeta;
}

/**
 * @deprecated No longer used.
 */
export interface AnyObjectData extends CommonObjectData {
  /**
   * Fields of the object.
   */
  [key: string]: any;
}

/**
 * Object data type in JSON-encodable format.
 * References are encoded in the IPLD format.
 * `__typename` is the string DXN of the object type.
 * Meta is added under `__meta` key.
 * @deprecated No longer used.
 */
export type ObjectData<S> = Schema.Schema.Encoded<S> & CommonObjectData;

//
// Utils
//

/**
 * Utility to split meta property from raw object.
 * @deprecated Bad API.
 */
export const splitMeta = <T>(object: T & WithMeta): { object: T; meta?: ObjectMeta } => {
  const meta = object[ECHO_ATTR_META];
  delete object[ECHO_ATTR_META];
  return { meta, object };
};

// TODO(burdon): Move to `@dxos/util`.
export const getValue = <T extends object>(obj: T, path: JsonPath): any => {
  return getDeep(
    obj,
    splitJsonPath(path).map((p) => p.replace(/[[\]]/g, '')),
  );
};

// TODO(burdon): Move to `@dxos/util`.
export const setValue = <T extends object>(obj: T, path: JsonPath, value: any): T => {
  return setDeep(
    obj,
    splitJsonPath(path).map((p) => p.replace(/[[\]]/g, '')),
    value,
  );
};

/**
 * Returns a typename of a schema.
 */
export const getTypenameOrThrow = (schema: Schema.Schema.AnyNoContext): string => requireTypeReference(schema).objectId;

/**
 * Returns a reference that will be used to point to a schema.
 */
// TODO(dmaretskyi): Unify with `getSchemaDXN`.
export const getTypeReference = (schema: Schema.Schema.All | undefined): Reference | undefined => {
  if (!schema) {
    return undefined;
  }

  const echoId = getTypeIdentifierAnnotation(schema);
  if (echoId) {
    return Reference.fromDXN(DXN.parse(echoId));
  }

  const annotation = getTypeAnnotation(schema);
  if (annotation == null) {
    return undefined;
  }

  return Reference.fromDXN(DXN.fromTypenameAndVersion(annotation.typename, annotation.version));
};

/**
 * Returns a reference that will be used to point to a schema.
 * @throws If it is not possible to reference this schema.
 */
export const requireTypeReference = (schema: Schema.Schema.AnyNoContext): Reference => {
  const typeReference = getTypeReference(schema);
  if (typeReference == null) {
    // TODO(burdon): Catalog user-facing errors (this is too verbose).
    throw new Error('Schema must be defined via TypedObject.');
  }

  return typeReference;
};

// TODO(burdon): Can we use `Schema.is`?
export const isInstanceOf = <Schema extends Schema.Schema.AnyNoContext>(
  schema: Schema,
  object: any,
): object is Schema.Schema.Type<Schema> => {
  if (object == null) {
    return false;
  }

  const schemaDXN = getSchemaDXN(schema);
  if (!schemaDXN) {
    throw new Error('Schema must have an object annotation.');
  }

  const typename = getTypename(object);
  if (!typename) {
    return false;
  }

  if (typename.startsWith('dxn:')) {
    return schemaDXN.toString() === typename;
  } else {
    const typeDXN = schemaDXN.asTypeDXN();
    if (!typeDXN) {
      return false;
    }

    return typeDXN.type === typename;
  }
};

/**
 * Object that has an associated typename.
 * The typename is retrievable using {@link getTypename}.
 * The object can be used with {@link isInstanceOf} to check if it is an instance of a schema.
 */
export type HasTypename = {};

/**
 * Returns a DXN for an object or schema.
 */
export const getDXN = (object: any): DXN | undefined => {
  if (Schema.isSchema(object)) {
    return getSchemaDXN(object as any);
  }

  if (typeof object !== 'object' || object == null) {
    throw new TypeError('Object is not an object.');
  }

  if (!ObjectId.isValid(object.id)) {
    throw new TypeError('Object id is not valid.');
  }

  return DXN.fromLocalObjectId(object.id);
};

/**
 * Canonical type for all ECHO objects.
 * @deprecated Use `AnyEchoObject` instead.
 */
export interface BaseEchoObject extends HasId, HasTypename {}

// TODO(burdon): Reconcile with Type.Any.
export interface AnyEchoObject extends BaseEchoObject {}

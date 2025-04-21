//
// Copyright 2024 DXOS.org
//

import { SchemaAST as AST, Schema as S } from 'effect';

import { Reference } from '@dxos/echo-protocol';
import { splitJsonPath, type JsonPath } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { getDeep, setDeep } from '@dxos/util';

import { getObjectIdentifierAnnotation, getObjectAnnotation, type HasId } from './ast';
import { ObjectId, type ObjectMeta, getTypename } from './object';

// TODO(burdon): Use consistently (with serialization utils).
export const ECHO_ATTR_META = '@meta';

/**
 * Base type for all data objects (reactive, ECHO, and other raw objects).
 * NOTE: This describes the base type for all database objects.
 * It is stricter than `T extends {}` or `T extends object`.
 */
// TODO(burdon): Consider moving to lower-level base type lib.
// TODO(dmaretskyi): Rename AnyProperties.
export type BaseObject = Record<string, any>;

// TODO(burdon): Reconcile with ReactiveEchoObject. This type is used in some places (e.g. Ref) to mean LiveObject? Do we need branded types?
export type WithId = BaseObject & HasId;

export type PropertyKey<T extends BaseObject> = Extract<keyof ExcludeId<T>, string>;

export type ExcludeId<T extends BaseObject> = Omit<T, 'id'>;

export type WithMeta = { [ECHO_ATTR_META]?: ObjectMeta };

/**
 * The raw object should not include the ECHO id, but may include metadata.
 */
export const RawObject = <S extends S.Schema.AnyNoContext>(
  schema: S,
): S.Schema<ExcludeId<S.Schema.Type<S>> & WithMeta, S.Schema.Encoded<S>> => {
  return S.make(AST.omit(schema.ast, ['id']));
};

//
// Data
//

export interface CommonObjectData {
  id: string;
  // TODO(dmaretskyi): Document cases when this can be null.
  // TODO(dmaretskyi): Convert to @typename and @meta.
  __typename: string | null;
  __meta: ObjectMeta;
}

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
 */
export type ObjectData<S> = S.Schema.Encoded<S> & CommonObjectData;

//
// Utils
//

/**
 * Utility to split meta property from raw object.
 */
export const splitMeta = <T>(object: T & WithMeta): { object: T; meta?: ObjectMeta } => {
  const meta = object[ECHO_ATTR_META];
  delete object[ECHO_ATTR_META];
  return { meta, object };
};

export const getValue = <T extends object>(obj: T, path: JsonPath): any => {
  return getDeep(
    obj,
    splitJsonPath(path).map((p) => p.replace(/[[\]]/g, '')),
  );
};

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
export const getTypenameOrThrow = (schema: S.Schema.AnyNoContext): string => requireTypeReference(schema).objectId;

/**
 * Returns a reference that will be used to point to a schema.
 */
export const getTypeReference = (schema: S.Schema.AnyNoContext | undefined): Reference | undefined => {
  if (!schema) {
    return undefined;
  }

  const echoId = getObjectIdentifierAnnotation(schema);
  if (echoId) {
    return Reference.fromDXN(DXN.parse(echoId));
  }

  const annotation = getObjectAnnotation(schema);
  if (annotation == null) {
    return undefined;
  }

  return Reference.fromDXN(DXN.fromTypenameAndVersion(annotation.typename, annotation.version));
};

/**
 * Returns a reference that will be used to point to a schema.
 * @throws If it is not possible to reference this schema.
 */
export const requireTypeReference = (schema: S.Schema.AnyNoContext): Reference => {
  const typeReference = getTypeReference(schema);
  if (typeReference == null) {
    // TODO(burdon): Catalog user-facing errors (this is too verbose).
    throw new Error('Schema must be defined via TypedObject.');
  }

  return typeReference;
};

// TODO(dmaretskyi): Unify with `getTypeReference`.
export const getSchemaDXN = (schema: S.Schema.All): DXN | undefined => {
  // TODO(dmaretskyi): Add support for dynamic schema.
  const objectAnnotation = getObjectAnnotation(schema);
  if (!objectAnnotation) {
    return undefined;
  }

  return DXN.fromTypenameAndVersion(objectAnnotation.typename, objectAnnotation.version);
};

// TODO(burdon): Can we use `S.is`?
export const isInstanceOf = <Schema extends S.Schema.AnyNoContext>(
  schema: Schema,
  object: any,
): object is S.Schema.Type<Schema> => {
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
  if (S.isSchema(object)) {
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

export type BaseEchoObject = HasId & HasTypename;

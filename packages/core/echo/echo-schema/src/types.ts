//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';

import { Reference } from '@dxos/echo-protocol';
import { AST, type JsonPath } from '@dxos/effect';
import { getDeep, setDeep } from '@dxos/util';

import { getObjectAnnotation, type HasId } from './ast';
import type { ObjectMeta } from './object/meta';

// TODO(burdon): Use consistently (with serialization utils).
export const ECHO_ATTR_META = '@meta';

//
// Objects
//

/**
 * Base type for all data objects (reactive, ECHO, and other raw objects).
 * NOTE: This describes the base type for all database objects.
 * It is stricter than `T extends {}` or `T extends object`.
 */
// TODO(burdon): Consider moving to lower-level base type lib.
export type BaseObject = { [key: string]: any };

export type PropertyKey<T extends BaseObject> = Extract<keyof ExcludeId<T>, string>;

export type ExcludeId<T extends BaseObject> = Omit<T, 'id'>;

// TODO(burdon): Reconcile with ReactiveEchoObject.
export type WithId = HasId & BaseObject;

export type WithMeta = { [ECHO_ATTR_META]?: ObjectMeta };

/**
 * The raw object should not include the ECHO id, but may include metadata.
 */
export const RawObject = <S extends S.Schema<any>>(
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

export const getValue = <T = any>(obj: any, path: JsonPath) => getDeep<T>(obj, path.split('.'));
export const setValue = <T = any>(obj: any, path: JsonPath, value: T) => setDeep<T>(obj, path.split('.'), value);

/**
 * Returns a typename of a schema.
 */
export const getTypenameOrThrow = (schema: S.Schema<any>): string => requireTypeReference(schema).objectId;

/**
 * Returns a reference that will be used to point to a schema.
 */
export const getTypeReference = (schema: S.Schema<any> | undefined): Reference | undefined => {
  if (!schema) {
    return undefined;
  }

  const annotation = getObjectAnnotation(schema);
  if (annotation == null) {
    return undefined;
  }
  if (annotation.schemaId) {
    return Reference.localObjectReference(annotation.schemaId);
  }

  return Reference.fromLegacyTypename(annotation.typename);
};

/**
 * Returns a reference that will be used to point to a schema.
 * @throws If it is not possible to reference this schema.
 */
export const requireTypeReference = (schema: S.Schema<any>): Reference => {
  const typeReference = getTypeReference(schema);
  if (typeReference == null) {
    // TODO(burdon): Catalog user-facing errors (this is too verbose).
    throw new Error('Schema must be defined via TypedObject.');
  }

  return typeReference;
};

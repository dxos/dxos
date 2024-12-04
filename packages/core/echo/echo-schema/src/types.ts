//
// Copyright 2024 DXOS.org
//

import { Reference } from '@dxos/echo-protocol';
import { AST, type JsonPath, S } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { getDeep, setDeep } from '@dxos/util';

import { getObjectAnnotation, type HasId } from './ast';

export const data = Symbol.for('@dxos/schema/Data');

// TODO(burdon): Move to client-protocol.
// TODO(dmaretskyi): Only usage below SDK level is in `serializer.ts`.
export const TYPE_PROPERTIES = 'dxos.org/type/Properties';

// TODO(burdon): Use consistently (with serialization utils).
export const ECHO_ATTR_ID = '@id';
export const ECHO_ATTR_TYPE = '@type';
export const ECHO_ATTR_META = '@meta';

//
// ForeignKey
//

const _ForeignKeySchema = S.Struct({
  source: S.String,
  id: S.String,
});

export type ForeignKey = S.Schema.Type<typeof _ForeignKeySchema>;

export const ForeignKeySchema: S.Schema<ForeignKey> = _ForeignKeySchema;

//
// ObjectMeta
//

export const ObjectMetaSchema = S.mutable(
  S.Struct({
    keys: S.mutable(S.Array(ForeignKeySchema)),
  }),
);

export type ObjectMeta = S.Schema.Type<typeof ObjectMetaSchema>;

//
// Objects
//

/**
 * Base type for all data objects (reactive, ECHO, and other raw objects).
 * NOTE: This describes the base type for all database objects.
 * It is stricter than `T extends {}` or `T extends object`.
 */
// TODO(burdon): Consider moving to lower-level base type lib.
export type BaseObject<T> = { [K in keyof T]: T[K] };

export type PropertyKey<T extends BaseObject<T>> = Extract<keyof ExcludeId<T>, string>;

export type ExcludeId<T extends BaseObject<T>> = Omit<T, 'id'>;

// TODO(burdon): Reconcile with ReactiveEchoObject.
export type WithId = HasId & BaseObject<any>;

export type WithMeta = { [ECHO_ATTR_META]?: ObjectMeta };

/**
 * The raw object should not include the ECHO id, but may include metadata.
 */
export const RawObject = <S extends S.Schema<any>>(
  schema: S,
): S.Schema<ExcludeId<S.Schema.Type<S>> & WithMeta, S.Schema.Encoded<S>> => {
  return S.make(AST.omit(schema.ast, ['id']));
};

/**
 * Reference to another ECHO object.
 */
export type Ref<T extends WithId> = T | undefined;

/**
 * Reactive object marker interface (does not change the shape of the object.)
 * Accessing properties triggers signal semantics.
 */
export type ReactiveObject<T extends BaseObject<T>> = { [K in keyof T]: T[K] };

//
// Data
//

export interface CommonObjectData {
  id: string;
  // TODO(dmaretskyi): Document cases when this can be null.
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

export const foreignKey = (source: string, id: string): ForeignKey => ({ source, id });
export const foreignKeyEquals = (a: ForeignKey, b: ForeignKey) => a.source === b.source && a.id === b.id;

export const getValue = <T = any>(obj: any, path: JsonPath) => getDeep<T>(obj, path.split('.'));
export const setValue = <T = any>(obj: any, path: JsonPath, value: T) => setDeep<T>(obj, path.split('.'), value);

export const getTypenameOrThrow = (schema: S.Schema<any>): string => requireTypeReference(schema).objectId;

export const getTypeReference = (schema: S.Schema<any> | undefined): Reference | undefined => {
  if (!schema) {
    return undefined;
  }

  const annotation = getObjectAnnotation(schema);
  if (annotation == null) {
    return undefined;
  }
  if (annotation.schemaId) {
    return new Reference(annotation.schemaId);
  }

  return Reference.fromLegacyTypename(annotation.typename);
};

export const requireTypeReference = (schema: S.Schema<any>): Reference => {
  const typeReference = getTypeReference(schema);
  if (typeReference == null) {
    // TODO(burdon): Catalog user-facing errors (this is too verbose).
    throw new Error('Schema must be defined via TypedObject.');
  }

  return typeReference;
};

/**
 * Querying the typename of the object.
 * The typename is the raw string without version: `example.com/type/Contact`.
 */
// TODO(dmaretskyi): Convert to DXN.
export const TYPENAME_SYMBOL = Symbol.for('@dxos/schema/Typename');

/**
 * Sets the typename of the object without the version.
 */
// TODO(dmaretskyi): Convert to DXN.
export const getTypename = (obj: BaseObject<any>): string | undefined => {
  const typename = (obj as any)[TYPENAME_SYMBOL];
  if (typename === undefined) {
    return undefined;
  }
  invariant(typeof typename === 'string');
  invariant(!typename.startsWith('dxn:'));
  invariant(!typename.includes('@'));
  return typename;
};

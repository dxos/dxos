//
// Copyright 2024 DXOS.org
//

import { type Simplify } from 'effect/Types';

import { AST, type JsonPath, S } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { type Comparator, getDeep, intersection, setDeep } from '@dxos/util';

import { getProxyHandler } from './proxy';
import { Brand } from 'effect';
import type { SpaceId } from '@dxos/keys';

export const data = Symbol.for('@dxos/schema/Data');

// TODO(burdon): Move to client-protocol.
export const TYPE_PROPERTIES = 'dxos.org/type/Properties';

// TODO(burdon): Use consistently (with serialization utils).
export const ECHO_ATTR_ID = '@id';
export const ECHO_ATTR_TYPE = '@type';
export const ECHO_ATTR_META = '@meta';

//
// Object ID
//

/**
 * ID of an ECHO object.
 * Defined as a ULID.
 * @example 01E2XZ6QZQZQZQZQZQZQZQZQZQ
 */
export type ObjectId = string & { _ObjectId: never };

export const ObjectIdSchema: S.Schema<ObjectId> = S.String.annotations({
  description: 'Object ID',
}) as any as S.Schema<ObjectId>;

//
// Space ID
//

export const SpaceIdSchema: S.Schema<SpaceId> = S.String.annotations({
  description: 'Space ID',
}) as any as S.Schema<SpaceId>;

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

export type ExcludeId<T> = Simplify<Omit<T, 'id'>>;

type WithMeta = { [ECHO_ATTR_META]?: ObjectMeta };

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
export type Ref<T> = T | undefined;

/**
 * Reactive object marker interface (does not change the shape of the object.)
 * Accessing properties triggers signal semantics.
 */
export type ReactiveObject<T> = { [K in keyof T]: T[K] };

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

export const getMeta = <T extends {}>(obj: T): ObjectMeta => {
  const meta = getProxyHandler(obj).getMeta(obj);
  invariant(meta);
  return meta;
};

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
export const compareForeignKeys: Comparator<ReactiveObject<any>> = (a: ReactiveObject<any>, b: ReactiveObject<any>) =>
  intersection(getMeta(a).keys, getMeta(b).keys, foreignKeyEquals).length > 0;

export const getValue = <T = any>(obj: any, path: JsonPath) => getDeep<T>(obj, path.split('.'));
export const setValue = <T = any>(obj: any, path: JsonPath, value: T) => setDeep<T>(obj, path.split('.'), value);

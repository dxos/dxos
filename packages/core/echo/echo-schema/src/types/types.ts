//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { Reference } from '@dxos/echo-protocol';
import { type JsonPath, splitJsonPath } from '@dxos/effect';
import { DXN, type ObjectId } from '@dxos/keys';
import { getDeep, setDeep } from '@dxos/util';

import { getSchemaDXN } from '../ast';
import { type EntityKindId, type ObjectMeta, getType, getTypename } from '../object';
import { ATTR_META } from '../object/model';

/**
 * Base type for all data objects (reactive, ECHO, and other raw objects).
 * NOTE: This describes the base type for all database objects.
 * It is stricter than `T extends {}` or `T extends object`.
 */
// TODO(dmaretskyi): Rename AnyProperties.
// TODO(dmaretskyi): Prefer `Record<string, unknown>` over `any`.
export type BaseObject = Record<string, any>;

/**
 * Marker interface for object with an `id`.
 */
export interface HasId {
  readonly id: ObjectId;
}

// TODO(dmaretskyi): Remove; this type effectively disables type safety due to `any`.
export type WithId<T extends BaseObject = BaseObject> = T & HasId;

export type ExcludeId<T extends BaseObject> = Omit<T, 'id'>;

/**
 * Properties that are required for object creation.
 */
// TODO(dmaretskyi): Rename `MakeProps`?
export type CreationProps<T extends BaseObject> = Omit<T, 'id' | typeof EntityKindId>;

export type PropertyKey<T extends BaseObject> = Extract<keyof ExcludeId<T>, string>;

// TODO(dmaretskyi): Remove. This should be using the symbol type.
export type WithMeta = { [ATTR_META]?: ObjectMeta };

/**
 * The raw object should not include the ECHO id, but may include metadata.
 */
export const RawObject = <S extends Schema.Schema.AnyNoContext>(
  schema: S,
): Schema.Schema<ExcludeId<Schema.Schema.Type<S>> & WithMeta, Schema.Schema.Encoded<S>> => {
  return Schema.make(SchemaAST.omit(schema.ast, ['id']));
};

//
// Utils
//

/**
 * Utility to split meta property from raw object.
 * @deprecated Bad API.
 */
export const splitMeta = <T>(object: T & WithMeta): { object: T; meta?: ObjectMeta } => {
  const meta = object[ATTR_META];
  delete object[ATTR_META];
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
 * Returns a reference that will be used to point to a schema.
 * @deprecated Use {@link getSchemaDXN} instead.
 */
export const getTypeReference = (schema: Schema.Schema.All | undefined): Reference | undefined => {
  if (!schema) {
    return undefined;
  }

  const schemaDXN = getSchemaDXN(schema);
  if (!schemaDXN) {
    return undefined;
  }
  return Reference.fromDXN(schemaDXN);
};

/**
 * Returns a reference that will be used to point to a schema.
 * @throws If it is not possible to reference this schema.
 *
 * @deprecated Use {@link getSchemaDXN} instead.
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
/**
 * Checks if the object is an instance of the schema.
 * Only typename is compared, the schema version is ignored.
 *
 * The following cases are considered to mean that the object is an instance of the schema:
 *  - Object was created with this exact schema.
 *  - Object was created with a different version of this schema.
 *  - Object was created with a different schema (maybe dynamic) that has the same typename.
 */
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

  const type = getType(object);
  if (type && DXN.equals(type, schemaDXN)) {
    return true;
  }

  const typename = getTypename(object);
  if (!typename) {
    return false;
  }

  const typeDXN = schemaDXN.asTypeDXN();
  if (!typeDXN) {
    return false;
  }

  return typeDXN.type === typename;
};

/**
 * Object that has an associated typename.
 * The typename is retrievable using {@link getTypename}.
 * The object can be used with {@link isInstanceOf} to check if it is an instance of a schema.
 */
export type HasTypename = {};

/**
 * Canonical type for all ECHO objects.
 */
// TODO(burdon): Reconcile with Obj.Any, Relation.Any.
export interface AnyEchoObject extends HasId, HasTypename {}

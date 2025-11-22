//
// Copyright 2025 DXOS.org
//

import type * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { Reference } from '@dxos/echo-protocol';
import { DXN } from '@dxos/keys';

import { getType, getTypename } from '../types';

import { getSchemaDXN } from './annotations';

export interface AnnotationHelper<T> {
  get: (schema: Schema.Schema.Any) => Option.Option<T>;
  set: (value: T) => <S extends Schema.Schema.Any>(schema: S) => S;
}

export const createAnnotationHelper = <T>(id: symbol): AnnotationHelper<T> => {
  return {
    get: (schema) => SchemaAST.getAnnotation(schema.ast, id),
    set:
      (value) =>
      <S extends Schema.Schema.Any>(schema: S) =>
        schema.annotations({ [id]: value }) as S,
  };
};

/**
 * If property is optional returns the nested property, otherwise returns the property.
 */
// TODO(wittjosiah): Is there a way to do this as a generic?
export const unwrapOptional = (property: SchemaAST.PropertySignature) => {
  if (!property.isOptional || !SchemaAST.isUnion(property.type)) {
    return property;
  }

  return property.type.types[0];
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

/**
 * Checks if the object is an instance of the schema.
 * Only typename is compared, the schema version is ignored.
 *
 * The following cases are considered to mean that the object is an instance of the schema:
 *  - Object was created with this exact schema.
 *  - Object was created with a different version of this schema.
 *  - Object was created with a different schema (maybe dynamic) that has the same typename.
 */
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

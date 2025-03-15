//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';

import {
  createJsonSchema,
  EchoObject,
  getObjectAnnotation,
  EchoSchema,
  ObjectAnnotationId,
  StoredSchema,
  toJsonSchema,
  type JsonSchemaType,
  type ObjectAnnotation,
} from '@dxos/echo-schema';

import { create, type ReactiveObject } from './object';

/**
 * Create ECHO object representing schema.
 */
export const createStoredSchema = (
  { typename, version }: Pick<ObjectAnnotation, 'typename' | 'version'>,
  jsonSchema?: JsonSchemaType,
): ReactiveObject<StoredSchema> => {
  return create(StoredSchema, {
    typename,
    version,
    jsonSchema: jsonSchema ?? createJsonSchema(),
  });
};

/**
 * Create runtime representation of a schema.
 */
export const createEchoSchema = (
  { typename, version }: Pick<ObjectAnnotation, 'typename' | 'version'>,
  fields: S.Struct.Fields,
): EchoSchema => {
  const schema = S.partial(S.Struct(fields).omit('id')).pipe(EchoObject(typename, version));
  const objectAnnotation = getObjectAnnotation(schema)!;
  const schemaObject = createStoredSchema({ typename, version });
  const updatedSchema = schema.annotations({
    [ObjectAnnotationId]: { ...objectAnnotation } satisfies ObjectAnnotation,
  });

  schemaObject.jsonSchema = toJsonSchema(updatedSchema);
  return new EchoSchema(schemaObject);
};

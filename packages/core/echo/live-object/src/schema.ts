//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';

import {
  createJsonSchema,
  getTypeAnnotation,
  toJsonSchema,
  EchoObject,
  EchoSchema,
  StoredSchema,
  TypeAnnotationId,
  type JsonSchemaType,
  type TypeMeta,
  type TypeAnnotation,
} from '@dxos/echo-schema';

import { create, type ReactiveObject } from './object';

/**
 * Create ECHO object representing schema.
 */
export const createStoredSchema = (
  { typename, version }: TypeMeta,
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
export const createEchoSchema = ({ typename, version }: TypeMeta, fields: S.Struct.Fields): EchoSchema => {
  const schema = S.partial(S.Struct(fields).omit('id')).pipe(EchoObject({ typename, version }));
  const objectAnnotation = getTypeAnnotation(schema)!;
  const schemaObject = createStoredSchema({ typename, version });
  const updatedSchema = schema.annotations({
    [TypeAnnotationId]: { ...objectAnnotation } satisfies TypeAnnotation,
  });

  schemaObject.jsonSchema = toJsonSchema(updatedSchema);
  return new EchoSchema(schemaObject);
};

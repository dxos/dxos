//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import {
  createJsonSchema,
  getTypeAnnotation,
  toJsonSchema,
  EchoObject,
  EchoSchema,
  type JsonSchemaType,
  StoredSchema,
  TypeAnnotationId,
  type TypeMeta,
  type TypeAnnotation,
} from '@dxos/echo-schema';

import type { Live } from './live';
import { live } from './object';

/**
 * Create ECHO object representing schema.
 */
export const createStoredSchema = (
  { typename, version }: TypeMeta,
  jsonSchema?: JsonSchemaType,
): Live<StoredSchema> => {
  return live(StoredSchema, {
    typename,
    version,
    jsonSchema: jsonSchema ?? createJsonSchema(),
  });
};

/**
 * Create runtime representation of a schema.
 */
// TODO(dmaretskyi): Just take an effect schema with annotations.
export const createEchoSchema = ({ typename, version }: TypeMeta, fields: Schema.Struct.Fields): EchoSchema => {
  const schema = Schema.partial(Schema.Struct(fields).omit('id')).pipe(EchoObject({ typename, version }));
  const objectAnnotation = getTypeAnnotation(schema)!;
  const schemaObject = createStoredSchema({ typename, version });
  const updatedSchema = schema.annotations({
    [TypeAnnotationId]: { ...objectAnnotation } satisfies TypeAnnotation,
  });

  schemaObject.jsonSchema = toJsonSchema(updatedSchema);
  return new EchoSchema(schemaObject);
};

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

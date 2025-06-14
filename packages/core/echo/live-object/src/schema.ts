//
// Copyright 2024 DXOS.org
//

import { createJsonSchema, type JsonSchemaType, StoredSchema, type TypeMeta } from '@dxos/echo-schema';

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

//
// Copyright 2024 DXOS.org
//

import { type MutableSchema, type JsonProp, setSchemaReference } from '@dxos/echo-schema';

export const createReferenceProperty = (schema: MutableSchema, property: JsonProp, referenceSchema: string) => {
  const jsonProperty = setSchemaReference({}, referenceSchema);
  schema.jsonSchema.properties ??= {};
  schema.jsonSchema.properties[property] = jsonProperty;
  return schema;
};

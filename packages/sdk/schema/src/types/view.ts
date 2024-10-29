//
// Copyright 2024 DXOS.org
//

import { type MutableSchema } from '@dxos/echo-schema';
import { getProperty } from '@dxos/effect';

import { schemaForType } from './field';
import { type FieldType, type ViewType } from './types';

export const addFieldToView = (schema: MutableSchema, view: ViewType, field: FieldType) => {
  // Validate that the field does not already exist in the view.
  if (getProperty(schema, field.path)) {
    throw new Error(`Field already exists: ${field.path}`);
  }

  const propertySchema = schemaForType[field.type];
  if (!propertySchema) {
    throw new Error(`No schema for field type: ${field.type}`);
  }
  schema.addFields({ [field.path]: propertySchema });
  view.fields.push(field);
};

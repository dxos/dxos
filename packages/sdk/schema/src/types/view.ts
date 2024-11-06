//
// Copyright 2024 DXOS.org
//

import { type MutableSchema } from '@dxos/echo-schema';
import { getProperty } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import { schemaForType } from './field';
import { type FieldType, type ViewType } from './types';

export const addFieldToView = (
  schema: MutableSchema,
  view: ViewType,
  field: FieldType,
  position = view.fields.length,
) => {
  invariant(!getProperty(schema, field.path), `Field path already exists in schema: ${field.path}`);
  invariant(position >= 0 && position <= view.fields.length, `Invalid field position: ${position}`);

  const propertySchema = schemaForType[field.type];
  invariant(propertySchema, `No schema for field type: ${field.type}`);

  schema.addFields({ [field.path]: propertySchema });
  view.fields.splice(position, 0, field);
};

export const removeFieldFromView = (schema: MutableSchema, view: ViewType, field: FieldType) => {
  const index = view.fields.findIndex((f) => f.path === field.path);
  if (index !== -1) {
    view.fields.splice(index, 1);
  }
  schema.removeFields([field.path]);
};

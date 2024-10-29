//
// Copyright 2024 DXOS.org
//

import { type MutableSchema } from '@dxos/echo-schema';
import { getProperty } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import { schemaForType } from './field';
import { type FieldType, type ViewType } from './types';

export const addFieldToView = (schema: MutableSchema, view: ViewType, field: FieldType) => {
  invariant(!getProperty(schema, field.path), `Field path already exists in schema: ${field.path}`);

  const propertySchema = schemaForType[field.type];
  invariant(propertySchema, `No schema for field type: ${field.type}`);

  schema.addFields({ [field.path]: propertySchema });
  view.fields.push(field);
};

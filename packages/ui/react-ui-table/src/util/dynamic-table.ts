//
// Copyright 2025 DXOS.org
//

import { create, makeRef } from '@dxos/live-object';
import {
  createView,
  echoSchemaFromPropertyDefinitions,
  ViewProjection,
  type SchemaPropertyDefinition,
} from '@dxos/schema';

import { TableType } from '..';

type PropertyDisplayProps = {
  size: number;
};

export type TablePropertyDefinition = SchemaPropertyDefinition & Partial<PropertyDisplayProps>;

export const makeDynamicTable = (typename: string, properties: TablePropertyDefinition[]) => {
  const table = create(TableType, { name: 'dynamic-table' });
  const echoSchema = echoSchemaFromPropertyDefinitions(typename, properties);
  const propertyNames = properties.map((property) => property.name);
  const view = createView({
    name: 'dynamic-table',
    typename: echoSchema.typename,
    jsonSchema: echoSchema.jsonSchema,
    fields: propertyNames,
  });

  // Update size based on properties
  for (const property of properties) {
    if (property.size && view.fields) {
      const field = view.fields.find((field) => field.path === property.name);
      if (field) {
        field.size = property.size;
      }
    }
  }

  table.view = makeRef(view);

  const viewProjection = new ViewProjection(echoSchema, view);

  return {
    table,
    schema: echoSchema,
    view,
    viewProjection,
  };
};

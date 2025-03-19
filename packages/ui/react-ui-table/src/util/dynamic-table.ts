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

export const makeDynamicTable = (typename: string, properties: SchemaPropertyDefinition[]) => {
  const table = create(TableType, { name: 'dynamic-table' });
  const echoSchema = echoSchemaFromPropertyDefinitions(typename, properties);
  const propertyNames = properties.map((property) => property.name);
  const view = createView({
    name: 'dynamic-table',
    typename: echoSchema.typename,
    jsonSchema: echoSchema.jsonSchema,
    fields: propertyNames,
  });

  table.view = makeRef(view);

  const viewProjection = new ViewProjection(echoSchema, view);

  return {
    table,
    schema: echoSchema,
    view,
    viewProjection,
  };
};

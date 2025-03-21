//
// Copyright 2025 DXOS.org
//

import { type SortDirectionType } from '@dxos/echo-schema';
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
  title: string;
  sort: SortDirectionType;
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

  table.view = makeRef(view);
  const viewProjection = new ViewProjection(echoSchema, view);

  for (const property of properties) {
    if (!view.fields) {
      continue;
    }

    if (property.size) {
      const field = view.fields.find((field) => field.path === property.name);
      if (field) {
        field.size = property.size;

        const fieldProjection = viewProjection.getFieldProjection(field.id);
        viewProjection.setFieldProjection({
          ...fieldProjection,
          props: { ...fieldProjection.props, title: property.title },
        });
      }
    }

    if (property.sort) {
      const field = view.fields.find((field) => field.path === property.name);
      if (field) {
        const fieldId = field.id;
        view.query.sort = [{ fieldId, direction: property.sort }];
      }
    }
  }

  return {
    table,
    schema: echoSchema,
    view,
    viewProjection,
  };
};

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

// TODO(ZaymonFC): Upstream these extra fields to SchemaPropertyDefinition to enhance
//   schema-tools schema creation.
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

    const field = view.fields.find((field) => field.path === property.name);
    if (field) {
      if (property.size !== undefined) {
        field.size = property.size;
      }

      if (property.title !== undefined) {
        const fieldProjection = viewProjection.getFieldProjection(field.id);
        viewProjection.setFieldProjection({
          ...fieldProjection,
          props: { ...fieldProjection.props, title: property.title },
        });
      }

      if (property.sort) {
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

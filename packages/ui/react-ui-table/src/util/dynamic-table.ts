//
// Copyright 2025 DXOS.org
//

import { type JsonSchemaType, type SortDirectionType } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
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

type MakeDynamicTableProps = {
  typename: string;
  properties?: TablePropertyDefinition[];
  jsonSchema?: JsonSchemaType;
};

export const makeDynamicTable = ({ typename, properties, jsonSchema }: MakeDynamicTableProps) => {
  // TODO(ZaymonFC): It might be better to return undefined instead of throwing here.
  invariant(properties || jsonSchema, 'Either properties or jsonSchema must be provided');

  const table = create(TableType, { name: 'dynamic-table' });
  const schema = properties
    ? echoSchemaFromPropertyDefinitions(typename, properties)
    : { typename, jsonSchema: jsonSchema! };

  const view = createView({
    name: 'dynamic-table',
    typename: schema.typename,
    jsonSchema: schema.jsonSchema,
    ...(properties && { fields: properties.map((property) => property.name) }),
  });

  table.view = makeRef(view);
  const viewProjection = new ViewProjection(schema.jsonSchema, view);

  if (properties && view.fields) {
    for (const property of properties) {
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
  }

  return {
    table,
    schema,
    view,
    viewProjection,
  };
};

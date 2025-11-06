//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { Filter, Obj, Query } from '@dxos/echo';
import { getTypename, toJsonSchema } from '@dxos/echo/internal';
import type { JsonSchemaType } from '@dxos/echo/internal';

import { Table } from '../types';

// TODO(ZaymonFC): Upstream these extra fields to SchemaPropertyDefinition to enhance schema-tools schema creation.
type PropertyDisplayProps = {
  size: number;
  title: string;
  sort: SortDirectionType;
};

export type TablePropertyDefinition = SchemaPropertyDefinition & Partial<PropertyDisplayProps>;

/**
 * @deprecated
 */
// TODO(burdon): Remove variance.
export const getBaseSchema = ({
  typename,
  properties,
  jsonSchema,
  schema,
}: {
  typename?: string;
  properties?: TablePropertyDefinition[];
  jsonSchema?: JsonSchemaType;
  schema?: Schema.Schema.AnyNoContext;
}): { typename: string; jsonSchema: JsonSchemaType } => {
  if (typename && properties) {
    const schema = getSchemaFromPropertyDefinitions(typename, properties);
    return { typename: schema.typename, jsonSchema: schema.jsonSchema };
  } else if (schema) {
    return { typename: getTypename(schema)!, jsonSchema: toJsonSchema(schema) };
  } else if (typename && jsonSchema) {
    return { typename, jsonSchema };
  } else {
    throw new Error('invalid properties');
  }
};

export const makeDynamicTable = ({
  jsonSchema,
  properties,
}: {
  jsonSchema: JsonSchemaType;
  properties?: TablePropertyDefinition[];
}): { projection: ProjectionModel; view: View.View } => {
  const table = Obj.make(Table.Table, { sizes: {} });
  const view = View.make({
    query: Query.select(Filter.everything()),
    jsonSchema,
    presentation: table,
    ...(properties && { fields: properties.map((property) => property.name) }),
  });

  const projection = new ProjectionModel(jsonSchema, view.projection);
  projection.normalizeView();
  if (properties && projection.fields) {
    setProperties(view, projection, table, properties);
  }

  return { projection, view };
};

const setProperties = (
  view: View.View,
  projection: ProjectionModel,
  table: Table.Table,
  properties: TablePropertyDefinition[],
) => {
  for (const property of properties) {
    const field = projection.fields.find((field) => field.path === property.name);
    if (field) {
      if (property.size !== undefined) {
        table.sizes[field.path] = property.size;
      }

      if (property.title !== undefined) {
        const fieldProjection = projection.getFieldProjection(field.id);
        projection.setFieldProjection({
          ...fieldProjection,
          props: { ...fieldProjection.props, title: property.title },
        });
      }

      if (property.sort) {
        const fieldId = field.id;
        view.sort = [{ fieldId, direction: property.sort }];
      }
    }
  }
};

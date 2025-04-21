//
// Copyright 2025 DXOS.org
//

import type { BaseSchema, JsonSchemaType, SortDirectionType } from '@dxos/echo-schema';
import { create, makeRef } from '@dxos/live-object';
import {
  createView,
  getSchemaFromPropertyDefinitions,
  ViewProjection,
  type ViewType,
  type SchemaPropertyDefinition,
} from '@dxos/schema';

import { TableType } from '../types';

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
export const getBaseSchems = ({
  typename,
  properties,
  jsonSchema,
  schema,
}: {
  typename?: string;
  properties?: TablePropertyDefinition[];
  jsonSchema?: JsonSchemaType;
  schema?: BaseSchema;
}): { typename: string; jsonSchema: JsonSchemaType } => {
  if (typename && properties) {
    const schema = getSchemaFromPropertyDefinitions(typename, properties);
    return { typename: schema.typename, jsonSchema: schema.jsonSchema };
  } else if (schema) {
    return { typename: schema.typename, jsonSchema: schema.jsonSchema };
  } else if (typename && jsonSchema) {
    return { typename, jsonSchema };
  } else {
    throw new Error('invalid properties');
  }
};

export const makeDynamicTable = ({
  typename,
  jsonSchema,
  properties,
}: {
  typename: string;
  jsonSchema: JsonSchemaType;
  properties?: TablePropertyDefinition[];
}): { table: TableType; projection: ViewProjection } => {
  const view = createView({
    name: 'dynamic-table',
    typename,
    jsonSchema,
    ...(properties && { fields: properties.map((property) => property.name) }),
  });

  const table = create(TableType, { name: 'dynamic-table', view: makeRef(view) });
  const projection = new ViewProjection(jsonSchema, view);
  if (properties && view.fields) {
    setProperties(view, projection, properties);
  }

  return {
    table,
    projection,
  };
};

const setProperties = (view: ViewType, projection: ViewProjection, properties: TablePropertyDefinition[]) => {
  for (const property of properties) {
    const field = view.fields.find((field) => field.path === property.name);
    if (field) {
      if (property.size !== undefined) {
        field.size = property.size;
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
        view.query.sort = [{ fieldId, direction: property.sort }];
      }
    }
  }
};

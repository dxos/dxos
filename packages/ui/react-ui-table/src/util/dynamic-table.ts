//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';

import { Obj, Ref } from '@dxos/echo';
import { getTypename, toJsonSchema } from '@dxos/echo-schema';
import type { JsonSchemaType, SortDirectionType } from '@dxos/echo-schema';
import {
  createProjection,
  getSchemaFromPropertyDefinitions,
  type Projection,
  ProjectionManager,
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
  typename,
  jsonSchema,
  properties,
}: {
  typename: string;
  jsonSchema: JsonSchemaType;
  properties?: TablePropertyDefinition[];
}): { table: TableType; projection: ProjectionManager } => {
  const projection = createProjection({
    name: 'dynamic-table',
    typename,
    jsonSchema,
    ...(properties && { fields: properties.map((property) => property.name) }),
  });

  const table = Obj.make(TableType, { name: 'dynamic-table', view: Ref.make(projection) });
  const manager = new ProjectionManager(jsonSchema, projection);
  if (properties && projection.fields) {
    setProperties(projection, manager, properties);
  }

  return {
    table,
    projection: manager,
  };
};

const setProperties = (projection: Projection, manager: ProjectionManager, properties: TablePropertyDefinition[]) => {
  for (const property of properties) {
    const field = projection.fields.find((field) => field.path === property.name);
    if (field) {
      if (property.size !== undefined) {
        field.size = property.size;
      }

      if (property.title !== undefined) {
        const fieldProjection = manager.getFieldProjection(field.id);
        manager.setFieldProjection({
          ...fieldProjection,
          props: { ...fieldProjection.props, title: property.title },
        });
      }

      if (property.sort) {
        const fieldId = field.id;
        projection.query.sort = [{ fieldId, direction: property.sort }];
      }
    }
  }
};

//
// Copyright 2025 DXOS.org
//

import { Filter, type JsonSchema, Obj, Order, Query, type QueryAST, Ref, Type } from '@dxos/echo';
import { ProjectionModel, type SchemaPropertyDefinition, View, getSchemaFromPropertyDefinitions } from '@dxos/schema';

import { Table } from '../types';

// TODO(ZaymonFC): Upstream these extra fields to SchemaPropertyDefinition to enhance schema-tools schema creation.
type PropertyDisplayProps = {
  size: number;
  title: string;
  sort: QueryAST.OrderDirection;
};

export type TablePropertyDefinition = SchemaPropertyDefinition & Partial<PropertyDisplayProps>;

/**
 * @deprecated
 */
// TODO(burdon): Remove variance.
export const getBaseSchema = ({
  schema,
  typename,
  properties,
  jsonSchema,
}: {
  schema?: Type.Entity.Any;
  typename?: string;
  properties?: TablePropertyDefinition[];
  jsonSchema?: JsonSchema.JsonSchema;
}): { typename: string; jsonSchema: JsonSchema.JsonSchema } => {
  if (typename && properties) {
    const schema = getSchemaFromPropertyDefinitions(typename, properties);
    return { typename: schema.typename, jsonSchema: schema.jsonSchema };
  } else if (schema) {
    return { typename: Type.getTypename(schema)!, jsonSchema: Type.toJsonSchema(schema) };
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
  jsonSchema: JsonSchema.JsonSchema;
  properties?: TablePropertyDefinition[];
}): { projection: ProjectionModel; object: Table.Table } => {
  const view = View.make({
    query: Query.select(Filter.everything()),
    jsonSchema,
    ...(properties && { fields: properties.map((property) => property.name) }),
  });
  const object = Obj.make(Table.Table, { view: Ref.make(view), sizes: {} });

  const projection = new ProjectionModel(jsonSchema, view.projection);
  projection.normalizeView();
  if (properties && projection.fields) {
    setProperties(view, projection, object, properties);
  }

  return { projection, object };
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
        // Apply sort to query instead of deprecated view.sort
        const currentQuery = Query.fromAst(Obj.getSnapshot(view).query.ast);
        // Use any type parameter since we're working with dynamic field paths
        const newQuery = currentQuery.orderBy(Order.property<any>(field.path as string, property.sort));
        view.query.ast = newQuery.ast;
      }
    }
  }
};

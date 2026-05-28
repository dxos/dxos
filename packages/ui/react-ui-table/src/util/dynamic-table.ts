//
// Copyright 2025 DXOS.org
//

import { type Registry } from '@effect-atom/atom-react';
import type * as Types from 'effect/Types';

import { Filter, JsonSchema, Obj, Order, Query, type QueryAST, Ref, Type, type View } from '@dxos/echo';
import {
  ProjectionModel,
  type SchemaPropertyDefinition,
  ViewModel,
  getSchemaFromPropertyDefinitions,
} from '@dxos/schema';

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
  schema?: Type.AnyEntity;
  typename?: string;
  properties?: TablePropertyDefinition[];
  jsonSchema?: Types.DeepMutable<JsonSchema.JsonSchema>;
}): { typename: string; jsonSchema: Types.DeepMutable<JsonSchema.JsonSchema> } => {
  if (typename && properties) {
    const type = getSchemaFromPropertyDefinitions(typename, properties);
    // `getSchemaFromPropertyDefinitions` is always called with a typename, so
    // the returned Type entity always carries one (the optionality on Type.Type
    // covers anonymous drafts which this codepath doesn't produce).
    // Snapshot through toJsonSchema — type.jsonSchema is ECHO-backed and can't be mutated directly.
    return {
      typename: Type.getTypename(type),
      jsonSchema: JsonSchema.toJsonSchema(Type.getSchema(type)) as Types.DeepMutable<JsonSchema.JsonSchema>,
    };
  } else if (schema) {
    return {
      typename: Type.getTypename(schema)!,
      jsonSchema: JsonSchema.toJsonSchema(Type.getSchema(schema)) as Types.DeepMutable<JsonSchema.JsonSchema>,
    };
  } else if (typename && jsonSchema) {
    return { typename, jsonSchema };
  } else {
    throw new Error('invalid properties');
  }
};

export const makeDynamicTable = ({
  registry,
  jsonSchema,
  properties,
}: {
  registry: Registry.Registry;
  jsonSchema: Types.DeepMutable<JsonSchema.JsonSchema>;
  properties?: TablePropertyDefinition[];
}): { projection: ProjectionModel; object: Table.Table } => {
  const view = ViewModel.make({
    query: Query.select(Filter.everything()),
    jsonSchema,
    ...(properties && { fields: properties.map((property) => property.name) }),
  });
  const object = Obj.make(Table.Table, { view: Ref.make(view), sizes: {} });

  // `view` is ECHO-backed so projection mutations must run inside Obj.update.
  // `jsonSchema` is a plain JS object (not a Type entity), so schema mutations are direct.
  const projection = new ProjectionModel({
    registry,
    view,
    baseSchema: jsonSchema,
    change: {
      projection: (mutate) => Obj.update(view, (view) => mutate(view.projection)),
      schema: (mutate) => mutate(jsonSchema),
    },
  });
  projection.normalizeView();
  if (properties && projection.getFields()) {
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
    const field = projection.getFields().find((field) => field.path === property.name);
    if (field) {
      if (property.size !== undefined) {
        Obj.update(table, (table) => {
          table.sizes[field.path] = property.size!;
        });
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
        Obj.update(view, (view) => {
          // Type assertion needed because Query AST types have some variance issues.
          view.query.ast = newQuery.ast as typeof view.query.ast;
        });
      }
    }
  }
};

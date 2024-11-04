//
// Copyright 2024 DXOS.org
//

import {
  create,
  JsonPath,
  type JSONSchema,
  JsonSchemaType,
  type ReactiveObject,
  QueryType,
  TypedObject,
} from '@dxos/echo-schema';
import { S } from '@dxos/effect';

/**
 * Stored field metadata (e.g., for UX).
 */
export const FieldSchema = S.mutable(
  S.Struct({
    // TODO(burdon): Property or path?
    property: S.String,
    visible: S.optional(S.Boolean),
    size: S.optional(S.Number),
    referenceProperty: S.optional(JsonPath),
  }),
);

export type FieldType = S.Schema.Type<typeof FieldSchema>;

/**
 * Views are generated or user-defined projections of a schema's properties.
 * They are used to configure the visual representation of the data.
 * The query is separate from the view (queries configure the projection of data objects).
 */
export class ViewType extends TypedObject({
  typename: 'dxos.org/type/View',
  version: '0.1.0',
})({
  /**
   * Query used to retrieve data.
   * This includes the base type that the view schema (above) references.
   * It may include predicates that represent a persistent "drill-down" query.
   */
  query: QueryType,

  /**
   * Optional schema override used to customize the underlying schema.
   */
  schema: S.optional(JsonSchemaType),

  /**
   * UX metadata associated with displayed fields (in table, form, etc.)
   */
  fields: S.mutable(S.Array(FieldSchema)),

  // TODO(burdon): Readonly flag?
  // TODO(burdon): Add array of sort orders (which might be tuples).
}) {}

type CreateViewProps = {
  typename: string;
  jsonSchema?: JSONSchema.JsonSchema7Object;
};

/**
 * Create view from existing schema.
 */
// TODO(burdon): What is the minimal type that can be passed here that included TypedObjects (i.e., AbstractSchema).
export const createView = ({ typename, jsonSchema }: CreateViewProps): ReactiveObject<ViewType> => {
  return create(ViewType, {
    // schema: jsonSchema,
    query: {
      __typename: typename,
    },
    // Create initial fields.
    fields: Object.keys(jsonSchema?.properties ?? []).map((property) => create(FieldSchema, { property })),
  });
};

//
// Copyright 2024 DXOS.org
//

import { create, JsonProp, JsonSchemaType, QueryType, type ReactiveObject, S, TypedObject } from '@dxos/echo-schema';

/**
 * Stored field metadata (e.g., for UX).
 */
export const FieldSchema = S.Struct({
  // TODO(burdon): We should add a fieldId distinct from the property since in principle we might have
  //  multiple columns for the same property with different formats (e.g., date rendered as YY-MM-HH and relative).
  // TODO(burdon): Standardize use of `field` and `property` (i,e., remove `columnId`).
  property: JsonProp,
  visible: S.optional(S.Boolean),
  size: S.optional(S.Number),
  referenceProperty: S.optional(JsonProp),
}).pipe(S.mutable);

export type FieldType = S.Schema.Type<typeof FieldSchema>;

/**
 * Views are generated or user-defined projections of a schema's properties.
 * They are used to configure the visual representation of the data.
 * The query is separate from the view (queries configure the projection of data objects).
 *
 * [Table] => [View] => [Schema]:[JsonSchema]
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
  jsonSchema?: JsonSchemaType;
  properties?: string[];
};

/**
 * Create view from existing schema.
 */
// TODO(burdon): What is the minimal type that can be passed here that included TypedObjects (i.e., AbstractSchema).
export const createView = ({
  typename,
  jsonSchema,
  properties: _properties,
}: CreateViewProps): ReactiveObject<ViewType> => {
  const properties = _properties ?? Object.keys(jsonSchema?.properties ?? []).filter((p) => p !== 'id');
  return create(ViewType, {
    // schema: jsonSchema,
    query: {
      __typename: typename,
    },
    // Create initial fields.
    fields: properties.map((property) => ({ property: property as JsonProp })),
  });
};

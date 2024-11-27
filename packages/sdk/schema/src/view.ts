//
// Copyright 2024 DXOS.org
//

import {
  AST,
  FieldLookupAnnotationId,
  create,
  JsonPath,
  JsonSchemaType,
  QueryType,
  type ReactiveObject,
  S,
  toEffectSchema,
  TypedObject,
  FormatEnum,
} from '@dxos/echo-schema';
import { findAnnotation } from '@dxos/effect';
import { stripUndefinedValues } from '@dxos/util';

import { createFieldId } from './projection';
import { getSchemaProperties } from './properties';

/**
 * Stored field metadata (e.g., for UX).
 */
export const FieldSchema = S.Struct({
  id: S.String,
  path: JsonPath,
  visible: S.optional(S.Boolean),
  size: S.optional(S.Number),
  referencePath: S.optional(JsonPath),
}).pipe(S.mutable);

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
   * Human readable name.
   */
  name: S.String.annotations({
    [AST.TitleAnnotationId]: 'Name',
    [AST.ExamplesAnnotationId]: ['Contact'],
  }),

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
  name: string;
  typename: string;
  jsonSchema?: JsonSchemaType;
  fields?: string[];
};

/**
 * Create view from existing schema.
 */
export const createView = ({
  name,
  typename,
  jsonSchema,
  fields: include,
}: CreateViewProps): ReactiveObject<ViewType> => {
  const fields: FieldType[] = [];
  if (jsonSchema) {
    const schema = toEffectSchema(jsonSchema);
    for (const property of getSchemaProperties(schema.ast)) {
      // TODO(burdon): Create fields in order specified by fields property.
      if (include && !include.includes(property.name)) {
        continue;
      }

      const referencePath =
        property.format === FormatEnum.Ref
          ? findAnnotation<JsonPath>(property.ast, FieldLookupAnnotationId)
          : undefined;

      fields.push(
        stripUndefinedValues({
          id: createFieldId(),
          path: property.name as JsonPath,
          referencePath,
        }),
      );
    }
  }

  return create(ViewType, {
    name,
    query: {
      typename,
    },
    fields,
  });
};

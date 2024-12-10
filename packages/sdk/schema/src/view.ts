//
// Copyright 2024 DXOS.org
//

import {
  AST,
  FieldLookupAnnotationId,
  FormatEnum,
  JsonPath,
  JsonSchemaType,
  QueryType,
  S,
  toEffectSchema,
  TypedObject,
} from '@dxos/echo-schema';
import { findAnnotation } from '@dxos/effect';
import { create, type ReactiveObject } from '@dxos/live-object';
import { stripUndefinedValues } from '@dxos/util';

import { createFieldId } from './projection';
import { getSchemaProperties } from './properties';

/**
 * Stored field metadata (e.g., for UX).
 */
// TODO(burdon): Reconcile with BasePropertySchema (format.ts).
export const FieldSchema = S.Struct({
  id: S.String,
  path: JsonPath,
  hidden: S.optional(S.Boolean),
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
    // TODO(burdon): Property order is lost.
    const schema = toEffectSchema(jsonSchema);
    for (const { ast, type, name, format } of getSchemaProperties(schema.ast)) {
      if (include && !include.includes(name)) {
        continue;
      }

      // TODO(burdon): Hide objects (e.g., address) by default to prevent tables from breaking.
      const hidden = type === 'object' ? true : undefined;

      const referencePath =
        format === FormatEnum.Ref ? findAnnotation<JsonPath>(ast, FieldLookupAnnotationId) : undefined;

      fields.push(
        stripUndefinedValues<FieldType>({
          id: createFieldId(),
          path: name as JsonPath,
          hidden,
          referencePath,
        }),
      );
    }
  }

  // Sort fields to match the order in the params.
  if (include) {
    fields.sort((a, b) => {
      const indexA = include.indexOf(a.path);
      const indexB = include.indexOf(b.path);
      return indexA - indexB;
    });
  }

  return create(ViewType, {
    name,
    query: {
      typename,
    },
    fields,
  });
};

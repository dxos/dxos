//
// Copyright 2024 DXOS.org
//

import { defineObjectMigration } from '@dxos/echo-db';
import {
  AST,
  FieldLookupAnnotationId,
  FormatEnum,
  JsonPath,
  JsonSchemaType,
  QueryType,
  FieldSortType,
  S,
  toEffectSchema,
  TypedObject,
} from '@dxos/echo-schema';
import { findAnnotation } from '@dxos/effect';
import { create, type ReactiveObject } from '@dxos/live-object';
import { stripUndefined } from '@dxos/util';

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
  version: '0.2.0',
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

  /**
   * Array of fields that are part of the view's schema but hidden from UI display.
   * These fields follow the FieldSchema structure but are marked for exclusion from visual rendering.
   */
  hiddenFields: S.optional(S.mutable(S.Array(FieldSchema))),

  /**
   * Additional metadata for the view.
   */
  metadata: S.optional(S.Record({ key: S.String, value: S.Any }).pipe(S.mutable)),

  // TODO(burdon): Readonly flag?
  // TODO(burdon): Add array of sort orders (which might be tuples).
}) {}

// TODO(wittjosiah): Refactor to organize better previous versions + migrations.
export class ViewTypeV1 extends TypedObject({
  typename: 'dxos.org/type/View',
  version: '0.1.0',
})({
  name: S.String.annotations({
    [AST.TitleAnnotationId]: 'Name',
    [AST.ExamplesAnnotationId]: ['Contact'],
  }),
  query: S.Struct({
    type: S.optional(S.String),
    sort: S.optional(S.Array(FieldSortType)),
  }).pipe(S.mutable),
  schema: S.optional(JsonSchemaType),
  fields: S.mutable(S.Array(FieldSchema)),
  metadata: S.optional(S.Record({ key: S.String, value: S.Any }).pipe(S.mutable)),
}) {}

export const ViewTypeV1ToV2 = defineObjectMigration({
  from: ViewTypeV1,
  to: ViewType,
  transform: async (from) => {
    return { ...from, query: { typename: from.query.type } };
  },
  onMigration: async () => {},
});

type CreateViewProps = {
  name: string;
  typename?: string;
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
    const properties = getSchemaProperties(schema.ast, {}, include !== undefined);
    for (const property of properties) {
      if (include && !include.includes(property.name)) {
        continue;
      }

      const referencePath =
        property.format === FormatEnum.Ref
          ? findAnnotation<JsonPath>(property.ast, FieldLookupAnnotationId)
          : undefined;

      fields.push(
        stripUndefined({
          id: createFieldId(),
          path: property.name as JsonPath,
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
    query: { typename },
    fields,
  });
};

//
// Copyright 2024 DXOS.org
//

import { Schema, SchemaAST } from 'effect';

import { Type } from '@dxos/echo';
import { defineObjectMigration } from '@dxos/echo-db';
import {
  FieldSortType,
  FormatEnum,
  JsonPath,
  JsonSchemaType,
  type PropertyMetaAnnotation,
  PropertyMetaAnnotationId,
  QueryType,
  StoredSchema,
  TypedObject,
  toEffectSchema,
} from '@dxos/echo-schema';
import { findAnnotation } from '@dxos/effect';
import { live, type Live } from '@dxos/live-object';
import { stripUndefined } from '@dxos/util';

import { createFieldId } from './projection';
import { getSchemaProperties } from './properties';

/**
 * Stored field metadata (e.g., for UX).
 */
export const FieldSchema = Schema.Struct({
  id: Schema.String,
  path: JsonPath,
  visible: Schema.optional(Schema.Boolean),
  size: Schema.optional(Schema.Number),
  referencePath: Schema.optional(JsonPath),
}).pipe(Schema.mutable);

export type FieldType = Schema.Schema.Type<typeof FieldSchema>;

const KeyValueProps = Schema.Record({ key: Schema.String, value: Schema.Any });

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
  name: Schema.String.annotations({
    title: 'Name',
    [SchemaAST.ExamplesAnnotationId]: ['Contact'],
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
  schema: Schema.optional(JsonSchemaType),

  /**
   * UX metadata associated with displayed fields (in table, form, etc.)
   */
  fields: Schema.mutable(Schema.Array(FieldSchema)),

  /**
   * Array of fields that are part of the view's schema but hidden from UI display.
   * These fields follow the FieldSchema structure but are marked for exclusion from visual rendering.
   */
  hiddenFields: Schema.optional(Schema.mutable(Schema.Array(FieldSchema))),

  /**
   * Additional metadata for the view.
   */
  metadata: Schema.optional(KeyValueProps.pipe(Schema.mutable)),

  // TODO(burdon): Readonly flag?
  // TODO(burdon): Add array of sort orders (which might be tuples).
}) {}

// TODO(wittjosiah): Refactor to organize better previous versions + migrations.
export class ViewTypeV1 extends TypedObject({
  typename: 'dxos.org/type/View',
  version: '0.1.0',
})({
  name: Schema.String.annotations({
    title: 'Name',
    [SchemaAST.ExamplesAnnotationId]: ['Contact'],
  }),
  query: Schema.Struct({
    type: Schema.optional(Schema.String),
    sort: Schema.optional(Schema.Array(FieldSortType)),
  }).pipe(Schema.mutable),
  schema: Schema.optional(JsonSchemaType),
  fields: Schema.mutable(Schema.Array(FieldSchema)),
  metadata: Schema.optional(KeyValueProps.pipe(Schema.mutable)),
}) {}

export const ViewTypeV1ToV2 = defineObjectMigration({
  from: ViewTypeV1,
  to: ViewType,
  transform: async (from) => {
    return {
      ...from,
      query: {
        typename: from.query.type,
      },
    };
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
export const createView = ({ name, typename, jsonSchema, fields: include }: CreateViewProps): Live<ViewType> => {
  const fields: FieldType[] = [];
  if (jsonSchema) {
    const schema = toEffectSchema(jsonSchema);
    const shouldIncludeId = include?.find((field) => field === 'id') !== undefined;
    const properties = getSchemaProperties(schema.ast, {}, shouldIncludeId);
    for (const property of properties) {
      if (include && !include.includes(property.name)) {
        continue;
      }

      const referencePath =
        property.format === FormatEnum.Ref
          ? (findAnnotation<PropertyMetaAnnotation>(property.ast, PropertyMetaAnnotationId)
              ?.referenceProperty as JsonPath)
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

  return live(ViewType, {
    name,
    query: {
      typename,
    },
    fields,
  });
};

export const HasViewSchema = Schema.Struct({});

export const HasView = HasViewSchema.pipe(
  Type.Relation({
    typename: 'dxos.org/type/HasView',
    version: '0.1.0',
    source: StoredSchema,
    target: ViewType,
  }),
);

export interface HasView extends Schema.Schema.Type<typeof HasView> {}

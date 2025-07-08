//
// Copyright 2025 DXOS.org
//

import { Schema, SchemaAST } from 'effect';

import { Obj, Type } from '@dxos/echo';
import {
  FormatEnum,
  JsonSchemaType,
  QueryType,
  toEffectSchema,
  type PropertyMetaAnnotation,
  PropertyMetaAnnotationId,
} from '@dxos/echo-schema';
import { findAnnotation, type JsonPath } from '@dxos/effect';
import { PublicKey } from '@dxos/keys';
import { type Live } from '@dxos/live-object';
import { stripUndefined } from '@dxos/util';

import { FieldSchema, type FieldType, KeyValueProps } from './field';
import { getSchemaProperties } from '../properties';

/**
 * Projections are generated or user-defined projections of a schema's properties.
 * They are used to configure the visual representation of the data.
 * The query is separate from the projection (queries configure the projection of data objects).
 */
export const Projection = Schema.Struct({
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
}).pipe(Type.Obj({ typename: 'dxos.org/type/Projection', version: '0.1.0' }));
export type Projection = Schema.Schema.Type<typeof Projection>;

export const createFieldId = () => PublicKey.random().truncate();

type CreateViewProps = {
  name: string;
  typename?: string;
  jsonSchema?: JsonSchemaType;
  fields?: string[];
};

/**
 * Create view from existing schema.
 */
export const createProjection = ({
  name,
  typename,
  jsonSchema,
  fields: include,
}: CreateViewProps): Live<Projection> => {
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

  return Obj.make(Projection, {
    name,
    query: {
      typename,
    },
    fields,
  });
};

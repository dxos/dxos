//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Obj, Ref, Type } from '@dxos/echo';
import {
  FormatEnum,
  JsonSchemaType,
  type PropertyMetaAnnotation,
  PropertyMetaAnnotationId,
  QueryType,
  toEffectSchema,
} from '@dxos/echo-schema';
import { findAnnotation, type JsonPath } from '@dxos/effect';
import { PublicKey } from '@dxos/keys';
import { type Live } from '@dxos/live-object';
import { stripUndefined } from '@dxos/util';

import { FieldSchema, type FieldType } from './field';
import { getSchemaProperties } from '../properties';

export const Projection = Schema.Struct({
  /**
   * Optional schema override used to customize the underlying schema.
   */
  schema: Schema.optional(JsonSchemaType),

  /**
   * UX metadata associated with displayed fields (in table, form, etc.)
   */
  // TODO(wittjosiah): Should this just be an array of JsonPath?
  fields: Schema.mutable(Schema.Array(FieldSchema)),

  /**
   * Array of fields that are part of the view's schema but hidden from UI display.
   * These fields follow the FieldSchema structure but are marked for exclusion from visual rendering.
   */
  // TODO(wittjosiah): Remove? This can be easily derived from fields.
  hiddenFields: Schema.optional(Schema.mutable(Schema.Array(FieldSchema))),
}).pipe(Schema.mutable);
export type Projection = Schema.Schema.Type<typeof Projection>;

/**
 * Views are generated or user-defined projections of a schema's properties.
 * They are used to configure the visual representation of the data.
 */
export const View = Schema.Struct({
  /**
   * Query used to retrieve data.
   * This includes the base type that the view schema (above) references.
   * It may include predicates that represent a persistent "drill-down" query.
   */
  query: QueryType,

  /**
   * Projection of the data returned from the query.
   */
  projection: Projection,

  /**
   * Reference to the custom view object which is used to store data specific to rendering.
   */
  presentation: Type.Ref(Type.Expando),

  // TODO(burdon): Should this be part of the presentation object (e.g., Table/Kanban).

  /**
   * Optional metadata associated with the projection.
   */
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
}).pipe(Type.Obj({ typename: 'dxos.org/type/View', version: '0.3.0' }));
export type View = Schema.Schema.Type<typeof View>;

export const createFieldId = () => PublicKey.random().truncate();

type CreateViewProps = {
  typename: string;
  jsonSchema: JsonSchemaType;
  presentation: Obj.Any;
  fields?: string[];
};

/**
 * Create projection from existing schema.
 */
export const createView = ({ typename, jsonSchema, presentation, fields: include }: CreateViewProps): Live<View> => {
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

  return Obj.make(View, {
    query: {
      typename,
    },
    projection: {
      schema: jsonSchema,
      fields,
    },
    presentation: Ref.make(presentation),
  });
};

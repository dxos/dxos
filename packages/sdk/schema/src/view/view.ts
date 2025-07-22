//
// Copyright 2025 DXOS.org
//

import { Schema, SchemaAST } from 'effect';

import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Obj, Ref, Type } from '@dxos/echo';
import {
  FormatAnnotation,
  FormatEnum,
  JsonSchemaType,
  LabelAnnotation,
  type PropertyMetaAnnotation,
  PropertyMetaAnnotationId,
  QueryType,
  toEffectSchema,
  TypedObject,
} from '@dxos/echo-schema';
import { findAnnotation, type JsonPath } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { live, type Live } from '@dxos/live-object';
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
   * Name of the view.
   */
  name: Schema.optional(
    Schema.String.annotations({
      title: 'Name',
      [SchemaAST.ExamplesAnnotationId]: ['Contact'],
    }),
  ),

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
})
  .pipe(LabelAnnotation.set(['name']))
  .pipe(Type.Obj({ typename: 'dxos.org/type/View', version: '0.3.0' }));
export type View = Schema.Schema.Type<typeof View>;

export const createFieldId = () => PublicKey.random().truncate();

type CreateViewProps = {
  name?: string;
  typename: string;
  jsonSchema: JsonSchemaType; // Base schema.
  overrideSchema?: JsonSchemaType; // Override schema.
  presentation: Obj.Any;
  fields?: string[];
};

/**
 * Create view from provided schema.
 */
export const createView = ({
  name,
  typename,
  jsonSchema,
  overrideSchema,
  presentation,
  fields: include,
}: CreateViewProps): Live<View> => {
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
    name,
    query: {
      typename,
    },
    projection: {
      schema: overrideSchema,
      fields,
    },
    presentation: Ref.make(presentation),
  });
};

export type CreateViewFromSpaceProps = {
  client?: Client;
  space: Space;
  name?: string;
  typename?: string;
  presentation: Obj.Any;
  fields?: string[];
  createInitial?: number;
};

/**
 * Create view from a schema in provided space or client.
 */
export const createViewFromSpace = async ({
  client,
  space,
  name,
  typename,
  presentation,
  fields,
  createInitial = 1,
}: CreateViewFromSpaceProps): Promise<{ jsonSchema: JsonSchemaType; view: View }> => {
  if (!typename) {
    const [schema] = await space.db.schemaRegistry.register([createDefaultSchema()]);
    typename = schema.typename;
  } else {
    createInitial = 0;
  }

  const staticSchema = client?.graph.schemaRegistry.schemas.find((schema) => Type.getTypename(schema) === typename);
  const dynamicSchema = await space.db.schemaRegistry.query({ typename }).firstOrUndefined();
  const jsonSchema = staticSchema ? Type.toJsonSchema(staticSchema) : dynamicSchema?.jsonSchema;
  invariant(jsonSchema, `Schema not found: ${typename}`);
  const schema = staticSchema ?? dynamicSchema;
  invariant(schema, `Schema not found: ${typename}`);

  Array.from({ length: createInitial }).forEach(() => {
    space.db.add(live(schema, {}));
  });

  return {
    jsonSchema,
    view: createView({ name, typename, jsonSchema, presentation, fields }),
  };
};

export const createDefaultSchema = () =>
  TypedObject({
    typename: `example.com/type/${PublicKey.random().truncate()}`,
    version: '0.1.0',
  })({
    title: Schema.optional(Schema.String).annotations({ title: 'Title' }),
    status: Schema.optional(
      Schema.Literal('todo', 'in-progress', 'done')
        .pipe(FormatAnnotation.set(FormatEnum.SingleSelect))
        .annotations({
          title: 'Status',
          [PropertyMetaAnnotationId]: {
            singleSelect: {
              options: [
                { id: 'todo', title: 'Todo', color: 'indigo' },
                { id: 'in-progress', title: 'In Progress', color: 'purple' },
                { id: 'done', title: 'Done', color: 'amber' },
              ],
            },
          },
        }),
    ),
    description: Schema.optional(Schema.String).annotations({ title: 'Description' }),
  });

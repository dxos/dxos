//
// Copyright 2024 DXOS.org
//

import { JsonPath, JsonSchemaType, QueryType } from '@dxos/echo-schema';
import { S } from '@dxos/effect';

import { FieldKind, FieldKindEnum } from './annotations';

// TODO(burdon): Pattern for error IDs (i.e., don't put user-facing messages in the annotation).
export const PathSchema = S.String.pipe(
  S.nonEmptyString({ message: () => 'Property is required.' }),
  S.pattern(/^[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*$/, { message: () => 'Invalid property path.' }),
);

/**
 * Stored field metadata (e.g., for UX).
 */
export const FieldSchema = S.mutable(
  S.Struct({
    path: PathSchema,
    visible: S.optional(S.Boolean),
    size: S.optional(S.Number),
    referenceProperty: S.optional(JsonPath),
  }),
);

export type FieldType = S.Schema.Type<typeof FieldSchema>;


const s = {
  org: {
    '$schema': 'http://json-schema.org/draft-07/schema#',
    '$id': 'dxn:type:example.com/type/Org',
    version: '0.1.0',
    type: 'object',
    required: [ 'name', 'id' ],
    properties: { id: { type: 'string' }, name: { type: 'string' } },
    additionalProperties: false,
  },
  person: {
    '$schema': 'http://json-schema.org/draft-07/schema#',
    '$id': 'dxn:type:example.com/type/Person',
    version: '0.1.0',
    type: 'object',
    required: [ 'name', 'email', 'org', 'id' ],
    properties: {
      id: { type: 'string' }, // TODO(burdon):

      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      org: {
        "$ref": "http://json-schema.dxos.network/ref.json",
        reference: {
          schema: {
            '$ref': 'dxn:type:example.com/type/Org', // => $id?
          },
          schemaVersion: '0.1.0',
          schemaObject: 'dnx:echo:@:xxx', // Temp.
        }
      }
    },
    additionalProperties: false,
  }
}

/**
 * Computed (aggregate) field metadata (from annotations).
 */
// TODO(burdon): IMPORTANT This should be a computed composite of Schema defined field annotations.
export const FieldPropertiesSchema = S.mutable(
  S.Struct({
    // FieldPath
    path: PathSchema,

    // FieldKind
    kind: S.Enums(FieldKindEnum),

    // AST.TitleAnnotation
    title: S.optional(S.String),
    // AST.DescriptionAnnotation
    description: S.optional(S.String),

    // TODO(burdon): S.pattern.
    // filter: S.optional(S.filter),

    // TODO(burdon): Technically known as the precision `scale`.
    digits: S.optional(S.Number.pipe(S.int(), S.nonNegative())),

    // TODO(burdon): Define types? Single type? Property on field for ux picker?
    refSchema: S.optional(S.String),
    refProperty: S.optional(S.String),
  }),
);

export type FieldPropertiesType = S.Schema.Type<typeof FieldPropertiesSchema>;

/**
 * Views are generated or user-defined projections of a schema's properties.
 * They are used to configure the visual representation of the data.
 * The query is separate from the view (queries configure the projection of data objects).
 */
export const ViewSchema = S.Struct({
  /**
   * Schema used to render the view.
   * The view may be entirely responsible for creating this schema, or it may just reference an existing schema.
   */
  schema: JsonSchemaType,

  /**
   * Query used to retrieve data.
   * This includes the base type that the view schema (above) references.
   * It may include predicates that represent a persistent "drill-down" query.
   */
  query: QueryType,

  /**
   * UX metadata associated with displayed fields (in table, form, etc.)
   */
  fields: S.mutable(S.Array(FieldSchema)),

  // TODO(burdon): Add array of sort orders (which might be tuples).
});

export type ViewType = S.Schema.Type<typeof ViewSchema>;

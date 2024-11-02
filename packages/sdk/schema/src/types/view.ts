//
// Copyright 2024 DXOS.org
//

import { JsonPath, JsonSchemaType, QueryType } from '@dxos/echo-schema';
import { S } from '@dxos/effect';

import { FieldKindEnum } from './annotations';

/**
 * Stored field metadata (e.g., for UX).
 */
export const FieldSchema = S.mutable(
  S.Struct({
    path: JsonPath,
    visible: S.optional(S.Boolean),
    size: S.optional(S.Number),
    referenceProperty: S.optional(JsonPath),
  }),
);

export type FieldType = S.Schema.Type<typeof FieldSchema>;

/**
 * Computed (aggregate) field metadata (from annotations).
 */
// TODO(burdon): Rename FieldProjectionType?
// TODO(burdon): Handle arrays?
export const FieldPropertiesSchema = S.mutable(
  S.Struct({
    // FieldPath
    path: JsonPath,

    // FieldKind
    format: S.optional(S.Enums(FieldKindEnum)),

    // TODO(burdon): ?
    referenceSchema: S.optional(S.String),

    // AST.TitleAnnotation
    title: S.optional(S.String),

    // AST.DescriptionAnnotation
    description: S.optional(S.String),

    // TODO(burdon): S.pattern.
    // filter: S.optional(S.filter),

    // TODO(burdon): Technically known as the precision `scale` or JsonSchema `multipleOf`.
    digits: S.optional(S.Number.pipe(S.int(), S.nonNegative())),
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
  // TODO(burdon): Change to MutableSchema?
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
}).pipe(S.mutable);

export type ViewType = S.Schema.Type<typeof ViewSchema>;

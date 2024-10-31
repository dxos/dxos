//
// Copyright 2024 DXOS.org
//

import { JsonSchemaType, QueryType } from '@dxos/echo-schema';
import { S } from '@dxos/effect';

// TODO(burdon): Pattern for error IDs (i.e., don't put user-facing messages in the annotation).
export const PathSchema = S.String.pipe(
  S.nonEmptyString({ message: () => 'Property is required.' }),
  S.pattern(/^[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*$/, { message: () => 'Invalid property path.' }),
);

// TODO(burdon): Rename.
// TODO(burdon): Should this have the label? Or should we use the TitleAnnotation?
export const FieldSchema = S.Struct({
  path: PathSchema,
  visible: S.optional(S.Boolean),
  width: S.optional(S.Number),
});

export type FieldType = S.Schema.Type<typeof FieldSchema>;

/**
 * Views are generated or user-defined projections of a schema's properties.
 * They are used to configure the visual representation of the data.
 * The query is separate from the view (queries configure the projection of data objects).
 */
export const ViewSchema = S.Struct({
  /**
   * Schema used to render the view.
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

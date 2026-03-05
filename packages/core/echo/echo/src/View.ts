//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { QueryAST } from '@dxos/echo-protocol';
import * as Type from './Type';

import { JsonPath } from '@dxos/effect';
import { PublicKey } from '@dxos/keys';
import { JsonSchemaType, SystemTypeAnnotation } from './internal';

/**
 * Stored field metadata (e.g., for UX).
 */
export const FieldSchema = Schema.Struct({
  id: Schema.String,
  path: JsonPath,
  visible: Schema.optional(Schema.Boolean),

  // TODO(wittjosiah): Presentation-specific?
  referencePath: Schema.optional(JsonPath),
});

export type FieldType = Schema.Schema.Type<typeof FieldSchema>;

export const KeyValueProps = Schema.Record({ key: Schema.String, value: Schema.Any });

export const createFieldId = () => PublicKey.random().truncate();

export const Projection = Schema.Struct({
  /**
   * Optional schema override used to customize the underlying schema.
   */
  schema: JsonSchemaType.pipe(Schema.optional),

  /**
   * UX metadata associated with displayed fields (in table, form, etc.)
   */
  // TODO(wittjosiah): Should this just be an array of JsonPath?
  fields: Schema.Array(FieldSchema),

  /**
   * The id for the field used to pivot the view.
   * E.g., the field to use for kanban columns or the field to use for map coordinates.
   */
  pivotFieldId: Schema.String.pipe(Schema.optional),
});

export type Projection = Schema.Schema.Type<typeof Projection>;

/**
 * Views are generated or user-defined projections of a schema's properties.
 * They are used to configure the visual representation of the data.
 */
const ViewSchema = Schema.Struct({
  /**
   * Query used to retrieve data.
   * Can be a user-provided query grammar string or a query AST.
   */
  query: Schema.Struct({
    raw: Schema.optional(Schema.String),
    ast: QueryAST.Query,
  }),

  /**
   * Projection of the data returned from the query.
   */
  projection: Projection,
}).pipe(
  Type.object({
    typename: 'dxos.org/type/View',
    version: '0.5.0',
  }),
  SystemTypeAnnotation.set(true),
);

export interface View extends Schema.Schema.Type<typeof ViewSchema> {}

/**
 * View instance type.
 */
// NOTE: This interface is explicitly defined rather than derived from the schema to avoid
//   TypeScript "cannot be named" portability errors. The schema contains QueryAST.Query which
//   references internal @dxos/echo-protocol module paths. Without this explicit interface,
//   any schema using Type.Ref(View) would inherit the non-portable type and fail to compile.
// TODO(wittjosiah): Find a better solution that doesn't require manually keeping the interface in sync.
export const View: Type.Obj<View> = ViewSchema as any;

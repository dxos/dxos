//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { QueryAST } from '@dxos/echo-protocol';
import { SchemaEx } from '@dxos/effect';
import { DXN, PublicKey } from '@dxos/keys';

import * as Annotation from './Annotation';
import * as Filter from './Filter';
import * as internal from './internal';
import * as Obj from './Obj';
import * as Query from './Query';
import * as Type from './Type';

/**
 * Stored field metadata (e.g., for UX).
 */
export const FieldSchema = Schema.Struct({
  id: Schema.String,
  path: SchemaEx.JsonPath,
  visible: Schema.optional(Schema.Boolean),

  // TODO(wittjosiah): Presentation-specific?
  referencePath: Schema.optional(SchemaEx.JsonPath),
});

export type FieldType = Schema.Schema.Type<typeof FieldSchema>;

export const KeyValueProps = Schema.Record({ key: Schema.String, value: Schema.Any });

export const createFieldId = () => PublicKey.random().truncate();

export const Projection = Schema.Struct({
  /**
   * Optional schema override used to customize the underlying schema.
   */
  schema: internal.JsonSchemaType.pipe(Schema.optional),

  /**
   * UX metadata associated with displayed fields (in table, form, etc.)
   */
  // TODO(wittjosiah): Should this just be an array of SchemaEx.JsonPath?
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
export class View extends Type.makeObject<View>(DXN.make('org.dxos.type.view', '0.1.0'))(
  Schema.Struct({
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
    internal.HiddenAnnotation.set(true),
    Annotation.IconAnnotation.set({ icon: 'ph--funnel--regular', hue: 'green' }),
  ),
) {}

export const make = (props: Partial<Obj.MakeProps<typeof View>>): Type.InstanceType<typeof View> => {
  return Obj.make(View, {
    query: { ast: Query.select(Filter.nothing()).ast },
    projection: { fields: [] },
    ...props,
  });
};

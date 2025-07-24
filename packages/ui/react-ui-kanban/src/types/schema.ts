//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';

export const KanbanView = Schema.Struct({
  /**
   * The field the values by which to pivot into columns of the kanban. This should be an enum field on the referred
   * objects, can that be enforced?
   */
  columnFieldId: Schema.optional(Schema.String),
  /**
   * Order of columns by value and cards by id, derivative of the field selected by `columnPivotField` but can that be
   * inferred here? Or is this a preference that should apply first, then kanban should continue rendering what it
   * finds regardless.
   */
  arrangement: Schema.optional(
    Schema.Array(
      Schema.Struct({
        columnValue: Schema.String,
        ids: Schema.Array(Type.ObjectId),
        hidden: Schema.optional(Schema.Boolean),
      }).pipe(Schema.mutable),
    ).pipe(Schema.mutable),
  ),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/KanbanView',
    version: '0.1.0',
  }),
);
export type KanbanView = Schema.Schema.Type<typeof KanbanView>;

export const KanbanSettingsSchema = Schema.Struct({
  columnFieldId: Schema.String.annotations({
    title: 'Column field identifier',
  }),
});

//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Ref, ObjectId, TypedObject, Expando } from '@dxos/echo-schema';
// import { ThreadType } from '@dxos/plugin-space/types';
import { DataType } from '@dxos/schema';

export const KanbanSchema = Schema.Struct({
  id: ObjectId, // TODO(burdon): Where should this be?
  name: Schema.optional(Schema.String),
  /**
   * The view to use to query for cards and render them.
   */
  cardView: Schema.optional(Ref(DataType.Projection)),
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
        ids: Schema.Array(ObjectId),
        hidden: Schema.optional(Schema.Boolean),
      }).pipe(Schema.mutable),
    ).pipe(Schema.mutable),
  ),
  // TODO(burdon): Should not import from plugin. Either factor out type or use reverse deps when supported.
  threads: Schema.optional(Schema.Array(Ref(Expando /* ThreadType */))),
});

export const KanbanSettingsSchema = Schema.Struct({
  columnFieldId: Schema.String.annotations({
    title: 'Column field identifier',
  }),
});

export class KanbanType extends TypedObject({
  typename: 'dxos.org/type/Kanban',
  version: '0.1.0',
})(KanbanSchema.fields) {}

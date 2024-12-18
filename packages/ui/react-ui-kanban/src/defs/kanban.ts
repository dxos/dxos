//
// Copyright 2024 DXOS.org
//

import { ref, ObjectId, S, TypedObject, AST } from '@dxos/echo-schema';
import { ThreadType } from '@dxos/plugin-space/types';
import { ViewType } from '@dxos/schema';

export const KanbanSchema = S.Struct({
  id: ObjectId, // TODO(burdon): Where should this be?
  name: S.optional(S.String),
  /**
   * The view to use to query for cards and render them.
   */
  cardView: S.optional(ref(ViewType)),
  /**
   * The field the values by which to pivot into columns of the kanban. This should be an enum field on the referred
   * objects, can that be enforced?
   */
  // TODO(thure): Surely this should be a JsonPath or something.
  columnField: S.optional(S.String),
  /**
   * Order of columns by value and cards by id, derivative of the field selected by `columnPivotField` but can that be
   * inferred here? Or is this a preference that should apply first, then kanban should continue rendering what it
   * finds regardless.
   */
  arrangement: S.optional(
    S.Array(S.Struct({ columnValue: S.String, ids: S.Array(ObjectId), hidden: S.optional(S.Boolean) })),
  ),
  // TODO(burdon): Should not import from plugin. Either factor out type or use reverse deps when supported.
  threads: S.optional(S.Array(ref(ThreadType))),
});

export const KanbanPropsSchema = S.Struct({
  columnField: S.String.annotations({
    [AST.TitleAnnotationId]: 'Column field',
  }),
});

export class KanbanType extends TypedObject({
  typename: 'dxos.org/type/Kanban',
  version: '0.1.0',
})(KanbanSchema.fields) {}

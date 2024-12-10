//
// Copyright 2024 DXOS.org
//

import { ref, ObjectId, S, TypedObject } from '@dxos/echo-schema';
import { ThreadType } from '@dxos/plugin-space/types';
import { ViewType, FieldSchema } from '@dxos/schema';

export const KanbanSchema = S.Struct({
  id: ObjectId, // TODO(burdon): Where should this be?
  name: S.optional(S.String),
  /**
   * The view to use to query for cards and render them.
   */
  cardView: S.optional(ref(ViewType)),
  /**
   * Manual order of cards by id.
   */
  cardOrder: S.optional(S.Array(S.String)),
  /**
   * The field the values by which to pivot into columns of the kanban. Best results when an enum type.
   */
  columnPivotField: S.optional(FieldSchema),
  /**
   * Manual order of columns by …id? …value?
   */
  columnOrder: S.optional(S.Array(S.String)),
  // TODO(burdon): Should not import from plugin. Either factor out type or use reverse deps when supported.
  threads: S.optional(S.Array(ref(ThreadType))),
});

export class KanbanType extends TypedObject({
  typename: 'dxos.org/type/Kanban',
  version: '0.1.0',
})(KanbanSchema.fields) {}

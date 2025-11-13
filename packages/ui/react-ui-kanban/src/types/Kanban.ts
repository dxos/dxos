//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { View, ViewAnnotation } from '@dxos/schema';

const KanbanSchema = Schema.Struct({
  name: Schema.optional(Schema.String),

  view: Type.Ref(View.View).pipe(FormInputAnnotation.set(false)),

  /**
   * Order of columns by value and cards by id, derivative of the field selected by `columnPivotField` but can that be
   * inferred here? Or is this a preference that should apply first, then kanban should continue rendering what it
   * finds regardless.
   */
  arrangement: Schema.Array(
    Schema.Struct({
      columnValue: Schema.String,
      ids: Schema.Array(Type.ObjectId),
      hidden: Schema.optional(Schema.Boolean),
    }).pipe(Schema.mutable),
  ).pipe(Schema.mutable, FormInputAnnotation.set(false)),

  // TODO(wittjosiah): Consider Kanban supporting not being just a view but referencing arbitrary data directly.
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Kanban',
    version: '0.2.0',
  }),
  LabelAnnotation.set(['name']),
  ViewAnnotation.set(true),
);
export interface Kanban extends Schema.Schema.Type<typeof KanbanSchema> {}
export interface KanbanEncoded extends Schema.Schema.Encoded<typeof KanbanSchema> {}
export const Kanban: Schema.Schema<Kanban, KanbanEncoded> = KanbanSchema;

type MakeProps = Omit<Partial<Obj.MakeProps<typeof Kanban>>, 'view'> & {
  view: View.View;
};

/**
 * Make a kanban as a view of a data set.
 */
export const make = ({ name, arrangement = [], view }: MakeProps): Kanban => {
  return Obj.make(Kanban, { name, view: Ref.make(view), arrangement });
};

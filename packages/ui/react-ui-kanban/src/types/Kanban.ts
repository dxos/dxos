//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Ref, Type } from '@dxos/echo';
import { FormAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { View, ViewAnnotation } from '@dxos/schema';

const KanbanSchema = Schema.Struct({
  name: Schema.optional(Schema.String),

  view: Type.Ref(View.View).pipe(FormAnnotation.set(false)),

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
  ).pipe(Schema.mutable, FormAnnotation.set(false)),

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

type MakeWithViewProps = Omit<Partial<Obj.MakeProps<typeof Kanban>>, 'view'> & {
  view: View.View;
};

/**
 * Make a kanban object.
 */
export const makeWithView = ({ view, ...props }: MakeWithViewProps): Kanban =>
  Obj.make(Kanban, { arrangement: [], view: Ref.make(view), ...props });

export const SettingsSchema = Schema.Struct({
  columnFieldId: Schema.String.annotations({
    title: 'Column field identifier',
  }),
});

type MakeProps = Partial<Omit<Obj.MakeProps<typeof Kanban>, 'view'>> & View.MakeFromSpaceProps;

/**
 * Make a kanban as a view of a data set.
 */
export const make = async ({ name, arrangement = [], ...props }: MakeProps): Promise<Kanban> => {
  const { view } = await View.makeFromSpace(props);
  return Obj.make(Kanban, { name, view: Ref.make(view), arrangement });
};

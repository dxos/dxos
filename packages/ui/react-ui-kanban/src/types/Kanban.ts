//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';
import { type JsonSchemaType } from '@dxos/echo/internal';
import { View } from '@dxos/schema';

export const Kanban = Schema.Struct({
  name: Schema.optional(Schema.String),

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
  ).pipe(Schema.mutable, Schema.optional),

  // TODO(wittjosiah): Consider Kanban supporting not being just a view but referencing arbitrary data directly.
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Kanban',
    version: '0.1.0',
  }),
  Annotation.LabelAnnotation.set(['name']),
  Annotation.ViewAnnotation.set(true),
);

export type Kanban = Schema.Schema.Type<typeof Kanban>;

/**
 * Make a kanban object.
 */
export const make = (props: Obj.MakeProps<typeof Kanban> = {}) => Obj.make(Kanban, props);

export const SettingsSchema = Schema.Struct({
  columnFieldId: Schema.String.annotations({
    title: 'Column field identifier',
  }),
});

type MakeViewProps = Omit<View.MakeFromSpaceProps, 'presentation'>;

/**
 * Make a kanban as a view of a data set.
 */
export const makeView = async (props: MakeViewProps): Promise<{ jsonSchema: JsonSchemaType; view: View.View }> => {
  const kanban = Obj.make(Kanban, {});
  return View.makeFromSpace({ ...props, presentation: kanban });
};

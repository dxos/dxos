//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

<<<<<<< HEAD
import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { View, ViewAnnotation } from '@dxos/schema';
||||||| 87517e966b
import { Obj, Type } from '@dxos/echo';
import { type JsonSchemaType, LabelAnnotation, ViewAnnotation } from '@dxos/echo/internal';
import { View } from '@dxos/schema';
=======
import { Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { View, ViewAnnotation } from '@dxos/schema';
>>>>>>> origin/main

const KanbanSchema = Schema.Struct({
  name: Schema.optional(Schema.String),

<<<<<<< HEAD
  view: Type.Ref(View.View).pipe(Annotation.FormInputAnnotation.set(false)),

||||||| 87517e966b
=======
  view: Type.Ref(View.View).pipe(FormInputAnnotation.set(false)),

>>>>>>> origin/main
  /**
   * Order of columns by value and cards by id, derivative of the field selected by `columnPivotField` but can that be
   * inferred here? Or is this a preference that should apply first, then kanban should continue rendering what it
   * finds regardless.
   */
  arrangement: Schema.Array(
    Schema.Struct({
      columnValue: Schema.String,
      ids: Schema.Array(Obj.ID),
      hidden: Schema.optional(Schema.Boolean),
    }).pipe(Schema.mutable),
<<<<<<< HEAD
  ).pipe(Schema.mutable, Annotation.FormInputAnnotation.set(false)),
||||||| 87517e966b
  ).pipe(Schema.mutable, Schema.optional),
=======
  ).pipe(Schema.mutable, FormInputAnnotation.set(false)),
>>>>>>> origin/main

  // TODO(wittjosiah): Consider Kanban supporting not being just a view but referencing arbitrary data directly.
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Kanban',
<<<<<<< HEAD
    version: '0.2.0',
||||||| 87517e966b
    version: '0.1.0',
=======
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

//
// V1
//

export const KanbanV1 = Schema.Struct({
  name: Schema.optional(Schema.String),
  arrangement: Schema.Array(
    Schema.Struct({
      columnValue: Schema.String,
      ids: Schema.Array(Type.ObjectId),
      hidden: Schema.optional(Schema.Boolean),
    }).pipe(Schema.mutable),
  ).pipe(Schema.mutable, Schema.optional),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Kanban',
    version: '0.1.0',
>>>>>>> origin/main
  }),
<<<<<<< HEAD
  Annotation.LabelAnnotation.set(['name']),
  ViewAnnotation.set(true),
||||||| 87517e966b
  LabelAnnotation.set(['name']),
  ViewAnnotation.set(true),
=======
  LabelAnnotation.set(['name']),
>>>>>>> origin/main
);
<<<<<<< HEAD

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

//
// V1
//

export const KanbanV1 = Schema.Struct({
  name: Schema.optional(Schema.String),
  arrangement: Schema.Array(
    Schema.Struct({
      columnValue: Schema.String,
      ids: Schema.Array(Obj.ID),
      hidden: Schema.optional(Schema.Boolean),
    }).pipe(Schema.mutable),
  ).pipe(Schema.mutable, Schema.optional),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Kanban',
    version: '0.1.0',
  }),
  Annotation.LabelAnnotation.set(['name']),
  ViewAnnotation.set(true),
);
||||||| 87517e966b

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
=======
>>>>>>> origin/main

//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

<<<<<<< HEAD
import { Annotation, Obj, Type } from '@dxos/echo';
||||||| 87517e966b
import { Obj, Type } from '@dxos/echo';
import { FormAnnotation, LabelAnnotation } from '@dxos/echo/internal';
=======
import { Obj, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
>>>>>>> origin/main
import { BoardLayout, defaultLayout } from '@dxos/react-ui-board';

import { meta } from '../meta';

/**
 * Board and layout.
 */
export const Board = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
<<<<<<< HEAD
  items: Type.Ref(Type.Expando).pipe(Schema.Array, Schema.mutable, Annotation.FormInputAnnotation.set(false)),
  layout: BoardLayout.pipe(Schema.mutable, Annotation.FormInputAnnotation.set(false)),
||||||| 87517e966b
  items: Type.Ref(Type.Expando).pipe(Schema.Array, Schema.mutable, FormAnnotation.set(false)),
  layout: BoardLayout.pipe(Schema.mutable, FormAnnotation.set(false)),
=======
  items: Type.Ref(Type.Expando).pipe(Schema.Array, Schema.mutable, FormInputAnnotation.set(false)),
  layout: BoardLayout.pipe(Schema.mutable, FormInputAnnotation.set(false)),
>>>>>>> origin/main
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Board',
    version: '0.1.0',
  }),
  Annotation.LabelAnnotation.set(['name']),
);

export interface Board extends Schema.Schema.Type<typeof Board> {}

export const makeBoard = (props: Partial<Obj.MakeProps<typeof Board>> = {}) =>
  Obj.make(Board, {
    items: [],
    layout: defaultLayout,
    ...props,
  });

/**
 * Create board.
 */
export class Create extends Schema.TaggedClass<Create>()(`${meta.id}/action/create`, {
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    object: Board,
  }),
}) {}

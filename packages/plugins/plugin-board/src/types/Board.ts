//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';
import { BoardLayout, defaultLayout } from '@dxos/react-ui-board';

import { meta } from '../meta';

/**
 * Board and layout.
 */
export const Board = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  items: Type.Ref(Type.Expando).pipe(Schema.Array, Schema.mutable, Annotation.FormAnnotation.set(false)),
  layout: BoardLayout.pipe(Schema.mutable, Annotation.FormAnnotation.set(false)),
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

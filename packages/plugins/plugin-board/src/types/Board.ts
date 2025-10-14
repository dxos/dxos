//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo-schema';
import { BoardLayout, defaultLayout } from '@dxos/react-ui-board';

import { meta } from '../meta';

/**
 * Board and layout.
 */
export const Board = Schema.Struct({
  name: Schema.optional(Schema.String),
  items: Schema.mutable(Schema.Array(Type.Ref(Type.Expando))),
  layout: Schema.mutable(BoardLayout),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Board',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
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

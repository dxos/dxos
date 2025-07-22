//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo-schema';
import { BoardLayout } from '@dxos/react-ui-board';

import { meta } from '../meta';

export namespace Board {
  //
  // Types
  //

  // TODO(burdon): View?
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

  //
  // Actions
  //

  export class Create extends Schema.TaggedClass<Create>()(`${meta.id}/action/create`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: Board,
    }),
  }) {}
}

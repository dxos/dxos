//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { SpaceSchema } from '@dxos/client/echo';
import { Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo-schema';
import { BoardLayout } from '@dxos/react-ui-board';

import { meta } from '../meta';

export namespace Board {
  //
  // Types
  //

  // TODO(burdon): View.
  export const Board = Schema.Struct({
    name: Schema.String,
    layout: BoardLayout,
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
      space: SpaceSchema,
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: Board,
    }),
  }) {}
}

//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/operation';

import { meta } from '../meta';

import { Game } from './Chess';

export class Create extends Schema.TaggedClass<Create>()(`${meta.id}/action/create`, {
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    pgn: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    object: Game,
  }),
}) {}

//
// Operations
//

const CHESS_OPERATION = `${meta.id}/operation`;

export namespace ChessOperation {
  export const Create = Operation.make({
    meta: { key: `${CHESS_OPERATION}/create`, name: 'Create Chess Game' },
    schema: {
      input: Schema.Struct({
        name: Schema.optional(Schema.String),
        pgn: Schema.optional(Schema.String),
      }),
      output: Schema.Struct({
        object: Game,
      }),
    },
  });
}

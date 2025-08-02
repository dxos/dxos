//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { Game } from './Chess';
import { meta } from '../meta';

export namespace ChessAction {
  export class Create extends Schema.TaggedClass<Create>()(`${meta.id}/action/create`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
      fen: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: Game,
    }),
  }) {}
}

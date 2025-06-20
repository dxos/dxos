//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { Obj } from '@dxos/echo';

import { ChessType } from './schema';
import { CHESS_PLUGIN } from '../meta';

export namespace ChessAction {
  const CHESS_ACTION = `${CHESS_PLUGIN}/action`;

  export class Create extends Schema.TaggedClass<Create>()(`${CHESS_ACTION}/create`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
      fen: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: ChessType,
    }),
  }) {}
}

export const isObject = Obj.instanceOf(ChessType);

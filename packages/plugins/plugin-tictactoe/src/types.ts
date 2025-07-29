//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';

import { meta } from './meta';

export type Player = 'X' | 'O';
export type CellValue = string | null;
export type Board = CellValue[][];

export const TicTacToeType = Schema.Struct({
  name: Schema.optional(Schema.String),
  board: Schema.mutable(Schema.Array(Schema.Array(Schema.NullOr(Schema.String)))),
  currentPlayer: Schema.String,
  winner: Schema.NullOr(Schema.String),
  gameOver: Schema.Boolean,
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/TicTacToe',
    version: '0.1.0',
  }),
);
export interface TicTacToeType extends Schema.Schema.Type<typeof TicTacToeType> {}

export namespace TicTacToeAction {
  export class Create extends Schema.TaggedClass<Create>()(`${meta.id}/action/create`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: TicTacToeType,
    }),
  }) {}
}

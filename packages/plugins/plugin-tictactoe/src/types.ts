//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { Obj } from '@dxos/echo';
import { TypedObject } from '@dxos/echo-schema';
import { ReactiveObjectSchema } from '@dxos/react-client/echo';

import { TICTACTOE_PLUGIN } from './meta';

export namespace TicTacToeAction {
  const TICTACTOE_ACTION = `${TICTACTOE_PLUGIN}/action`;

  export class Create extends Schema.TaggedClass<Create>()(`${TICTACTOE_ACTION}/create`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: ReactiveObjectSchema,
    }),
  }) {}
}

export type Player = 'X' | 'O';
export type CellValue = Player | null;
export type Board = CellValue[][];

export const isObject = (object: unknown): object is Obj.Any => {
  return Obj.isObject(object) && (object as any).type === 'tictactoe';
};

export class TicTacToeType extends TypedObject({
  typename: 'dxos.org/type/TicTacToe',
  version: '0.1.0',
})({
  name: Schema.optional(Schema.String),
  board: Schema.Array(Schema.Array(Schema.optional(Schema.String))),
  currentPlayer: Schema.String,
  winner: Schema.optional(Schema.String),
  gameOver: Schema.Boolean,
}) {}

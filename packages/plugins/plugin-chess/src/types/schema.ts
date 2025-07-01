//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';

export const MoveSchema = Schema.mutable(
  Schema.partial(
    Schema.Struct({
      source: Schema.String,
      target: Schema.String,
      piece: Schema.String,
    }),
  ),
);

export const ChessType = Schema.Struct({
  name: Schema.optional(Schema.String),
  playerWhite: Schema.String,
  playerBlack: Schema.String,
  moves: Schema.mutable(Schema.Array(Schema.String)),
  // TODO(wittjosiah): Remove. Redundant with moves.
  pgn: Schema.String,
  fen: Schema.String,
}).pipe(
  Schema.partial,
  Type.Obj({
    typename: 'dxos.org/type/Chess',
    version: '0.1.0',
  }),
);
export interface ChessType extends Schema.Schema.Type<typeof ChessType> {}

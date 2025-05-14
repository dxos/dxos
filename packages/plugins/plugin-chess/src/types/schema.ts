//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { TypedObject } from '@dxos/echo-schema';

export const MoveSchema = Schema.mutable(
  Schema.partial(
    Schema.Struct({
      source: Schema.String,
      target: Schema.String,
      piece: Schema.String,
    }),
  ),
);

export class ChessType extends TypedObject({ typename: 'dxos.org/type/Chess', version: '0.1.0' })(
  {
    name: Schema.optional(Schema.String),
    playerWhite: Schema.String,
    playerBlack: Schema.String,
    moves: Schema.mutable(Schema.Array(Schema.String)),
    // TODO(wittjosiah): Remove. Redundant with moves.
    pgn: Schema.String,
    fen: Schema.String,
  },
  { partial: true },
) {}

//
// Copyright 2024 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { ItemAnnotation } from '@dxos/schema';

export const Game = Schema.Struct({
  name: Schema.optional(Schema.String),
  players: Schema.optional(
    Schema.Struct({
      white: Schema.optional(
        Schema.String.annotations({
          description: 'DID of white player',
        }),
      ),
      black: Schema.optional(
        Schema.String.annotations({
          description: 'DID of black player',
        }),
      ),
    }).pipe(Schema.mutable),
  ),
  pgn: Schema.optional(
    Schema.String.annotations({
      description: 'Portable Game Notation.',
    }),
  ),
  fen: Schema.optional(
    Schema.String.annotations({
      description: 'Forsyth-Edwards Notation.',
    }),
  ),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Chess',
    version: '0.2.0',
  }),
  LabelAnnotation.set(['name']),
  ItemAnnotation.set(true),
);

export interface Game extends Schema.Schema.Type<typeof Game> {}

export const makeGame = ({ name, pgn, fen }: { name?: string; pgn?: string; fen?: string } = {}) => {
  const chess = new ChessJS();
  if (pgn) {
    try {
      chess.loadPgn(pgn);
    } catch {
      log.warn(pgn);
    }
  }

  return Obj.make(Game, {
    name,
    players: {},
    pgn,
    fen,
  });
};

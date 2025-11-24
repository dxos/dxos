//
// Copyright 2024 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';
import { log } from '@dxos/log';

export const Game = Schema.Struct({
  name: Schema.optional(Schema.String),
  players: Schema.Struct({
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
  }).pipe(Schema.mutable, Annotation.FormInputAnnotation.set(false), Schema.optional),
  pgn: Schema.String.annotations({
    description: 'Portable Game Notation.',
  }).pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),
  fen: Schema.String.annotations({
    description: 'Forsyth-Edwards Notation.',
  }).pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Chess',
    version: '0.2.0',
  }),
  Annotation.LabelAnnotation.set(['name']),
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

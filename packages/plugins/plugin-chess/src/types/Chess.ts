//
// Copyright 2024 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import * as Schema from 'effect/Schema';

<<<<<<< HEAD
import { Annotation, Obj, Type } from '@dxos/echo';
||||||| 87517e966b
import { Obj, Type } from '@dxos/echo';
import { FormAnnotation, LabelAnnotation } from '@dxos/echo/internal';
=======
import { Obj, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
>>>>>>> main
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
<<<<<<< HEAD
  }).pipe(Schema.mutable, Annotation.FormAnnotation.set(false), Schema.optional),
||||||| 87517e966b
  }).pipe(Schema.mutable, FormAnnotation.set(false), Schema.optional),
=======
  }).pipe(Schema.mutable, FormInputAnnotation.set(false), Schema.optional),
>>>>>>> main
  pgn: Schema.String.annotations({
    description: 'Portable Game Notation.',
<<<<<<< HEAD
  }).pipe(Annotation.FormAnnotation.set(false), Schema.optional),
||||||| 87517e966b
  }).pipe(FormAnnotation.set(false), Schema.optional),
=======
  }).pipe(FormInputAnnotation.set(false), Schema.optional),
>>>>>>> main
  fen: Schema.String.annotations({
    description: 'Forsyth-Edwards Notation.',
<<<<<<< HEAD
  }).pipe(Annotation.FormAnnotation.set(false), Schema.optional),
||||||| 87517e966b
  }).pipe(FormAnnotation.set(false), Schema.optional),
=======
  }).pipe(FormInputAnnotation.set(false), Schema.optional),
>>>>>>> main
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Chess',
    version: '0.2.0',
  }),
<<<<<<< HEAD
  Annotation.LabelAnnotation.set(['name']),
  ItemAnnotation.set(true),
||||||| 87517e966b
  LabelAnnotation.set(['name']),
  ItemAnnotation.set(true),
=======
  LabelAnnotation.set(['name']),
>>>>>>> main
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

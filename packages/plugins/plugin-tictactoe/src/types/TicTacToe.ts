//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';

export const Game = Schema.Struct({
  name: Schema.optional(Schema.String),
  players: Schema.Struct({
    x: Schema.optional(
      Schema.String.annotations({
        description: 'DID of X player.',
      }),
    ),
    o: Schema.optional(
      Schema.String.annotations({
        description: 'DID of O player.',
      }),
    ),
  }).pipe(FormInputAnnotation.set(false), Schema.optional),
  moves: Schema.Array(Schema.Number)
    .annotations({
      description: 'Ordered cell indices (0–8) of moves played. Even-indexed are X; odd-indexed are O.',
    })
    .pipe(FormInputAnnotation.set(false), Schema.optional),
}).pipe(
  Type.object({
    typename: 'dxos.org/type/TicTacToe',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
);

export interface Game extends Schema.Schema.Type<typeof Game> {}

export const make = ({ name }: { name?: string } = {}) =>
  Obj.make(Game, {
    name,
    moves: [],
    players: {},
  });

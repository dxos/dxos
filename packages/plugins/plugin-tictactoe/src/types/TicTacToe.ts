//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';

export const Level = Schema.Literal('easy', 'medium', 'hard');
export type Level = Schema.Schema.Type<typeof Level>;

export const GameStatus = Schema.Literal('playing', 'x-wins', 'o-wins', 'draw');
export type GameStatus = Schema.Schema.Type<typeof GameStatus>;

export const Game = Schema.Struct({
  name: Schema.optional(Schema.String),
  board: Schema.String.annotations({
    description: 'Flat string of length size*size; - = empty, X or O = placed.',
  }),
  moves: Schema.optional(
    Schema.String.annotations({
      description: 'Semicolon-separated move log, e.g. "X:1,1;O:0,2;X:2,0".',
    }),
  ),
  size: Schema.Number.annotations({
    description: 'Board dimension (3, 4, or 5).',
  }),
  winCondition: Schema.Number.annotations({
    description: 'Consecutive marks needed to win.',
  }),
  level: Schema.optional(
    Level.annotations({
      description: 'AI difficulty level.',
    }),
  ),
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
}).pipe(
  Type.object({
    typename: 'org.dxos.type.tictactoe',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--grid-four--regular',
    hue: 'cyan',
  }),
);

export interface Game extends Schema.Schema.Type<typeof Game> {}

export const make = ({
  name,
  size = 3,
  winCondition,
  level,
}: {
  name?: string;
  size?: number;
  winCondition?: number;
  level?: Level;
} = {}) => {
  const effectiveWinCondition = winCondition ?? size;
  const board = '-'.repeat(size * size);

  return Obj.make(Game, {
    name,
    board,
    moves: '',
    size,
    winCondition: effectiveWinCondition,
    level,
    players: {},
  });
};

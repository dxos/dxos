//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';

export const Level = Schema.Literal('easy', 'medium', 'hard');
export type Level = Schema.Schema.Type<typeof Level>;

export const GameStatus = Schema.Literal('playing', 'x-wins', 'o-wins', 'draw');
export type GameStatus = Schema.Schema.Type<typeof GameStatus>;

/**
 * Tic-Tac-Toe variant state. Referenced by the base `Game` object via `Game.variant`.
 */
export const State = Schema.Struct({
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
  level: Level.annotations({
    description: 'AI difficulty level.',
  }).pipe(FormInputAnnotation.set(false), Schema.optional),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.tictactoe.state',
    version: '0.1.0',
  }),
  Annotation.IconAnnotation.set({
    icon: 'ph--hash-straight--regular',
    hue: 'cyan',
  }),
);

export interface State extends Schema.Schema.Type<typeof State> {}

export const make = ({
  size = 3,
  winCondition,
  level,
}: {
  size?: number;
  winCondition?: number;
  level?: Level;
} = {}): State => {
  const effectiveWinCondition = winCondition ?? size;
  const board = '-'.repeat(size * size);

  return Obj.make(State, {
    board,
    moves: '',
    size,
    winCondition: effectiveWinCondition,
    level,
  });
};

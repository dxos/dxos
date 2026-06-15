//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Type } from '@dxos/echo';
import { FormInputAnnotation, HiddenAnnotation } from '@dxos/echo/Annotation';

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
  Annotation.IconAnnotation.set({ icon: 'ph--hash-straight--regular', hue: 'cyan' }),
  // Implementation detail of the unified `Game` schema (see plugin-chess/Chess.ts for the
  // same reasoning). Keeps the state out of the navtree's typed branches so an orphaned
  // state doesn't reappear after the wrapping Game is deleted.
  HiddenAnnotation.set(true),
  Type.makeObject(DXN.make('org.dxos.type.tictactoe.state', '0.1.0')),
);

export type State = Type.InstanceType<typeof State>;

/**
 * Build a fresh Tic-Tac-Toe variant state with an empty board.
 *
 * @param size Board dimension (3..5). Defaults to 3. Must be an integer in [3, 5].
 * @param winCondition Consecutive marks needed to win (1..size). Defaults to `size`.
 * @param level Optional AI difficulty; omit for human-vs-human.
 * @throws RangeError if `size` or `winCondition` is out of range.
 */
export const make = ({
  size = 3,
  winCondition,
  level,
}: {
  size?: number;
  winCondition?: number;
  level?: Level;
} = {}): State => {
  if (!Number.isInteger(size) || size < 3 || size > 5) {
    throw new RangeError(`Invalid size: ${size}. Must be an integer in [3, 5].`);
  }
  const effectiveWinCondition = winCondition ?? size;
  if (!Number.isInteger(effectiveWinCondition) || effectiveWinCondition < 1 || effectiveWinCondition > size) {
    throw new RangeError(`Invalid winCondition: ${effectiveWinCondition}. Must be an integer in [1, ${size}].`);
  }

  const board = '-'.repeat(size * size);

  return Obj.make(State, {
    board,
    moves: '',
    size,
    winCondition: effectiveWinCondition,
    level,
  });
};

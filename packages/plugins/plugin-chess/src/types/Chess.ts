//
// Copyright 2024 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import * as Schema from 'effect/Schema';

import { BlueprintsAnnotation } from '@dxos/app-toolkit';
import { Annotation, Obj, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';
import { log } from '@dxos/log';

export const BLUEPRINT_KEY = 'org.dxos.blueprint.chess';

/**
 * Chess variant state. Referenced by the base `Game` object via `Game.variant`.
 * Players, name, and other game-shared fields live on the base `Game`.
 */
export const State = Schema.Struct({
  pgn: Schema.String.annotations({
    description: 'Portable Game Notation.',
  }).pipe(FormInputAnnotation.set(false), Schema.optional),
  fen: Schema.String.annotations({
    description: 'Forsyth-Edwards Notation.',
  }).pipe(FormInputAnnotation.set(false), Schema.optional),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.chess.state',
    version: '0.1.0',
  }),
  Annotation.IconAnnotation.set({
    icon: 'ph--shield-chevron--regular',
    hue: 'amber',
  }),
  BlueprintsAnnotation.set([BLUEPRINT_KEY]),
);

export interface State extends Schema.Schema.Type<typeof State> {}

export const make = ({ pgn, fen }: { pgn?: string; fen?: string } = {}): State => {
  const chess = new ChessJS();
  if (pgn) {
    try {
      chess.loadPgn(pgn);
    } catch {
      log.warn(pgn);
    }
  }

  return Obj.make(State, {
    pgn,
    fen,
  });
};

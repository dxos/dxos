//
// Copyright 2024 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import * as Schema from 'effect/Schema';

import { AppAnnotation } from '@dxos/app-toolkit';
import { DXN, Annotation, Obj, Type } from '@dxos/echo';
import { FormInputAnnotation, HiddenAnnotation } from '@dxos/echo/Annotation';
import { log } from '@dxos/log';

export const SKILL_KEY = 'org.dxos.skill.chess';

/**
 * Chess variant state. Referenced by the base `Game` object via `Game.variant`.
 * Players, name, and other game-shared fields live on the base `Game`.
 */
export class State extends Type.makeObject<State>(DXN.make('org.dxos.type.chess.state', '0.1.0'))(
  Schema.Struct({
    pgn: Schema.String.annotations({
      description: 'Portable Game Notation.',
    }).pipe(FormInputAnnotation.set(false), Schema.optional),
    fen: Schema.String.annotations({
      description: 'Forsyth-Edwards Notation.',
    }).pipe(FormInputAnnotation.set(false), Schema.optional),
  }).pipe(
    Annotation.IconAnnotation.set({ icon: 'ph--shield-chevron--regular', hue: 'amber' }),
    AppAnnotation.SkillsAnnotation.set([SKILL_KEY]),
    // Implementation detail of the unified `Game` schema. The user-facing object is `Game`;
    // this state is only ever referenced via `Game.variant`. HiddenAnnotation keeps it out of the
    // navtree's typed branches so an orphaned state object doesn't reappear after the
    // wrapping Game is deleted.
    HiddenAnnotation.set(true),
  ),
) {}

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

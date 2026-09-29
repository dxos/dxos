//
// Copyright 2024 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import * as Schema from 'effect/Schema';

import * as Skill from '@dxos/compute/Skill';
import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { log } from '@dxos/log';

export const SKILL_KEY = 'org.dxos.skill.chess';

/**
 * Chess variant state. Referenced by the base `Game` object via `Game.variant`.
 * Players, name, and other game-shared fields live on the base `Game`.
 */
export class State extends Type.makeObject<State>(DXN.make('org.dxos.type.chess.state', '0.1.0'))(
  Schema.Struct({
    pgn: Schema.String.annotate({
      description: 'Portable Game Notation.',
    }).pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),
    fen: Schema.String.annotate({
      description: 'Forsyth-Edwards Notation.',
    }).pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),
  }).pipe(
    Annotation.IconAnnotation.set({ icon: 'ph--shield-chevron--regular', hue: 'amber' }),
    Skill.SkillsAnnotation.set([SKILL_KEY]),
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

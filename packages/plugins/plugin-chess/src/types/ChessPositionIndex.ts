//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/Annotation';
import { Game } from '@dxos/plugin-game/types';

/** Side the reviewed player may play in indexed games. */
export const Side = Schema.Literal('white', 'black');
export type Side = Schema.Schema.Type<typeof Side>;

/** Games that reached a normalized FEN while the reviewed player was on this side. */
export const PositionEntry = Schema.Struct({
  games: Schema.mutable(Schema.Array(Ref.Ref(Game.Game))).pipe(FormInputAnnotation.set(false)),
});

export type PositionEntry = Schema.Schema.Type<typeof PositionEntry>;

/** FEN-keyed lookup of {@link PositionEntry} for one side. */
export const SideIndex = Schema.Record({ key: Schema.String, value: PositionEntry });

export type SideIndex = Schema.Schema.Type<typeof SideIndex>;

/** Per-side position reach counts for a player review. */
export const Index = Schema.Struct({
  white: SideIndex,
  black: SideIndex,
});

export type Index = Schema.Schema.Type<typeof Index>;

/**
 * Aggregated chess positions reached by a player across indexed games.
 * Stored as a child of {@link PlayerReview}.
 */
export class PositionIndex extends Type.makeObject<PositionIndex>(
  DXN.make('org.dxos.type.chess.positionIndex', '0.1.0'),
)(
  Schema.Struct({
    index: Index.pipe(FormInputAnnotation.set(false)),
  }).pipe(Annotation.IconAnnotation.set({ icon: 'ph--map-trifold--regular', hue: 'amber' })),
) {}

/** Creates an empty position index. */
export const make = (): PositionIndex =>
  Obj.make(PositionIndex, {
    index: { white: {}, black: {} },
  });

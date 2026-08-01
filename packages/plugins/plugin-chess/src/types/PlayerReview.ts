//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';

import * as ChessPositionIndex from './ChessPositionIndex';

/**
 * Personal chess opening/position review for a single player.
 * Indexes all reachable positions (by side) across games in the space.
 */
export class Review extends Type.makeObject<Review>(DXN.make('org.dxos.type.chess.playerReview', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    /** DID of the reviewed player; matched against {@link org.dxos.type.game} players. */
    playerIdentity: Schema.String.pipe(FormInputAnnotation.set(false), Schema.optional),
    /** Display name fallback when identity is absent (e.g. Chess.com username). */
    playerName: Schema.String.pipe(Schema.optional),
    positionIndex: Ref.Ref(ChessPositionIndex.PositionIndex).pipe(FormInputAnnotation.set(false)),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--chart-polar--regular', hue: 'green' }),
  ),
) {}

export type MakeReviewProps = {
  name?: string;
  playerIdentity?: string;
  playerName?: string;
};

/** Creates a player review with an empty child position index. */
export const makeReview = (props: MakeReviewProps = {}): Review => {
  const positionIndex = ChessPositionIndex.make();
  const review = Obj.make(Review, {
    ...props,
    name: props.name ?? props.playerName ?? 'Player review',
    positionIndex: Ref.make(positionIndex),
  });
  Obj.setParent(positionIndex, review);
  return review;
};

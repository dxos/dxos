//
// Copyright 2023 DXOS.org
//

import { GameType } from '@dxos/chess-app';
import { S } from '@dxos/echo-schema';
import { subscriptionHandler } from '@dxos/functions';

import { Engine } from './engine';

export const MetaSchema = S.mutable(
  S.struct({
    level: S.optional(S.number),
    side: S.optional(S.string),
  }),
);

/**
 * Trigger configuration.
 */
export type Meta = S.Schema.Type<typeof MetaSchema>;

/**
 * Runtime types.
 */
export const types = [GameType];

/**
 * Chess function handler.
 */
export const handler = subscriptionHandler<Meta>(async ({ event }) => {
  const { meta: { level = 1, side = 'b' } = {}, objects } = event.data;
  for (const game of objects ?? []) {
    const engine = new Engine({ pgn: game.pgn, level });
    if (!engine.state.isGameOver() && engine.state.turn() === side) {
      engine.move();
      engine.print();

      // Update object.
      game.pgn = engine.state.pgn();
    }
  }
}, types);

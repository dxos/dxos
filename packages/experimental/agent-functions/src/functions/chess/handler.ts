//
// Copyright 2023 DXOS.org
//

import { GameType } from '@dxos/chess-app/types';
import { S } from '@dxos/echo-schema';
import { subscriptionHandler } from '@dxos/functions';

import { Engine } from './engine';

/**
 * Trigger configuration.
 */
export const MetaSchema = S.mutable(
  S.struct({
    level: S.optional(S.number.pipe(S.description('AI strength.'))),
    side: S.optional(S.string),
  }),
);

export type Meta = S.Schema.Type<typeof MetaSchema>;

/**
 * Runtime types.
 */
export const types = [GameType];

/**
 * Chess function handler.
 */
export const handler = subscriptionHandler<Meta>(async ({ event, context }) => {
  const identity = context.client.halo.identity.get();
  const identityKey = identity!.identityKey.toHex();

  const { meta: { level = 1 } = {}, objects } = event.data;
  for (const game of objects ?? []) {
    const engine = new Engine({ pgn: game.pgn, level });
    const nextMoveIdentity = { w: game.playerWhite, b: game.playerBlack }[engine.state.turn()];
    if (!engine.state.isGameOver() && nextMoveIdentity === identityKey) {
      await engine.move();
      engine.print();

      // Update object.
      game.pgn = engine.state.pgn();
    }
  }
}, types);

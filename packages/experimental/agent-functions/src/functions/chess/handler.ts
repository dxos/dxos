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
  if (!identity) {
    return;
  }

  const identityKey = identity.identityKey.toHex();

  // TODO(burdon): Get side from object.
  const { meta: { level = 1 } = {}, objects } = event.data;
  for (const game of objects ?? []) {
    const engine = new Engine({ pgn: game.pgn, level });

    const side = [];
    if (game.playerWhite === identityKey) side.push('w');
    if (game.playerBlack === identityKey) side.push('b');

    if (!engine.state.isGameOver() && side.includes(engine.state.turn())) {
      engine.move();
      engine.print();

      // Update object.
      game.pgn = engine.state.pgn();
    }
  }
}, types);

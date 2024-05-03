//
// Copyright 2023 DXOS.org
//

import { scheduleTask, Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { subscriptionHandler } from '@dxos/functions';

import { registerTypes } from '../../util';

export const handler = subscriptionHandler(async ({ event }) => {
  const { space, objects } = event;
  if (!space || !objects?.length) {
    return;
  }
  registerTypes(space);

  // Wait until done otherwise could be shut down prematurely.
  const done = new Trigger();
  scheduleTask(new Context(), async () => {
    const { Chess } = await import('chess.js');
    for (const game of objects) {
      if (game.pgn) {
        // TODO(burdon): Impl simple engine: https://github.com/josefjadrny/js-chess-engine
        const chess = new Chess();
        // TODO(burdon): Rename history (isn't pgn).
        chess.loadPgn(game.pgn);
        // TODO(burdon): Only trigger if has player credential.
        if (chess.turn() === 'b') {
          const moves = chess.moves();
          if (moves.length) {
            const move = moves[Math.floor(Math.random() * moves.length)];
            chess.move(move);
            // TODO(burdon): Can we defer committing a batch until the function completes (idempotence?)
            game.pgn = chess.pgn();
            // eslint-disable-next-line no-console
            console.log(`move: ${chess.history().length}\n` + chess.ascii());
          }
        }
      }
    }

    done.wake();
  });

  await done.wait();
});

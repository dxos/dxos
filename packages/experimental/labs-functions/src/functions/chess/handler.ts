//
// Copyright 2023 DXOS.org
//

import { scheduleTask, Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { type FunctionHandler, type FunctionSubscriptionEvent } from '@dxos/functions';
import { PublicKey } from '@dxos/keys';

export const handler: FunctionHandler<FunctionSubscriptionEvent> = async ({ event, context }) => {
  const space = context.client.spaces.get(PublicKey.from(event.space))!;

  // Wait until done otherwise could be shut down prematurely.
  const done = new Trigger();
  scheduleTask(new Context(), async () => {
    const { Chess } = await import('chess.js');
    for (const objectId of event.objects) {
      const game = space.db.query({ id: objectId }).objects[0];
      if (game && game.pgn) {
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
            console.log(`move: ${chess.history().length}\n` + chess.ascii());
          }
        }
      }
    }

    done.wake();
  });

  await done.wait();
};

//
// Copyright 2023 DXOS.org
//

import { scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { type FunctionHandler, type FunctionSubscriptionEvent } from '@dxos/functions';
import { PublicKey } from '@dxos/keys';

export const handler: FunctionHandler<FunctionSubscriptionEvent> = async ({ event, context }) => {
  // TODO(burdon): client.spaces.get() is a more natural API.
  const space = context.client.spaces.get(PublicKey.from(event.space))!;

  scheduleTask(new Context(), async () => {
    const { Chess } = await import('chess.js');
    for (const objectId of event.objects) {
      const game = space.db.query({ id: objectId }).objects[0];
      if (game && game.pgn) {
        // TODO(burdon): Trivial engine: https://github.com/josefjadrny/js-chess-engine
        const chess = new Chess();
        // TODO(burdon): Rename pgn (isn't pgn).
        chess.loadPgn(game.pgn);
        // TODO(burdon): Only trigger if has player credential.
        if (chess.turn() === 'b') {
          const moves = chess.moves();
          if (moves.length) {
            const move = moves[Math.floor(Math.random() * moves.length)];
            chess.move(move);
            game.pgn = chess.pgn();
            console.log(`move: ${chess.history().length}\n` + chess.ascii());
          }
        }
      }
    }

    context.status(200).succeed({});
  });
};

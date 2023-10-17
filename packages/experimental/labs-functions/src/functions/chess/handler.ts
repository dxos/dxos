//
// Copyright 2023 DXOS.org
//

import { type FunctionContext } from '@dxos/functions';
import { PublicKey } from '@dxos/keys';

type HandlerProps = {
  space: string;
  objects: string[];
};

export default (event: HandlerProps, context: FunctionContext) => {
  // TODO(burdon): client.spaces.get() is a more natural API.
  const space = context.client.spaces.get(PublicKey.from(event.space))!;

  // TODO(burdon): Async.
  // TODO(burdon): Trivial engine: https://github.com/josefjadrny/js-chess-engine
  setTimeout(async () => {
    const { Chess } = await import('chess.js');

    for (const objectId of event.objects) {
      const game = space.db.getObjectById(objectId);
      if (game && game.pgn) {
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

    return context.status(200).succeed({});
  });
};

//
// Copyright 2023 DXOS.org
//

import { FunctionContext } from '@dxos/functions';
import { PublicKey } from '@dxos/keys';

type HandlerProps = {
  space: string;
  objects: string[];
};

export default (event: HandlerProps, context: FunctionContext) => {
  // TODO(burdon): client.spaces.get() is a more natural API.
  const space = context.client.getSpace(PublicKey.from(event.space));
  for (const objectId of event.objects) {
    const game = space.db.getObjectById(objectId);
    if (game) {
      console.log('game', game.fen);
    }
  }

  /*
  // TODO(burdon): Only trigger if has player credential.
  // TODO(burdon): Trivial engine: https://github.com/josefjadrny/js-chess-engine
  setTimeout(async () => {
    const { Chess } = await import('chess.js');
    console.log(Chess);
    const chess = new Chess();
    // TODO(burdon): Rename pgn (isn't FEN).
    chess.loadPgn(game.fen);
    if (chess.turn() === this._player) {
      const moves = chess.moves();
      if (moves.length) {
        const move = moves[Math.floor(Math.random() * moves.length)];
        chess.move(move);
        game.fen = chess.pgn();
        log.info(`move: ${chess.history().length}\n` + chess.ascii());
      }
    }
  });
  */

  return context.status(200).succeed({});
};

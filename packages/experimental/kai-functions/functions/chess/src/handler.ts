//
// Copyright 2023 DXOS.org
//

// import { log } from '@dxos/log';
import { Client, Config, PublicKey } from '@dxos/client';
import { fromSocket } from '@dxos/client/services';

module.exports = async (event: any, context: any) => {
  const clientUrl = event?.body?.context?.clientUrl;
  if (!clientUrl) {
    return context.status(400);
  }

  const client = new Client({ config: new Config({}), services: await fromSocket(clientUrl) });
  await client.initialize();

  const { Chess } = await import('chess.js');

  // TODO(burdon): Normalized type def.
  const spaceKey = event?.body?.event?.trigger?.spaceKey;
  const space = client.spaces.get(PublicKey.from(spaceKey));
  await space.waitUntilReady(); // TODO(burdon): Review.

  const objectIds: string[] = event?.body?.event?.objects ?? [];
  console.log('processing', JSON.stringify({ objectIds }));
  await Promise.all(
    objectIds.map(async (objectId: string) => {
      console.log('processing', JSON.stringify({ objectId }));
      const game = space.db.getObjectById(objectId);
      console.log('state', JSON.stringify({ pgn: game.pgn }));
      const chess = new Chess();
      chess.loadPgn(game.pgn);
      console.log('game', { turn: chess.turn() });
      // TODO(burdon): Implement credentials (and player selector).
      // TODO(burdon): If playing both sides then introduce delay.
      // TODO(burdon): End game if insufficient material or rule 50.
      if (chess.turn() === 'b') {
        const moves = chess.moves();
        if (moves.length) {
          const move = moves[Math.floor(Math.random() * moves.length)];
          chess.move(move);
          game.pgn = chess.pgn();
          console.log(`move: ${chess.history().length}\n` + chess.ascii());
        }
      }
    }),
  );

  await space.db.flush();
  await client.destroy();

  // TODO(burdon): Query for objects (or from event?)
  // TODO(burdon): Port game state from chess-bot.

  return context.status(200).succeed({ identity: client.halo.identity.get()?.identityKey.toHex() });
};

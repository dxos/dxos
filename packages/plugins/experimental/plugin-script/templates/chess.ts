//
// Copyright 2024 DXOS.org
//

import { Chess } from 'https://esm.sh/chess.js@0.13.1';

export default async ({
  event: {
    data: { request },
  },
  context: { space, ai },
}) => {
  const {
    trigger,
    data: {
      objects: [gameId],
    },
  } = await request.json();

  const { pgn } = await space.crud.query({ id: gameId }).first();
  const game = new Chess();
  game.load_pgn(pgn);
  if (game.turn() !== 'b') {
    return new Response('Invalid turn', { status: 409 });
  }

  const moves = game.moves();
  const move = moves[Math.floor(Math.random() * moves.length)];
  if (!move) {
    return new Response('No legal moves', { status: 500 });
  }

  game.move(move);
  const newPgn = game.pgn();
  await space.crud.update({ id: gameId }, { pgn: newPgn });

  return new Response(game.ascii());
};

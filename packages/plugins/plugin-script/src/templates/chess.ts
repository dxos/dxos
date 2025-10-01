//
// Copyright 2025 DXOS.org
//

// @ts-ignore
import { S, defineFunction } from 'dxos:functions';
// @ts-ignore
import { Chess } from 'https://esm.sh/chess.js@0.13.1?bundle=false';

export default defineFunction({
  key: 'dxos.org/script/chess',
  name: 'Chess',
  description: 'Plays a random move in a chess game.',

  inputSchema: S.Struct({
    changedObjectId: S.String.annotations({
      description: 'The objects to play the game on.',
    }),
    player: S.optional(S.Literal('w', 'b')).annotations({
      description: 'The player to play the game as.',
    }),
  }),

  outputSchema: S.Struct({
    state: S.String.annotations({
      description: 'The state of the game as an ASCII art board.',
    }),
  }),

  handler: async ({ data: { changedObjectId, player = 'b' }, context: { space } }: any) => {
    const { pgn } = await space.db.query({ id: changedObjectId }).first();
    const game = new Chess();
    game.load_pgn(pgn);
    if (game.turn() !== player) {
      return new Response('Invalid turn', { status: 409 });
    }

    const moves = game.moves();
    const move = moves[Math.floor(Math.random() * moves.length)];
    if (!move) {
      return new Response('No legal moves', { status: 406 });
    }

    game.move(move);
    const newPgn = game.pgn();
    await space.db.update({ id: changedObjectId }, { pgn: newPgn, fen: game.fen() });
    return { state: game.ascii() };
  },
});

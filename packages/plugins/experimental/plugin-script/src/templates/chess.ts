//
// Copyright 2025 DXOS.org
//

// @version 0.13.1
import { Chess } from 'chess.js';

// @version 0.7.5-main.b19bfc8?deps=effect@3.13.3
import { S } from '@dxos/echo-schema';
// @version 0.7.5-main.b19bfc8
import { defineFunction } from '@dxos/functions';
// @version 0.7.5-main.b19bfc8
import { invariant } from '@dxos/invariant';

export default defineFunction({
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

  handler: async ({
    event: {
      data: { changedObjectId, player = 'b' },
    },
    context: { space },
  }) => {
    invariant(space, 'Space is required');
    const { pgn } = await space.db.query({ id: changedObjectId }).first();
    const game = new Chess();
    game.load_pgn(pgn);
    if (game.turn() !== player) {
      throw new Error('Invalid turn');
    }

    const moves = game.moves();
    const move = moves[Math.floor(Math.random() * moves.length)];
    if (!move) {
      throw new Error('No legal moves');
    }

    game.move(move);
    const newPgn = game.pgn();
    await space.db.update({ id: changedObjectId }, { pgn: newPgn, fen: game.fen() });
    return { state: game.ascii() };
  },
});

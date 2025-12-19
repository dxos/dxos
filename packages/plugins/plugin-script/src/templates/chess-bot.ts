//
// Copyright 2025 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Type } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { Chess } from '@dxos/plugin-chess/types';

export default defineFunction({
  key: 'dxos.org/script/chess-bot',
  name: 'Chess',
  description: 'Plays a random move in a chess game.',

  inputSchema: Schema.Struct({
    game: Type.Ref(Chess.Game).annotations({
      description: 'The chess game to comment on.',
    }),
    player: Schema.optional(Schema.Literal('white', 'black')).annotations({
      description: 'The player to play the game as.',
    }),
  }),

  outputSchema: Schema.Struct({
    state: Schema.String.annotations({
      description: 'The state of the game as an ASCII art board.',
    }),
  }),

  types: [Chess.Game],
  services: [Database.Service],

  handler: Effect.fnUntraced(function* ({ data: { game, player = 'black' } }) {
    const loadedGame = yield* Database.Service.load(game);
    const chess = new ChessJS();
    chess.loadPgn(loadedGame.pgn ?? '');
    if (chess.turn() !== (player === 'white' ? 'w' : 'b')) {
      return { state: chess.ascii() };
    }

    const moves = chess.moves({ verbose: true });
    const move = moves[Math.floor(Math.random() * moves.length)];
    if (!move) {
      return { state: chess.ascii() };
    }

    chess.move(move.san);
    const newPgn = chess.pgn();
    loadedGame.pgn = newPgn;
    yield* Database.Service.flush();
    return { state: chess.ascii() };
  }),
});

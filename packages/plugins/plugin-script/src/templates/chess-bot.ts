//
// Copyright 2025 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Obj, Ref } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { Chess } from '@dxos/plugin-chess/types';

const ChessBot = Operation.make({
  meta: {
    key: 'org.dxos.script.chess-bot',
    name: 'Chess Bot',
    description: 'Plays a random move in a chess game.',
  },
  input: Schema.Struct({
    game: Ref.Ref(Chess.Game).annotations({
      description: 'The chess game to comment on.',
    }),
    player: Schema.optional(Schema.Literal('white', 'black')).annotations({
      description: 'The player to play the game as.',
    }),
  }),
  output: Schema.Struct({
    state: Schema.String.annotations({
      description: 'The state of the game as an ASCII art board.',
    }),
  }),
  types: [Chess.Game],
  services: [Database.Service],
});

export default ChessBot.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ game, player = 'black' }) {
      const loadedGame = yield* Database.load(game);
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
      Obj.change(loadedGame, (obj) => {
        obj.pgn = newPgn;
      });
      yield* Database.flush();
      return { state: chess.ascii() };
    }),
  ),
);

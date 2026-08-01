//
// Copyright 2025 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Database, DXN, Obj } from '@dxos/echo';
import { Chess } from '@dxos/plugin-chess';
import { Game, loadGame } from '@dxos/plugin-game';

const ChessBot = Operation.make({
  meta: {
    key: DXN.make('org.dxos.script.chessBot'),
    name: 'Chess Bot',
    description: 'Plays a random move in a chess game.',
  },
  input: Schema.Struct({
    game: Game.GameRef(Chess.State).annotations({
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
  types: [Game.Game, Chess.State],
  services: [Database.Service],
});

export default ChessBot.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ game, player = 'black' }) {
      const { variant } = yield* loadGame(game, Chess.State);
      const chess = new ChessJS();
      chess.loadPgn(variant.pgn ?? '');
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
      Obj.update(variant, (variant) => {
        const mutable = variant as Obj.Mutable<typeof variant>;
        mutable.pgn = newPgn;
      });
      yield* Database.flush();
      return { state: chess.ascii() };
    }),
  ),
);

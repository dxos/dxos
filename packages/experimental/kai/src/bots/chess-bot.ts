//
// Copyright 2023 DXOS.org
//

import { Chess } from 'chess.js';

import { Game } from '@dxos/chess-app';
import { EchoDatabase } from '@dxos/echo-schema';

import { Bot } from './bot';

// TODO(burdon): Show bots in sidebar (DMG state).
// TODO(burdon): Instantiate bot from fake bot selector (DMG view).
// TODO(burdon): Add apps/bots from DMG grid view (Chess, Explorer, Calendar, Kanban, Maps).
export class ChessBot extends Bot<Game> {
  private readonly _player = 'b';

  constructor(db: EchoDatabase) {
    super(db, Game.filter());
  }

  // TODO(burdon): Only trigger if invited.
  override onUpdate(game: Game) {
    if (game.fen) {
      const chess = new Chess();
      chess.loadPgn(game.fen);
      if (chess.turn() === this._player) {
        const moves = chess.moves();
        const move = moves[Math.floor(Math.random() * moves.length)];
        chess.move(move);
        game.fen = chess.pgn();
      }
    }
  }
}

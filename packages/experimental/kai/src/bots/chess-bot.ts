//
// Copyright 2023 DXOS.org
//

import { Game } from '@dxos/chess-app';
import { Subscription } from '@dxos/echo-schema';

import { Bot } from './bot';

// TODO(burdon): Show bots in sidebar (DMG state).
// TODO(burdon): Instantiate bot from fake bot selector (DMG view).
// TODO(burdon): Add apps/bots from DMG grid view (Chess, Explorer, Calendar, Kanban, Maps).
// TODO(burdon): Trivial engine: https://github.com/josefjadrny/js-chess-engine
export class ChessBot extends Bot {
  private readonly _player = 'b';
  private _subscription?: Subscription;

  override async onStart() {
    // TODO(burdon): Update when object mutated.
    const query = this.db.query(Game.filter());
    this._subscription = query.subscribe(async (query) => {
      await Promise.all(
        query.objects.map(async (object) => {
          await this.onUpdate(object);
        })
      );
    });
  }

  override async onStop() {
    this._subscription?.();
  }

  // TODO(burdon): Only trigger if invited.
  async onUpdate(game: Game) {
    if (game.fen) {
      const { Chess } = await import('chess.js');
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

//
// Copyright 2023 DXOS.org
//

import { Game } from '@dxos/chess-app/proto';
import { type Subscription } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { Bot } from '../bot';

/**
 * Simple chess bot.
 */
export class ChessBot extends Bot {
  private readonly _player = 'b';
  private _subscription?: Subscription;

  override async onStart() {
    const query = this.space.db.query(Game.filter());
    this._subscription = query.subscribe(async (query) => {
      await Promise.all(
        query.objects.map(async (object) => {
          await this.onUpdate(object);
        }),
      );
    });
  }

  override async onStop() {
    this._subscription?.();
  }

  // TODO(burdon): Only trigger if has player credential.
  // TODO(burdon): Trivial engine: https://github.com/josefjadrny/js-chess-engine
  async onUpdate(game: Game) {
    if (game.pgn) {
      const { Chess } = await import('chess.js');
      const chess = new Chess();
      chess.loadPgn(game.pgn);
      if (chess.turn() === this._player) {
        const moves = chess.moves();
        if (moves.length) {
          const move = moves[Math.floor(Math.random() * moves.length)];
          chess.move(move);
          game.pgn = chess.pgn();
          log.info(`move: ${chess.history().length}\n` + chess.ascii());
        }
      }
    }
  }
}

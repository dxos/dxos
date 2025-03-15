//
// Copyright 2024 DXOS.org
//

import { Chess } from 'chess.js';
import { Game } from 'js-chess-engine';

import { sleep } from '@dxos/async';

export type EngineProps = {
  pgn?: string;
  level?: number;
};

export class Engine {
  private readonly _state: Chess;
  private readonly _ai: Game;
  private readonly _level: number;

  constructor({ pgn = '', level = 2 }: EngineProps) {
    this._state = new Chess();
    this._state.loadPgn(pgn);
    this._ai = new Game(this._state.fen());
    this._level = level;
  }

  get state() {
    return this._state;
  }

  async move() {
    if (this._state.isGameOver()) {
      return false;
    }

    // Convert { [from]: to } to { from, to }
    const [[from, to]] = Object.entries(this._ai.aiMove(this._level));
    this._state.move({ from: from.toLowerCase(), to: to.toLowerCase(), promotion: 'q' });
    await sleep(500);
    return true;
  }

  print() {
    const title = `Move ${this.state.moveNumber()}`;
    // eslint-disable-next-line no-console
    console.log(`\n${title.padStart(15 + title.length / 2)}\n` + this.state.ascii() + '\n');
  }
}

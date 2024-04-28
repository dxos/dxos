//
// Copyright 2024 DXOS.org
//

import { Chess } from 'chess.js';
import { Hono } from 'hono';
import { Game } from 'js-chess-engine';

import type { Env } from '../defs';
import { safeJson } from '../util';

const app = new Hono<Env>();

// TODO(burdon): Stockfish WASM.
// import stockfish from 'stockfish.js/stockfish.wasm.js';
// https://github.com/lichess-org/stockfish.wasm
// https://github.com/lichess-org/stockfish.js
// https://developers.cloudflare.com/workers/runtime-apis/webassembly/javascript/#use-from-javascript
// const instance = WebAssembly.instantiate(chess); // Instantiate Wasm modules in global scope, not within the fetch() handler.

// const wasmSupported = typeof WebAssembly === 'object' &&
//   WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));

// TODO(burdon): Standardize POST API (event, state). ETL.
export type Event<T extends {}> = {
  debug: boolean;
  data: T;
};

export type GameState = {
  fen?: string;
  level?: number;
};

/**
 * Simple chess handler.
 *
 * ```bash
 * curl -s -w '\n' -X POST http://localhost:8787/chess/move --data '{ "debug": true, "data": { "fen": "rnbqkbnr/pppp1ppp/8/4p3/8/2N5/PPPPPPPP/R1BQKBNR w KQkq e6 0 2" } }'
 * ```
 */
app.post('/move', async (c) => {
  const request = await safeJson<Event<GameState>>(c.req);
  const { debug, data = {} } = request ?? {};

  // https://www.npmjs.com/package/js-chess-engine#computer-ai
  const game = new Game(data.fen);
  game.aiMove(data.level ?? 1);
  const fen = game.exportFEN();

  const response: GameState = { fen };

  if (debug) {
    const chess = new Chess(fen);
    // eslint-disable-next-line no-console
    console.log(`FEN: ${chess.fen()}\n` + chess.ascii());
  }

  return c.json<GameState>(response);
});

export default app;

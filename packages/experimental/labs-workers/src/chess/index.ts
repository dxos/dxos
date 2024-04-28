//
// Copyright 2024 DXOS.org
//

import { Chess } from 'chess.js';
import { Hono } from 'hono';
import { Game } from 'js-chess-engine';

import { log } from '@dxos/log';

import type { Env } from '../defs';

const app = new Hono<Env>();

// TODO(burdon): Stockfish WASM.
// import stockfish from 'stockfish.js/stockfish.wasm.js';
// https://github.com/lichess-org/stockfish.wasm
// https://github.com/lichess-org/stockfish.js
// https://developers.cloudflare.com/workers/runtime-apis/webassembly/javascript/#use-from-javascript
// const instance = WebAssembly.instantiate(chess); // Instantiate Wasm modules in global scope, not within the fetch() handler

// const wasmSupported =
//   typeof WebAssembly === 'object' &&
//   WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));

export type GameState = {
  fen?: string;
  level?: number;
};

/**
 * ```bash
 * curl -w '\n' -X POST http://localhost:8787/chess/move --data '{ "fen": "rnbqkbnr/pppppppp/8/8/8/2N5/PPPPPPPP/R1BQKBNR b KQkq - 1 1" }'
 * ```
 */
app.post('/move', async (c) => {
  const state = await c.req.json<GameState>();

  // https://www.npmjs.com/package/js-chess-engine#computer-ai
  const game = new Game(state.fen);
  game.aiMove(state.level ?? 1);
  const fen = game.exportFEN();
  const response: GameState = { fen };
  log.info('move', response);

  // eslint-disable-next-line no-console
  console.log(new Chess(game.exportFEN()).ascii());

  return c.json<GameState>(response);
});

export default app;

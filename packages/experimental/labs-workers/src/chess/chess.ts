//
// Copyright 2024 DXOS.org
//

import { Chess } from 'chess.js';
import { Game } from 'js-chess-engine';

import { next as A } from '@dxos/automerge/automerge';

import { type EchoObject } from '../exec';

// TODO(burdon): Stockfish WASM.
// import stockfish from 'stockfish.js/stockfish.wasm.js';
// https://github.com/lichess-org/stockfish.wasm
// https://github.com/lichess-org/stockfish.js
// https://developers.cloudflare.com/workers/runtime-apis/webassembly/javascript/#use-from-javascript
// const instance = WebAssembly.instantiate(chess); // Instantiate Wasm modules in global scope, not within the fetch() handler.

// const wasmSupported = typeof WebAssembly === 'object' &&
//   WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));

// TODO(burdon): Effect schema.
export type GameType = {
  fen?: string;
};

export type ChessTransformOptions = {
  debug?: boolean;
  level?: number;
};

export const chessTransform = ({ level = 1, debug = true }: ChessTransformOptions = {}) => {
  return async (games: EchoObject<GameType>[]) => {
    return (
      games?.map(({ id, schema, object }) => {
        const game = new Game(object.fen);
        game.aiMove(level ?? 1);
        const fen = game.exportFEN();

        if (debug) {
          const chess = new Chess(fen);
          // eslint-disable-next-line no-console
          console.log(`FEN: ${chess.fen()}\n` + chess.ascii());
        }

        // TODO(burdon): Should just return mutated ECHO objects.
        return {
          id,
          schema,
          object: A.change<GameType>(object, (doc) => (doc.fen = fen)),
        };
      }) ?? []
    );
  };
};

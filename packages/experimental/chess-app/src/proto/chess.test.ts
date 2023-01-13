//
// Copyright 2023 DXOS.org
//

import { Chess } from 'chess.js';

import { describe, test } from '@dxos/test';

import { Game } from './gen/schema';

describe('model tests', () => {
  test('update model', () => {
    const game = new Game();
    const chess = new Chess();
    game.fen = chess.fen();
  });
});

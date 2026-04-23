//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { TicTacToePlugin } from './TicTacToePlugin';

describe('TicTacToePlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(TicTacToePlugin.meta).toBeDefined();
    expect(TicTacToePlugin.meta.id).toBeTypeOf('string');
  });
});

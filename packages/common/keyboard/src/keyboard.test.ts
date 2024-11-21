//
// Copyright 2023 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Keyboard } from './keyboard';

describe('keyboard', () => {
  test('should pass', () => {
    const keyboard = new Keyboard();
    keyboard.bind({ shortcut: 'meta+k', handler: () => true });
    expect(keyboard.getBindings()).to.have.length(1);
  });
});

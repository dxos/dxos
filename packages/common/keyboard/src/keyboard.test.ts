//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { Keyboard } from './keyboard';

describe('keyboard', () => {
  test('should pass', () => {
    const keyboard = new Keyboard();
    keyboard.bind({ binding: 'meta+k', handler: () => true });
    expect(keyboard.getBindings()).to.have.length(1);
  });
});

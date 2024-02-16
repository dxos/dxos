//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { describe, test } from 'vitest';

import { BitField } from './bitfield';

describe('bitfield', () => {
  test('set/get', () => {
    const value: Uint8Array = new Uint8Array([0, 0, 0, 0]);
    expect(BitField.get(value, 16)).to.be.false;
    BitField.set(value, 16, true);
    expect(BitField.get(value, 16)).to.be.true;
  });

  test('count', () => {
    const value: Uint8Array = new Uint8Array([0, 0, 0, 0]);
    BitField.set(value, 11, true);
    BitField.set(value, 16, true);
    expect(BitField.count(value, 10, 20)).to.equal(2);
  });
});

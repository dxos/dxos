//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { inRange, posFromA1Notation, posToA1Notation, rangeFromA1Notation, rangeToA1Notation } from './types';

describe('cell', () => {
  test('posToA1Notation', () => {
    expect(posToA1Notation({ column: 0, row: 0 })).to.eq('A1');
    expect(posFromA1Notation('C2')).to.deep.eq({ column: 2, row: 1 });
  });

  test('rangeToA1Notation', () => {
    expect(rangeToA1Notation({ from: posFromA1Notation('A1'), to: posFromA1Notation('A5') })).to.eq('A1:A5');
  });

  test('inRange', () => {
    const range = rangeFromA1Notation('A1:C5');
    expect(inRange(range, posFromA1Notation('A1'))).to.be.true;
    expect(inRange(range, posFromA1Notation('C5'))).to.be.true;
    expect(inRange(range, posFromA1Notation('A6'))).to.be.false;
    expect(inRange(range, posFromA1Notation('D5'))).to.be.false;
  });
});

//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import { describe, test } from 'vitest';

import { inRange, cellFromA1Notation, cellToA1Notation, rangeFromA1Notation, rangeToA1Notation } from './types';

describe('cell', () => {
  test('posToA1Notation', () => {
    expect(cellToA1Notation({ column: 0, row: 0 })).to.eq('A1');
    expect(cellFromA1Notation('C2')).to.deep.eq({ column: 2, row: 1 });
  });

  test('rangeToA1Notation', () => {
    expect(rangeToA1Notation({ from: cellFromA1Notation('A1'), to: cellFromA1Notation('A5') })).to.eq('A1:A5');
  });

  test('inRange', () => {
    const range = rangeFromA1Notation('A1:C5');
    expect(inRange(range, cellFromA1Notation('A1'))).to.be.true;
    expect(inRange(range, cellFromA1Notation('C5'))).to.be.true;
    expect(inRange(range, cellFromA1Notation('A6'))).to.be.false;
    expect(inRange(range, cellFromA1Notation('D5'))).to.be.false;
  });
});

//
// Copyright 2024 DXOS.org
//

import { getIndices, getIndicesAbove, getIndicesBelow, getIndicesBetween, sortByIndex } from '@tldraw/indices';
import { describe, expect, test } from 'vitest';

import { addressFromA1Notation, addressToA1Notation, inRange, rangeFromA1Notation, rangeToA1Notation } from './types';

describe('cell', () => {
  test('posToA1Notation', () => {
    expect(addressToA1Notation({ col: 0, row: 0 })).to.eq('A1');
    expect(addressFromA1Notation('C2')).to.deep.eq({ col: 2, row: 1 });
  });

  test('rangeToA1Notation', () => {
    expect(rangeToA1Notation({ from: addressFromA1Notation('A1'), to: addressFromA1Notation('A5') })).to.eq('A1:A5');
  });

  test('inRange', () => {
    const range = rangeFromA1Notation('A1:C5');
    expect(inRange(range, addressFromA1Notation('A1'))).to.be.true;
    expect(inRange(range, addressFromA1Notation('C5'))).to.be.true;
    expect(inRange(range, addressFromA1Notation('A6'))).to.be.false;
    expect(inRange(range, addressFromA1Notation('D5'))).to.be.false;
  });

  // TODO(burdon): Move to model.test.ts
  test('index', () => {
    // Pre-allocated grid.
    const n = 5;
    const columns = getIndices(n - 1);
    const rows = getIndices(n - 1);

    const pickOne = (indices: string[]) => indices[Math.floor(Math.random() * indices.length)];

    /**
     * Insert an index into the allocated list.
     * Randomly picks from n values between indexes to support probabilistic concurrency.
     */
    const insertIndex = (indices: string[], i: number, n = 20) => {
      if (i === 0) {
        const idx = pickOne(getIndicesBelow(indices[0], n));
        indices.splice(0, 0, idx);
      } else if (i >= indices.length) {
        // Reallocate if > current bounds.
        // TODO(burdon): Is this OK if this happens concurrently?
        indices.splice(indices.length, 0, ...getIndicesAbove(indices[indices.length - 1], i + 1 - indices.length));
      } else {
        const idx = pickOne(getIndicesBetween(indices[i - 1], indices[i], n));
        indices.splice(i, 0, idx);
      }
    };

    // Values.
    const cells: Record<string, any> = {};
    const setCell = (cell: string, value: any) => {
      const { col, row } = addressFromA1Notation(cell);
      // Reallocate if > current bounds.
      if (col >= columns.length) {
        insertIndex(columns, col);
      }
      if (row >= rows.length) {
        insertIndex(rows, row);
      }
      const index = `${columns[col]}@${rows[row]}`;
      cells[index] = value;
    };

    expect(addressFromA1Notation('A1')).to.deep.eq({ col: 0, row: 0 });

    expect(columns).to.deep.eq(['a1', 'a2', 'a3', 'a4', 'a5']);
    insertIndex(columns, 7);
    expect(columns).to.deep.eq(['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8']);

    setCell('A1', 100);
    setCell('B1', 101);

    insertIndex(columns, 1);
    setCell('B1', 102);

    setCell('J10', 104);
    expect(columns).to.have.length(10);
    expect(rows).to.have.length(10);

    const entries = Object.entries(cells).map(([key, value]) => ({ index: key.split('@')[0], value }));
    const sorted = entries.sort(sortByIndex);
    const values = sorted.map(({ value }) => value);
    expect(values).to.deep.eq([100, 102, 101, 104]);
  });
});

//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { toPlotData, toPlotDatums } from './data.ts';

describe('toPlotData', () => {
  test('header row names the columns', ({ expect }) => {
    const data = toPlotData(
      [
        ['Month', 'Sales'],
        ['Jan', 10],
      ],
      { header: true },
    );
    expect(data).to.deep.eq({ columns: ['Month', 'Sales'], rows: [['Jan', 10]] });
  });

  test('without a header the columns are lettered', ({ expect }) => {
    expect(toPlotData([[1, 2]]).columns).to.deep.eq(['A', 'B']);
  });
});

describe('toPlotDatums', () => {
  test('first column is the key, remaining columns are series', () => {
    const datums = toPlotDatums({
      columns: ['Month', 'A', 'B'],
      rows: [
        ['Jan', 1, '2'],
        ['Feb', 3, 'n/a'],
      ],
    });
    expect(datums).to.deep.eq([
      { key: 'Jan', series: 'A', value: 1 },
      { key: 'Jan', series: 'B', value: 2 },
      { key: 'Feb', series: 'A', value: 3 },
    ]);
  });

  test('a single column is keyed by row number', () => {
    expect(toPlotDatums({ columns: ['A'], rows: [[5], ['$1,000']] })).to.deep.eq([
      { key: 1, series: 'A', value: 5 },
      { key: 2, series: 'A', value: 1000 },
    ]);
  });
});

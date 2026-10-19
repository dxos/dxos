//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { headerRanges } from './SheetRange.ts';

describe('headerRanges', () => {
  test('styles the header and end-aligns runs of numeric columns', ({ expect }) => {
    const cells = {
      A1: { value: 'Name' },
      B1: { value: 'Qty' },
      C1: { value: 'Price' },
      D1: { value: 'Note' },
      E1: { value: 'Share' },
      A2: { value: 'Widget' },
      B2: { value: 3 },
      C2: { value: '$10000' },
      D2: { value: 'Fragile' },
      E2: { value: '8%' },
      A3: { value: 'Total' },
      B3: { value: '=SUM(B2:B2)' },
    };
    expect(headerRanges(cells, 'A1:E1')).toEqual([
      { range: 'A1:E1', key: 'style', value: 'header' },
      { range: 'B1:C1', key: 'alignment', value: 'end' },
      { range: 'E1', key: 'alignment', value: 'end' },
    ]);
  });

  test('leaves a column with no values below its header unaligned', ({ expect }) => {
    expect(headerRanges({ A1: { value: 'Empty' } }, 'A1')).toEqual([{ range: 'A1', key: 'style', value: 'header' }]);
  });
});

//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { fitColumns } from './Columns.tsx';

describe('fitColumns', () => {
  test('fits as many columns as the minimum width allows, each an exact share of the width', ({ expect }) => {
    // 24rem at 16px is 384px.
    expect(fitColumns(500, 384, 0)).toEqual({ count: 1, width: 500 });
    expect(fitColumns(800, 384, 0)).toEqual({ count: 2, width: 400 });
    expect(fitColumns(800, 384, 16)).toEqual({ count: 2, width: 392 });
    expect(fitColumns(1200, 384, 0)).toEqual({ count: 3, width: 400 });
  });

  test('shows at least one column, and at most maxColumns', ({ expect }) => {
    expect(fitColumns(200, 384, 0)).toEqual({ count: 1, width: 200 });
    expect(fitColumns(1200, 384, 0, 2)).toEqual({ count: 2, width: 600 });
  });
});

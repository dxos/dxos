//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Ref } from '@dxos/echo';

import { Sheet, SheetRange, SheetUtil } from '#types';

/** Monthly sales by region (A1:C7) beside each region's market share (E1:F5). */
const ROWS = [
  ['Month', 'North', 'South', null, 'Region', 'Share'],
  ['Jan', 120, 80, null, 'Americas', 42],
  ['Feb', 180, 110, null, 'Europe', 31],
  ['Mar', 150, 160, null, 'Asia', 21],
  ['Apr', 220, 140, null, 'Other', 6],
  ['May', 260, 190],
  ['Jun', 240, 230],
];

export type Provides = { sheet: Sheet.Sheet };

/** A small sales sheet with a bar chart and a pie chart of its two tables. */
const makeSales = (): Sheet.Sheet =>
  Sheet.make({
    name: 'Sales',
    cells: SheetUtil.cellsFromRows(ROWS),
    ranges: [
      ...['A1:C1', 'E1:F1'].map((range) => ({ range, key: SheetRange.styleKey, value: 'header' })),
      ...['B1:C1', 'F1'].map((range) => ({ range, key: SheetRange.alignKey, value: 'end' })),
    ],
    charts: [
      { name: 'Sales by region', range: 'A1:C7', type: 'bar', header: true, grid: true },
      { name: 'Market share', range: 'E1:F5', type: 'pie', header: true },
    ],
  });

export const Partial: SampleSpace.Partial<Provides> = SampleSpace.partial('sales', {
  schemas: [Sheet.Sheet, Sheet.Chart],
  run: () =>
    Effect.gen(function* () {
      const sheet = yield* Database.add(makeSales());
      yield* SampleSpace.collection('Sales', [Ref.make(sheet)]);
      return { sheet };
    }),
});

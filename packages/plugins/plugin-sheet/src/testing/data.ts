//
// Copyright 2024 DXOS.org
//

import { defaultColSize } from '@dxos/lit-grid';

import { Sheet, SheetRange, SheetUtil } from '#types';

import { technologyTimeline } from './timeline.ts';

export const createTestCells = (testSheetName = 'test'): Record<string, Sheet.CellValue> => ({
  B1: { value: 'Qty2' },
  B3: { value: 1 },
  B4: { value: 2 },
  B5: { value: 3 },
  B7: { value: 'Total' },

  C1: { value: 'Price' },
  C3: { value: 2_000 },
  C4: { value: 2_500 },
  C5: { value: 3_000 },
  C7: { value: '=SUMPRODUCT(B2:B6, C2:C6)' },
  // C8: { value: '=C7*CRYPTO(D7)' },
  C8: { value: '=C7*TEST()' },

  D7: { value: 'USD' },
  D8: { value: 'BTC' },

  E3: { value: '=TODAY()' },
  E4: { value: '=NOW()' },

  F1: { value: `=${testSheetName}!A1` }, // Ref test sheet.
  F3: { value: true },
  F4: { value: false },
  F5: { value: '8%' },
  F6: { value: '$10000' },
});

/** Monthly sales by region (A1:C7), market share (E1:F5), and a sampled curve (H1:I11) for charts. */
export const createChartTestCells = (): Record<string, Sheet.CellValue> => {
  const cells: Record<string, Sheet.CellValue> = {};
  const set = (address: string, value: Sheet.CellValue['value']) => (cells[address] = { value });

  [
    ['Month', 'North', 'South'],
    ['Jan', 120, 80],
    ['Feb', 180, 110],
    ['Mar', 150, 160],
    ['Apr', 220, 140],
    ['May', 260, 190],
    ['Jun', 240, 230],
  ].forEach((row, index) => row.forEach((value, col) => set(`${'ABC'[col]}${index + 1}`, value)));

  [
    ['Region', 'Share'],
    ['Americas', 42],
    ['Europe', 31],
    ['Asia', 21],
    ['Other', 6],
  ].forEach((row, index) => row.forEach((value, col) => set(`${'EF'[col]}${index + 1}`, value)));

  set('H1', 'x');
  set('I1', 'x²');
  for (let x = 0; x <= 9; x++) {
    set(`H${x + 2}`, x);
    set(`I${x + 2}`, `=H${x + 2}*H${x + 2}`);
  }

  return cells;
};

/** Header rows, with the headers of numeric columns aligned to the end like their values. */
export const createChartTestRanges = (): Sheet.Range[] => [
  ...['A1:C1', 'E1:F1', 'H1:I1'].map((range) => ({ range, key: SheetRange.styleKey, value: 'header' })),
  ...['B1:C1', 'F1', 'H1:I1'].map((range) => ({ range, key: SheetRange.alignKey, value: 'end' })),
];

/** Technology, macro, robotics and industrial-complex events (A1:E{n}), one per row, for timelines. */
export const createTimelineTestCells = (): Record<string, Sheet.CellValue> =>
  SheetUtil.cellsFromRows(technologyTimeline);

/** The A1 range of the timeline test cells. */
export const timelineTestRange = `A1:E${technologyTimeline.length}`;

/** Rows enough for the timeline test cells, with room to add events. */
export const timelineTestRows = technologyTimeline.length + 20;

/** The description column is three columns wide. */
export const timelineTestColumnSizes: Record<string, number> = { D: defaultColSize * 3 };

export const createTimelineTestRanges = (): Sheet.Range[] => [
  { range: 'A1:E1', key: SheetRange.styleKey, value: 'header' },
];

//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database } from '@dxos/echo';
import * as Sheet from '@dxos/plugin-sheet/Sheet';
import * as SheetRange from '@dxos/plugin-sheet/SheetRange';

//
// Sheets
//

const makeSheets = (): SheetsResult => {
  const greenInventoryCells: Record<string, Sheet.CellValue> = {
    A1: { value: 'Origin' },
    B1: { value: 'Lot' },
    C1: { value: 'Process' },
    D1: { value: 'KG' },
    E1: { value: 'Cost/kg' },
    F1: { value: 'Total' },
    A2: { value: 'Colombia — Esperanza' },
    B2: { value: 'Lot A' },
    C2: { value: 'Washed' },
    D2: { value: 1_800 },
    E2: { value: 11.5 },
    F2: { value: '=D2*E2' },
    A3: { value: 'Ethiopia — Sidamo' },
    B3: { value: 'Lot 42' },
    C3: { value: 'Natural' },
    D3: { value: 2_400 },
    E3: { value: 13.2 },
    F3: { value: '=D3*E3' },
    A4: { value: 'Guatemala — Antigua' },
    B4: { value: 'Lot 7' },
    C4: { value: 'Washed' },
    D4: { value: 900 },
    E4: { value: 10.8 },
    F4: { value: '=D4*E4' },
    A5: { value: 'Peru — Cajamarca' },
    B5: { value: 'Lot 3' },
    C5: { value: 'Washed' },
    D5: { value: 600 },
    E5: { value: 9.6 },
    F5: { value: '=D5*E5' },
    A6: { value: 'TOTAL' },
    D6: { value: '=SUM(D2:D5)' },
    F6: { value: '=SUM(F2:F5)' },
  };
  const greenInventory = Sheet.make({
    name: 'Green coffee inventory',
    rows: 12,
    columns: 6,
    cells: greenInventoryCells,
    ranges: SheetRange.headerRanges(greenInventoryCells, 'A1:F1'),
  });

  const priceListCells: Record<string, Sheet.CellValue> = {
    A1: { value: 'SKU' },
    B1: { value: 'Product' },
    C1: { value: 'Wholesale / lb' },
    D1: { value: 'Retail / 12 oz' },
    A2: { value: 'LIN-12' },
    B2: { value: 'Linden Blend' },
    C2: { value: 18 },
    D2: { value: 19 },
    A3: { value: 'FN-12' },
    B3: { value: 'Field Notes Blend' },
    C3: { value: 18 },
    D3: { value: 19 },
    A4: { value: 'LS-12' },
    B4: { value: 'Late Shift' },
    C4: { value: 17 },
    D4: { value: 18 },
    A5: { value: 'ESP-12' },
    B5: { value: 'Esperanza Single-Origin' },
    C5: { value: 24 },
    D5: { value: 26 },
    A6: { value: 'SID-12' },
    B6: { value: 'Sidamo Single-Origin' },
    C6: { value: 24 },
    D6: { value: 26 },
    A7: { value: 'SB-12' },
    B7: { value: 'Spring Blend (preorder)' },
    C7: { value: 21 },
    D7: { value: 22 },
    A9: { value: 'AVG wholesale' },
    C9: { value: '=ROUND(AVERAGE(C2:C7), 1)' },
    A10: { value: 'AVG retail' },
    D10: { value: '=ROUND(AVERAGE(D2:D7), 1)' },
  };
  const priceList = Sheet.make({
    name: 'Wholesale price list',
    rows: 10,
    columns: 4,
    cells: priceListCells,
    ranges: SheetRange.headerRanges(priceListCells, 'A1:D1'),
  });

  const salesReportCells = {
    ...table('A', [
      ['Month', 'Linden', 'Field Notes', 'Late Shift'],
      ['Jan', 3_200, 2_100, 1_400],
      ['Feb', 2_900, 2_300, 1_500],
      ['Mar', 3_400, 2_600, 1_700],
      ['Apr', 3_800, 2_500, 1_900],
      ['May', 4_100, 2_800, 2_000],
      ['Jun', 4_500, 3_000, 2_300],
    ]),
    ...table('F', [
      ['Channel', 'Revenue'],
      ['Wholesale', 42_000],
      ['Café', 33_000],
      ['Online', 25_000],
    ]),
  };
  const salesReport = Sheet.make({
    name: 'Sales report',
    rows: 20,
    columns: 8,
    cells: salesReportCells,
    ranges: [
      ...SheetRange.headerRanges(salesReportCells, 'A1:D1'),
      ...SheetRange.headerRanges(salesReportCells, 'F1:G1'),
    ],
    charts: [
      { name: 'Bags sold by blend', range: 'A1:D7', type: 'bar', header: true, grid: true },
      { name: 'Revenue by channel', range: 'F1:G4', type: 'pie', header: true },
    ],
  });

  return { greenInventory, priceList, salesReport };
};

/** Cells for a table of rows whose first column is `column`. */
const table = (column: string, rows: (string | number)[][]): Record<string, Sheet.CellValue> =>
  Object.fromEntries(
    rows.flatMap((row, rowIndex) =>
      row.map((value, columnIndex) => [
        `${String.fromCharCode(column.charCodeAt(0) + columnIndex)}${rowIndex + 1}`,
        { value },
      ]),
    ),
  );

/** Green-coffee inventory and the wholesale price list, both with live formulas, and a sales report charting bags sold and revenue. */
export type SheetsResult = { greenInventory: Sheet.Sheet; priceList: Sheet.Sheet; salesReport: Sheet.Sheet };

export const Sheets: SampleSpace.Partial<SheetsResult> = SampleSpace.partial('sheets', {
  schemas: [Sheet.Sheet, Sheet.Chart],
  run: () =>
    Effect.gen(function* () {
      const sheets = makeSheets();
      for (const sheet of Object.values(sheets)) {
        yield* Database.add(sheet);
      }
      return sheets;
    }),
});

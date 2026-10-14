//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database } from '@dxos/echo';
import * as Sheet from '@dxos/plugin-sheet/Sheet';

//
// Sheets
//

const makeSheets = (): { greenInventory: Sheet.Sheet; priceList: Sheet.Sheet } => {
  const greenInventory = Sheet.make({
    name: 'Green coffee inventory',
    rows: 12,
    columns: 6,
    cells: {
      A1: { value: 'Origin' },
      B1: { value: 'Lot' },
      C1: { value: 'Process' },
      D1: { value: 'KG' },
      E1: { value: 'Cost/kg' },
      F1: { value: 'Total' },
      A2: { value: 'Colombia — Esperanza' },
      B2: { value: 'Lot A' },
      C2: { value: 'Washed' },
      D2: { value: 180 },
      E2: { value: 11.5 },
      F2: { value: '=D2*E2' },
      A3: { value: 'Ethiopia — Sidamo' },
      B3: { value: 'Lot 42' },
      C3: { value: 'Natural' },
      D3: { value: 240 },
      E3: { value: 13.2 },
      F3: { value: '=D3*E3' },
      A4: { value: 'Guatemala — Antigua' },
      B4: { value: 'Lot 7' },
      C4: { value: 'Washed' },
      D4: { value: 90 },
      E4: { value: 10.8 },
      F4: { value: '=D4*E4' },
      A5: { value: 'Peru — Cajamarca' },
      B5: { value: 'Lot 3' },
      C5: { value: 'Washed' },
      D5: { value: 60 },
      E5: { value: 9.6 },
      F5: { value: '=D5*E5' },
      A6: { value: 'TOTAL' },
      D6: { value: '=SUM(D2:D5)' },
      F6: { value: '=SUM(F2:F5)' },
    },
  });

  const priceList = Sheet.make({
    name: 'Wholesale price list',
    rows: 10,
    columns: 4,
    cells: {
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
      C9: { value: '=AVERAGE(C2:C7)' },
      A10: { value: 'AVG retail' },
      D10: { value: '=AVERAGE(D2:D7)' },
    },
  });

  return { greenInventory, priceList };
};

/** Green-coffee inventory and the wholesale price list, both with live formulas. */
export type SheetsResult = { greenInventory: Sheet.Sheet; priceList: Sheet.Sheet };

export const Sheets: SampleSpace.Phase<SheetsResult> = SampleSpace.phase('sheets', {
  schemas: [Sheet.Sheet],
  run: () =>
    Effect.gen(function* () {
      const sheets = makeSheets();
      for (const sheet of Object.values(sheets)) {
        yield* Database.add(sheet);
      }
      return sheets;
    }),
});

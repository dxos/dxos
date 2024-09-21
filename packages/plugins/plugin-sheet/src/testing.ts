//
// Copyright 2024 DXOS.org
//

import { type ComputeGraph, createComputeGraph } from './components';
import { SheetModel } from './model';
import { createSheet, type CellValue } from './types';

export const testSheetName = 'test';

export const createCells = (): Record<string, CellValue> => ({
  B1: { value: 'Qty' },
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

export const createTestSheet = async ({
  name,
  graph = createComputeGraph(),
}: { name?: string; graph?: ComputeGraph } = {}) => {
  const sheet = createSheet(name);
  const model = new SheetModel(graph, sheet);
  await model.initialize();
  model.setValues(createCells());
  model.sheet.columnMeta[model.sheet.columns[0]] = { size: 100 };
  await model.destroy();
  return sheet;
};

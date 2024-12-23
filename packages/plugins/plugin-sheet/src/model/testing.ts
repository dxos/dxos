//
// Copyright 2024 DXOS.org
//

import { addressToA1Notation } from '@dxos/compute';

import { type CellValue, type SheetType, createSheet } from '../types';

// TODO(burdon): Create testing endpoint.
// TODO(burdon): Move to react-ui-sheet.
export const createTestGrid = ({ cols = 4, rows = 10 }: { cols: number; rows: number }): SheetType => {
  const year = new Date().getFullYear();

  const cells: Record<string, CellValue> = {};
  for (let col = 1; col <= cols; col++) {
    for (let row = 1; row <= 10; row++) {
      const cell = addressToA1Notation({ col, row });
      if (row === 1) {
        cells[cell] = { value: `${year} Q${col}` };
      } else if (row === rows) {
        const from = addressToA1Notation({ col, row: 2 });
        const to = addressToA1Notation({ col, row: rows - 1 });
        cells[cell] = { value: `=SUM(${from}:${to})` };
      } else if (row > 2 && row < rows - 1) {
        cells[cell] = { value: Math.floor(Math.random() * 10_000) };
      }
    }
  }

  const sheet = createSheet({
    name: 'Test',
    cells,
  });

  return sheet;
};

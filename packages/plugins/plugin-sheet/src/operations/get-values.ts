//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { addressFromA1Notation, addressToA1Notation, isFormula } from '@dxos/compute-hyperformula';
import { Database } from '@dxos/echo';

import { SheetOperation, addressFromIndex, addressToIndex, mapFormulaIndicesToRefs } from '../types';

const handler: Operation.WithHandler<typeof SheetOperation.GetValues> = SheetOperation.GetValues.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ sheet: sheetRef, range }) {
      const sheet = yield* Database.load(sheetRef);

      let fromRow = 0;
      let fromCol = 0;
      let toRow = -1;
      let toCol = -1;

      if (range) {
        const [fromPart, toPart = fromPart] = range.split(':');
        const from = addressFromA1Notation(fromPart);
        const to = addressFromA1Notation(toPart);
        fromRow = from.row;
        fromCol = from.col;
        toRow = to.row;
        toCol = to.col;
      } else {
        for (const key of Object.keys(sheet.cells)) {
          const cellValue = sheet.cells[key]?.value;
          if (cellValue !== undefined && cellValue !== null) {
            const { row, col } = addressFromIndex(sheet, key);
            if (row > toRow) {
              toRow = row;
            }
            if (col > toCol) {
              toCol = col;
            }
          }
        }
      }

      if (toRow < 0) {
        return { values: [], range: 'A1:A1' };
      }

      const values: (unknown | null)[][] = [];
      for (let row = fromRow; row <= toRow; row++) {
        const rowValues: (unknown | null)[] = [];
        for (let col = fromCol; col <= toCol; col++) {
          const idx = addressToIndex(sheet, { row, col });
          const rawValue = sheet.cells[idx]?.value ?? null;
          const value =
            rawValue !== null && isFormula(String(rawValue)) ? mapFormulaIndicesToRefs(sheet, rawValue) : rawValue;
          rowValues.push(value);
        }
        values.push(rowValues);
      }

      const actualRange = `${addressToA1Notation({ row: fromRow, col: fromCol })}:${addressToA1Notation({ row: toRow, col: toCol })}`;
      return { values, range: actualRange };
    }),
  ),
);

export default handler;

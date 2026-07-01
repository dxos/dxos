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

      let fromRow: number;
      let fromCol: number;
      let toRow: number;
      let toCol: number;

      if (range) {
        const [fromPart, toPart = fromPart] = range.split(':');
        const from = addressFromA1Notation(fromPart);
        const to = addressFromA1Notation(toPart);
        fromRow = from.row;
        fromCol = from.col;
        toRow = to.row;
        toCol = to.col;
      } else {
        let minRow = Infinity;
        let minCol = Infinity;
        let maxRow = -1;
        let maxCol = -1;
        for (const key of Object.keys(sheet.cells)) {
          const cellValue = sheet.cells[key]?.value;
          if (cellValue !== undefined && cellValue !== null) {
            const { row, col } = addressFromIndex(sheet, key);
            if (row < minRow) {
              minRow = row;
            }
            if (row > maxRow) {
              maxRow = row;
            }
            if (col < minCol) {
              minCol = col;
            }
            if (col > maxCol) {
              maxCol = col;
            }
          }
        }
        fromRow = minRow === Infinity ? 0 : minRow;
        fromCol = minCol === Infinity ? 0 : minCol;
        toRow = maxRow;
        toCol = maxCol;
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

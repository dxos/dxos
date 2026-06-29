//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { addressFromA1Notation, isFormula } from '@dxos/compute-hyperformula';
import { Database, Obj } from '@dxos/echo';

import { SheetOperation, addressToIndex, mapFormulaRefsToIndices } from '../types';

const handler: Operation.WithHandler<typeof SheetOperation.SetValues> = SheetOperation.SetValues.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ sheet: sheetRef, cells }) {
      const sheet = yield* Database.load(sheetRef);
      Obj.update(sheet, (sheet) => {
        for (const [address, value] of Object.entries(cells)) {
          const cell = addressFromA1Notation(address);
          const idx = addressToIndex(sheet, cell);
          const stored = isFormula(String(value)) ? mapFormulaRefsToIndices(sheet, String(value)) : value;
          sheet.cells[idx] = { value: stored };
        }
      });
    }),
  ),
);

export default handler;

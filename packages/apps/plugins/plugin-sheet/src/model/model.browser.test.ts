//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import { describe, test } from 'vitest';

import { SheetModel } from './model';
import { addressFromA1Notation, rangeFromA1Notation } from './types';
import { createSheet, ValueTypeEnum } from '../types';

// TODO(burdon): Test undo (e.g., clear cells).

/**
 * VITEST_ENV=chrome p vitest --watch
 * NOTE: Browser test required for hyperformula due to raw translation files.
 */
describe('model', () => {
  const createModel = () => {
    const sheet = createSheet();
    return new SheetModel(sheet, { rows: 5, columns: 5 }).initialize();
  };

  test('create', () => {
    const model = createModel();
    expect(model.bounds).to.deep.eq({ rows: 5, columns: 5 });
    model.setValue(addressFromA1Notation('A1'), 100);
    const value = model.getValue(addressFromA1Notation('A1'));
    expect(value).to.eq(100);
  });

  test('map formula', () => {
    const model = createModel();
    const x1 = model.mapFormulaRefsToIndices('=SUM(A1:A3)');
    const x2 = model.mapFormulaIndicesToRefs(x1);
    expect(x2).to.eq('=SUM(A1:A3)');
  });

  test('dates', () => {
    const model = createModel();
    const cell = addressFromA1Notation('A1');
    model.setValue(cell, '=NOW()');
    const type = model.getValueType(cell);
    expect(type).to.eq(ValueTypeEnum.DateTime);
    const value = model.getValue(cell);
    const date = model.toLocalDate(value as number);
    const now = new Date();
    expect(date.getUTCFullYear()).to.eq(now.getUTCFullYear());
    expect(date.getUTCMonth()).to.eq(now.getUTCMonth());
    expect(date.getUTCDate()).to.eq(now.getUTCDate());
  });

  test('formula', () => {
    const model = createModel();

    // Nested formula.
    {
      model.setValue(addressFromA1Notation('A1'), 100);
      model.setValue(addressFromA1Notation('A2'), 200);
      model.setValue(addressFromA1Notation('A3'), '=SUM(A1:A2)');
      model.setValue(addressFromA1Notation('A4'), '=SUM(A1:A3)');
      const value = model.getValue(addressFromA1Notation('A4'));
      expect(value).to.eq(600);
      // console.log(JSON.stringify(model.sheet.cells, undefined, 2));

      const cells = model.getCellValues(rangeFromA1Notation('A1:A4'));
      expect(cells).to.deep.eq([
        [100],
        [200],
        [model.mapFormulaRefsToIndices('=SUM(A1:A2)')],
        [model.mapFormulaRefsToIndices('=SUM(A1:A3)')],
      ]);
      // console.log(JSON.stringify(model.sheet.cells, undefined, 2));
      // console.log(cells);
    }

    // Insert row.
    {
      model.insertRows(2, 1);
      model.setValue(addressFromA1Notation('A3'), 400);
      const value = model.getValue(addressFromA1Notation('A5'));
      expect(value).to.eq(1000);

      const cells = model.getCellValues(rangeFromA1Notation('A1:A5'));
      expect(cells).to.deep.eq([
        [100],
        [200],
        [400],
        [model.mapFormulaRefsToIndices('=SUM(A1:A2)')],
        [model.mapFormulaRefsToIndices('=SUM(A1:A4)')],
      ]);
      // console.log(JSON.stringify(model.sheet.cells, undefined, 2));
      // console.log(cells);
    }
  });
});

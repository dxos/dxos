//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import { describe, test } from 'vitest';

import { create } from '@dxos/echo-schema';

import { Model } from './model';
import { cellFromA1Notation, rangeFromA1Notation } from './types';
import { SheetType } from '../types';

/**
 * VITEST_ENV=chrome p vitest --watch
 * NOTE: Browser test required for hyperformula due to raw translation files.
 */
describe('model', () => {
  const createModel = () => {
    const sheet = create(SheetType, { cells: {}, rows: {}, columns: {}, formatting: {} });
    return new Model(sheet, { rows: 5, columns: 5 }).initialize();
  };

  test('create', () => {
    const model = createModel();
    expect(model.bounds).to.deep.eq({ rows: 5, columns: 5 });
    model.setValue(cellFromA1Notation('A1'), 100);
    const value = model.getValue(cellFromA1Notation('A1'));
    expect(value).to.eq(100);
  });

  test('map formula', () => {
    const model = createModel();
    const x1 = model._mapFormulaRefsToIndices('=SUM(A1:A3)');
    const x2 = model._mapFormulaIndicesToRefs(x1);
    expect(x2).to.eq('=SUM(A1:A3)');
  });

  test('formula', () => {
    const model = createModel();

    // Nested formula.
    {
      model.setValue(cellFromA1Notation('A1'), 100);
      model.setValue(cellFromA1Notation('A2'), 200);
      model.setValue(cellFromA1Notation('A3'), '=SUM(A1:A2)');
      model.setValue(cellFromA1Notation('A4'), '=SUM(A1:A3)');
      const value = model.getValue(cellFromA1Notation('A4'));
      expect(value).to.eq(600);
      console.log(JSON.stringify(model.cells, undefined, 2));

      const cells = model.getCellValues(rangeFromA1Notation('A1:A4'));
      expect(cells).to.deep.eq([
        [100],
        [200],
        [model._mapFormulaRefsToIndices('=SUM(A1:A2)')],
        [model._mapFormulaRefsToIndices('=SUM(A1:A3)')],
      ]);
      console.log(JSON.stringify(model.cells, undefined, 2));
      console.log(cells);
    }

    // Insert row.
    {
      model.insertRows(2, 1);
      model.setValue(cellFromA1Notation('A3'), 400);
      const value = model.getValue(cellFromA1Notation('A5'));
      expect(value).to.eq(1000);

      const cells = model.getCellValues(rangeFromA1Notation('A1:A5'));
      expect(cells).to.deep.eq([
        [100],
        [200],
        [400],
        [model._mapFormulaRefsToIndices('=SUM(A1:A2)')],
        [model._mapFormulaRefsToIndices('=SUM(A1:A4)')],
      ]);
      console.log(JSON.stringify(model.cells, undefined, 2));
      console.log(cells);
    }
  });
});

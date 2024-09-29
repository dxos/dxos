//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Client } from '@dxos/client';

import { FunctionManager } from './functions';
import { SheetModel } from './sheet-model';
import { addressFromA1Notation, createSheet, rangeFromA1Notation } from '../defs';
import { ComputeGraphRegistry } from '../graph';
import { ValueTypeEnum } from '../types';

// TODO(burdon): Test undo (e.g., clear cells).

/**
 * NOTE: Browser test required for hyperformula due to raw translation files.
 */
describe('sheet model', () => {
  const createModel = async () => {
    const client = new Client();
    await client.initialize();
    await client.halo.createIdentity();
    const space = await client.spaces.create();
    const registry = new ComputeGraphRegistry();
    const graph = registry.createGraph(space);
    const sheet = createSheet({ rows: 5, columns: 5 });
    const model = new SheetModel(graph, sheet, new FunctionManager(graph, space));
    await model.initialize();
    return { graph, model };
  };

  test.only('create', async () => {
    const { model } = await createModel();
    console.log(model);
    expect(model.bounds).to.deep.eq({ rows: 5, columns: 5 });
    model.setValue(addressFromA1Notation('A1'), 100);
    const value = model.getValue(addressFromA1Notation('A1'));
    expect(value).to.eq(100);
  });

  test('map formula', async () => {
    const { model } = await createModel();
    const x1 = model.mapFormulaRefsToIndices('=SUM(A1:A3)');
    const x2 = model.mapFormulaIndicesToRefs(x1);
    expect(x2).to.eq('=SUM(A1:A3)');
  });

  test('dates', async () => {
    const { model } = await createModel();
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

  test('formula', async () => {
    const { model } = await createModel();

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

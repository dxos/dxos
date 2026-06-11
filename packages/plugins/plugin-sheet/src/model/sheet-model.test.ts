//
// Copyright 2024 DXOS.org
//

import { afterEach, beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { Operation } from '@dxos/compute';
import { type CellScalarValue, addressFromA1Notation, isFormula } from '@dxos/compute-hyperformula';
import { TestBuilder, testFunctionPlugins } from '@dxos/compute-hyperformula/testing';
import { log } from '@dxos/log';

import { Sheet, mapFormulaIndicesToRefs, mapFormulaRefsToIndices } from '#types';

import { SheetModel } from './sheet-model';
import { createTestGrid } from './testing';

describe('SheetModel', () => {
  let testBuilder: TestBuilder;
  beforeEach(async () => {
    testBuilder = new TestBuilder({ types: [Operation.PersistentOperation], plugins: testFunctionPlugins });
    await testBuilder.open();
  });
  afterEach(async () => {
    await testBuilder.close();
  });

  test('async function', async () => {
    const space = await testBuilder.client.spaces.create();
    const graph = testBuilder.registry.createGraph(space);
    await graph.open();

    // TODO(burdon): Create via factory.
    const sheet = Sheet.make({ rows: 5, columns: 5 });
    const model = new SheetModel(graph, sheet);
    await model.open();
    testBuilder.ctx.onDispose(() => model.close());

    // Trigger waits for function invocation.
    const trigger = new Trigger<CellScalarValue>();
    model.setValue(addressFromA1Notation('A1'), '=TEST(100)');
    // TODO(wittjosiah): Currently this fires twice, once for the binding loading & once for the function invocation.
    const unsubscribe = model.update.on((update) => {
      const { type } = update;
      if (type === 'valuesUpdated') {
        const value = model.getValue(addressFromA1Notation('A1'));
        value && trigger.wake(value);
      }
    });
    onTestFinished(() => unsubscribe());

    // Initial value will be null.
    const v1 = model.getValue(addressFromA1Notation('A1'));
    expect(v1).to.be.null;
    expect(graph.context.info.invocations.TEST).not.to.exist;

    // Wait until async update triggered.
    const v2 = await trigger.wait();
    expect(v2).to.eq(100);
    expect(graph.context.info.invocations.TEST).to.eq(1);
  });

  test('drop row shifts values and updates sum', async () => {
    const space = await testBuilder.client.spaces.create();
    const graph = testBuilder.registry.createGraph(space);
    await graph.open();

    const sheet = Sheet.make({ rows: 10, columns: 5 });
    const model = new SheetModel(graph, sheet);
    await model.open();
    onTestFinished(() => model.close());

    // Column A: rows 0..2 = 123, 789, 567; row 3 = SUM(A0:A2).
    model.setValue({ col: 0, row: 0 }, 123);
    model.setValue({ col: 0, row: 1 }, 789);
    model.setValue({ col: 0, row: 2 }, 567);
    model.setValue({ col: 0, row: 3 }, '=SUM(A1:A3)');

    expect(model.getValue({ col: 0, row: 3 })).to.eq(123 + 789 + 567);

    // Delete the middle row (789).
    const rowId = sheet.rows[1];
    model.dropRow(rowId);

    // Values shift up: row 1 = 567, row 2 = SUM(123 + 567).
    expect(model.getValue({ col: 0, row: 0 })).to.eq(123);
    expect(model.getValue({ col: 0, row: 1 })).to.eq(567);
    expect(model.getValue({ col: 0, row: 2 })).to.eq(123 + 567);
  });

  test('formula', async () => {
    const space = await testBuilder.client.spaces.create();
    const graph = testBuilder.registry.createGraph(space);
    await graph.open();

    const cols = 4;
    const rows = 10;
    const sheet = createTestGrid({ rows, cols });
    const model = new SheetModel(graph, sheet);
    await model.open();

    for (let col = 1; col <= cols; col++) {
      const cell = { col, row: rows };
      const text = model.getCellText(cell);
      const raw = model.getCellValue(cell);
      const value = model.getValue(cell);
      log('values', { text, raw, value });

      expect(isFormula(text)).to.be.true;
      expect(isFormula(raw)).to.be.true;
      expect(typeof value).to.eq('number');
      expect(mapFormulaRefsToIndices(sheet, text as string)).to.eq(raw);
      expect(mapFormulaIndicesToRefs(sheet, raw as string)).to.eq(text);
    }
  });
});

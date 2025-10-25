//
// Copyright 2024 DXOS.org
//

import { afterEach, beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { type CellScalarValue, addressFromA1Notation, isFormula } from '@dxos/compute';
import { TestBuilder, testFunctionPlugins } from '@dxos/compute/testing';
import { Function } from '@dxos/functions';
import { log } from '@dxos/log';

import { createSheet, mapFormulaIndicesToRefs, mapFormulaRefsToIndices } from '../types';

import { SheetModel } from './sheet-model';
import { createTestGrid } from './testing';

describe('SheetModel', () => {
  let testBuilder: TestBuilder;
  beforeEach(async () => {
    testBuilder = new TestBuilder({ types: [Function.Function], plugins: testFunctionPlugins });
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
    const sheet = createSheet({ rows: 5, columns: 5 });
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

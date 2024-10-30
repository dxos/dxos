//
// Copyright 2024 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { FunctionType } from '@dxos/plugin-script/types';

import { SheetModel } from './sheet-model';
import { TestBuilder, testFunctionPlugins } from '../compute-graph/testing';
import { addressFromA1Notation, createSheet } from '../defs';
import { type CellScalarValue } from '../types';

describe('SheetModel', () => {
  let testBuilder: TestBuilder;
  beforeEach(async () => {
    testBuilder = new TestBuilder({ types: [FunctionType], plugins: testFunctionPlugins });
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
    model.update.once((update) => {
      const { type } = update;
      if (type === 'valuesUpdated') {
        const value = model.getValue(addressFromA1Notation('A1'));
        trigger.wake(value);
      }
    });

    // Initial value will be null.
    const v1 = model.getValue(addressFromA1Notation('A1'));
    expect(v1).to.be.null;
    expect(graph.context.info.invocations.TEST).not.to.exist;

    // Wait until async update triggered.
    const v2 = await trigger.wait();
    expect(v2).to.eq(100);
    expect(graph.context.info.invocations.TEST).to.eq(1);
  });
});

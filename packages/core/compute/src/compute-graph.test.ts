//
// Copyright 2024 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { fullyQualifiedId } from '@dxos/client/echo';
import { Function } from '@dxos/functions';
import { type CellValue } from '@dxos/vendor-hyperformula';
import { DetailedCellError } from '@dxos/vendor-hyperformula';

import { TestBuilder } from './testing';

describe('ComputeGraph', () => {
  let testBuilder: TestBuilder;
  beforeEach(async () => {
    testBuilder = new TestBuilder({ types: [Function.Function] });
    await testBuilder.open();
  });
  afterEach(async () => {
    await testBuilder.close();
  });

  test('map functions', async () => {
    const space = await testBuilder.client.spaces.create();
    const graph = testBuilder.registry.createGraph(space);
    await graph.open();

    // Create script.
    const trigger = new Trigger();
    graph.update.once(() => trigger.wake());
    const functionObject = space.db.add(Function.make({ name: 'test', version: '0.0.1', binding: 'TEST' }));
    await trigger.wait();
    const functions = graph.getFunctions({ echo: true });
    expect(functions).to.toHaveLength(1);

    const id = graph.mapFunctionBindingToId('TEST()');
    expect(id).to.eq(`${fullyQualifiedId(functionObject)}()`);
  });

  test('cross-node references', async () => {
    const space = await testBuilder.client.spaces.create();
    const graph = testBuilder.registry.createGraph(space);

    // Create nodes.
    const node1 = await graph.getOrCreateNode('node-1').open();
    const node2 = await graph.getOrCreateNode('node-2').open();
    expect(graph.hf.getSheetNames()).to.toHaveLength(2);

    {
      node1.graph.hf.setCellContents({ sheet: node1.sheetId, row: 0, col: 0 }, [[100, 200, 300, '=SUM(A1:C1)']]);
      node2.graph.hf.setCellContents({ sheet: node2.sheetId, row: 0, col: 0 }, "='node-1'!D1");
      const value1 = node1.graph.hf.getCellValue({ sheet: node1.sheetId, col: 3, row: 0 });
      const value2 = node2.graph.hf.getCellValue({ sheet: node2.sheetId, col: 0, row: 0 });
      expect(value1).to.eq(value2);
    }

    // Get updated event.
    const trigger = new Trigger<CellValue>();
    node2.update.on(({ change }) => {
      const value = node2.graph.hf.getCellValue({ sheet: node2.sheetId, col: 0, row: 0 });
      expect(value).to.eq(change?.newValue);
      trigger.wake(value);
    });

    {
      node1.graph.hf.setCellContents({ sheet: node1.sheetId, row: 0, col: 0 }, 400);
      const value1 = node1.graph.hf.getCellValue({ sheet: node1.sheetId, col: 3, row: 0 });
      const value2 = await trigger.wait();
      expect(value1).to.eq(value2);
    }
  });

  // TODO(burdon): Dynamically load node/model based on dependencies.
  //  - Create dependency then close model.
  test('dynamic loading', async () => {
    const space = await testBuilder.client.spaces.create();
    const graph = testBuilder.registry.createGraph(space);

    const node1 = await graph.getOrCreateNode('node-1').open();
    node1.graph.hf.setCellContents({ sheet: node1.sheetId, row: 0, col: 0 }, "='node-2'!A1");
    const value1 = node1.graph.hf.getCellValue({ sheet: node1.sheetId, col: 0, row: 0 });
    expect(value1).to.be.instanceof(DetailedCellError);
    expect((value1 as DetailedCellError).type).to.eq('REF');
  });
});

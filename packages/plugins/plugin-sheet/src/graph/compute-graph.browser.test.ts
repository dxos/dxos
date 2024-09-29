//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { Client } from '@dxos/client';

import { createComputeGraphRegistry } from './compute-graph';
import { addressFromA1Notation, createSheet } from '../defs';
import { SheetModel } from '../model';
import { type CellScalarValue } from '../types';

/**
 * NOTE: Browser test required for hyperformula due to raw translation files.
 */
describe('compute graph', () => {
  const createModel = async () => {
    const client = new Client();
    await client.initialize();
    await client.halo.createIdentity();
    const space = await client.spaces.create();
    const registry = createComputeGraphRegistry();
    const graph = await registry.createGraph(space);
    const sheet = createSheet({ rows: 5, columns: 5 });
    const model = new SheetModel(graph, sheet);
    await model.open();
    graph.update.on(() => model.update.emit());
    return { graph, model };
  };

  test('cross-node references', async () => {
    const { graph } = await createModel();
    const node1 = graph.getOrCreateNode('node-1');
    const node2 = graph.getOrCreateNode('node-2');
    node1.hf.setCellContents({ sheet: node1.sheetId, row: 1, col: 1 }, 100);
    node2.hf.setCellContents({ sheet: node2.sheetId, row: 1, col: 1 }, `=${node1.sheetId}!A1`);
    const value1 = node1.hf.getCellValue({ sheet: node1.sheetId, col: 1, row: 1 });
    const value2 = node1.hf.getCellValue({ sheet: node2.sheetId, col: 1, row: 1 });
    expect(value1).to.eq(value2);
  });

  test('async function', async () => {
    const { graph, model } = await createModel();

    // Triggers function.
    model.setValue(addressFromA1Notation('A1'), '=TEST()');
    const trigger = new Trigger<CellScalarValue>();
    model.update.on(() => {
      const value = model.getValue(addressFromA1Notation('A1'));
      trigger.wake(value);
    });

    // Get initial value (i.e., null).
    const v1 = model.getValue(addressFromA1Notation('A1'));
    expect(v1).to.be.null;
    expect(graph.context.info.invocations.TEST).to.eq(undefined);

    // Wait until async update triggered.
    const v2 = await trigger.wait();
    expect(v2).not.to.be.null;
    expect(graph.context.info.invocations.TEST).to.eq(1);
  });
});

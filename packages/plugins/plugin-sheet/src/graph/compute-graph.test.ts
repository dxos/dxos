//
// Copyright 2024 DXOS.org
//

import { type CellValue } from 'hyperformula';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { Client } from '@dxos/client';
import { create, fullyQualifiedId } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { type S } from '@dxos/echo-schema';
import { FunctionType } from '@dxos/plugin-script/types';

import { ComputeGraphRegistry } from './compute-graph';
import { testPlugins } from './testing';
import { addressFromA1Notation, createSheet } from '../defs';
import { SheetModel } from '../model';
import { type CellScalarValue } from '../types';

/**
 * NOTE: Browser test required for hyperformula due to raw translation files.
 */
describe('compute graph', () => {
  let ctx: Context;
  beforeEach(() => {
    ctx = new Context();
  });
  afterEach(async () => {
    await ctx.dispose();
  });

  // TODO(burdon): Replace with builder.
  const createModel = async (types?: S.Schema<any>[]) => {
    const client = new Client();
    if (types) {
      // TODO(burdon): Add to config.
      client.addTypes(types);
    }
    await client.initialize();
    await client.halo.createIdentity();
    const space = await client.spaces.create();
    ctx.onDispose(() => client.destroy());

    const registry = new ComputeGraphRegistry({ plugins: testPlugins });
    await registry.open();
    ctx.onDispose(() => registry.close());

    const graph = await registry.createGraph(space);

    const sheet = createSheet({ rows: 5, columns: 5 });
    const model = new SheetModel(graph, sheet);
    await model.open();

    return { space, graph, model };
  };

  test('map functions', async () => {
    const { space, graph } = await createModel([FunctionType]);

    // Create script.
    const trigger = new Trigger();
    graph.update.once(() => trigger.wake());
    const fn = space.db.add(create(FunctionType, { version: 1, binding: 'TEST' }));
    await trigger.wait();
    expect(graph.getFunctions({ echo: true })).to.toHaveLength(1);

    const id = graph.mapFunctionBindingToId('TEST()');
    expect(id).to.eq(`${fullyQualifiedId(fn)}()`);
  });

  test('cross-node references', async () => {
    const { graph } = await createModel();

    // Create nodes.
    const node1 = await graph.getOrCreateNode('node-1');
    const node2 = await graph.getOrCreateNode('node-2');

    {
      expect(graph.hf.getSheetNames()).to.toHaveLength(3);
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

  test('async function', async () => {
    const { graph, model } = await createModel();

    // Triggers function.
    model.setValue(addressFromA1Notation('A1'), '=TEST()');
    const trigger = new Trigger<CellScalarValue>();
    model.update.once(({ type }) => {
      if (type === 'valuesUpdated') {
        const value = model.getValue(addressFromA1Notation('A1'));
        trigger.wake(value);
      }
    });

    // Get initial value (null).
    const v1 = model.getValue(addressFromA1Notation('A1'));
    expect(v1).to.be.null;
    expect(graph.context.info.invocations.TEST).to.eq(undefined);

    // Wait until async update triggered.
    const v2 = await trigger.wait();
    expect(v2).not.to.be.null;
    expect(graph.context.info.invocations.TEST).to.eq(1);
  });
});

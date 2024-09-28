//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { Client } from '@dxos/client';

import { ComputeGraphRegistry } from './compute-graph';
import { CustomPlugin, CustomPluginTranslations } from './custom-function';
import { addressFromA1Notation, createSheet } from '../defs';
import { FunctionManager, SheetModel } from '../model';
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
    const registry = new ComputeGraphRegistry();
    await registry.initialize([{ plugin: CustomPlugin, translations: CustomPluginTranslations }]);
    const graph = await registry.createGraph(space);
    const sheet = createSheet({ rows: 5, columns: 5 });
    const model = new SheetModel(graph, sheet, new FunctionManager(graph, space));
    graph.update.on(() => model.update.emit());
    return { graph, model };
  };

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

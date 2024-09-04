//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import { describe, test } from 'vitest';

import { Trigger } from '@dxos/async';

import { createComputeGraph } from './graph';
import { addressFromA1Notation, SheetModel } from '../../model';
import { type CellScalarValue, createSheet } from '../../types';

/**
 * VITEST_ENV=chrome p vitest --watch
 * NOTE: Browser test required for hyperformula due to raw translation files.
 */
describe('compute graph', () => {
  const createModel = async () => {
    const graph = createComputeGraph();
    const sheet = createSheet();
    const model = new SheetModel(graph, sheet, undefined, { rows: 5, columns: 5 });
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

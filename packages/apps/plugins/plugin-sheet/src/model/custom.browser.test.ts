//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import { HyperFormula } from 'hyperformula';
import { describe, test } from 'vitest';

import { Trigger } from '@dxos/async';

import { FunctionContext } from './async-function';
import { CustomPlugin, CustomPluginTranslations } from './custom';
import { SheetModel } from './model';
import { addressFromA1Notation } from './types';
import { createComputeGraph } from '../components';
import { type CellScalarValue, createSheet } from '../types';

/**
 * VITEST_ENV=chrome p vitest --watch
 * NOTE: Browser test required for hyperformula due to raw translation files.
 */
describe('custom', () => {
  const createModel = async () => {
    HyperFormula.registerFunctionPlugin(CustomPlugin, CustomPluginTranslations);
    const graph = createComputeGraph();

    // TODO(burdon): Move context into graph.
    graph.hf.updateConfig({
      context: new FunctionContext(graph.hf, (context) => {
        model.update.emit();
        console.log(context.info);
      }),
    });

    const sheet = createSheet();
    const model = new SheetModel(graph, sheet, { rows: 5, columns: 5 });
    return model;
  };

  test('async', async () => {
    const model = await createModel();

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

    // Wait until async update triggered.
    const v2 = await trigger.wait();
    expect(v2).not.to.be.null;
    // TODO(burdon): Test # invocations.
  });
});

//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import { describe, test } from 'vitest';

import { Trigger } from '@dxos/async';

import { SheetModel } from './model';
import { addressFromA1Notation } from './types';
import { type CellScalar, createSheet } from '../types';

/**
 * VITEST_ENV=chrome p vitest --watch
 * NOTE: Browser test required for hyperformula due to raw translation files.
 */
describe('custom', () => {
  const createModel = () => {
    const sheet = createSheet();
    return new SheetModel(sheet, { rows: 5, columns: 5 }).initialize();
  };

  test('async', async () => {
    const model = createModel();
    model.setValue(addressFromA1Notation('A1'), '=TEST()');

    const trigger = new Trigger<CellScalar>();
    model.update.on(() => {
      const value = model.getValue(addressFromA1Notation('A1'));
      trigger.wake(value);
    });

    const v1 = model.getValue(addressFromA1Notation('A1'));
    expect(v1).to.be.null;

    const v2 = await trigger.wait();
    expect(v2).not.to.be.null;
  });
});

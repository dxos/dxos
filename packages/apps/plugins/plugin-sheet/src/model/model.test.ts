//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import { HyperFormula } from 'hyperformula';
import { enUS } from 'hyperformula/typings/i18n/languages';
import { describe, test } from 'vitest';

import { create } from '@dxos/echo-schema';

import { Model } from './model';
import { SheetType } from '../types';

describe('model', () => {
  test('create', () => {
    HyperFormula.registerLanguage('enUS', enUS);

    // TODO(burdon): Defaults.
    const sheet = create(SheetType, { cells: {}, rows: {}, columns: {}, formatting: {} });
    const model = new Model(sheet);
    console.log(model.info);
    expect(true).to.be.true;
  });
});

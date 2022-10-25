//
// Copyright 2020 DXOS.org
//

import expect from 'expect';

import { PublicKey } from '@dxos/keys';

import { ModelFactory } from './model-factory';
import { TestModel } from './testing';

describe('model factory', function () {
  it('model constructor', async function () {
    const itemId = PublicKey.random().toHex();

    // Create model.
    const modelFactory = new ModelFactory().registerModel(TestModel);
    const stateManager = modelFactory.createModel<TestModel>(TestModel.meta.type, itemId, {}, PublicKey.random());
    expect(stateManager.model).toBeTruthy();
  });
});

//
// Copyright 2020 DXOS.org
//

import expect from 'expect';

import { PublicKey } from '@dxos/keys';
import { describe, test } from '@dxos/test';

import { ModelFactory } from './model-factory';
import { TestModel } from './testing';

describe('model factory', () => {
  test('model constructor', async () => {
    const itemId = PublicKey.random().toHex();

    // Create model.
    const modelFactory = new ModelFactory().registerModel(TestModel);
    const stateManager = modelFactory.createModel<TestModel>(TestModel.meta.type, itemId, {}, PublicKey.random());
    expect(stateManager.model).toBeTruthy();
  });
});

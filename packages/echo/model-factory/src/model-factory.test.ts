//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { createId } from '@dxos/crypto';
import { PublicKey } from '@dxos/protocols';

import { ModelFactory } from './model-factory';
import { TestModel } from './testing';

describe('model factory', () => {
  test('model constructor', async () => {
    const itemId = createId();

    // Create model.
    const modelFactory = new ModelFactory().registerModel(TestModel);
    const stateManager = modelFactory.createModel<TestModel>(TestModel.meta.type, itemId, {}, PublicKey.random());
    expect(stateManager.model).toBeTruthy();
  });
});

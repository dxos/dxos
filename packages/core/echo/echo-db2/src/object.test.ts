//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { createMemoryDatabase } from '@dxos/echo-db/testing';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { describe, test } from '@dxos/test';

import { EchoObject } from './object';

// TODO(burdon): Implement.
describe('EchoObject', () => {
  test('instance of', async () => {
    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const database = await createMemoryDatabase(modelFactory);

    const obj = new EchoObject();
    expect(obj instanceof EchoObject).toBeTruthy();
  });
});

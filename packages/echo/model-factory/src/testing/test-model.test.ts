//
// Copyright 2020 DXOS.org
//

import { latch } from '@dxos/async';
import { createId, createKeyPair, zeroKey } from '@dxos/crypto';
import { MockFeedWriter, TestItemMutation } from '@dxos/echo-protocol';
import { it as test } from 'mocha';
import expect from 'expect';

import { TestModel } from './test-model';

describe('test model', () => {
  test.skip('basic mutations', async () => {
    // const itemId = createId();
    // const model = new TestModel(TestModel.meta, itemId, () => new Map());

    // // Model.
    // expect(model.itemId).toBe(itemId);
    // expect(model.readOnly).toBeTruthy();

    // // TestModel.
    // expect(model.keys).toHaveLength(0);

    // // Set mutation.
    // const { publicKey: feedKey } = createKeyPair();

    // await model.processMessage({ feedKey, seq: 1, memberKey: feedKey }, { key: 'title', value: 'DXOS' });
    // expect(model.getProperty('title')).toBe('DXOS');
    // expect(model.keys).toHaveLength(1);
  });

  test.skip('mutations feedback loop', async () => {
    // const itemId = createId();
    // const feedWriter = new MockFeedWriter<TestItemMutation>();

    // const model = new TestModel(TestModel.meta, itemId, feedWriter);

    // feedWriter.written.on(([message, meta]) => model.processMessage({
    //   feedKey: meta.feedKey.asUint8Array(),
    //   memberKey: zeroKey(),
    //   seq: meta.seq
    // }, message));

    // const [counter, updateCounter] = latch();
    // const unsubscribe = model.subscribe(model => {
    //   expect((model as TestModel).getProperty('title')).toBe('DXOS');
    //   updateCounter();
    // });

    // await model.setProperty('title', 'DXOS');

    // await counter;
    // unsubscribe();
  });
});

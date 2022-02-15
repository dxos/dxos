//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { promiseTimeout } from '@dxos/async';
import { createId, PublicKey } from '@dxos/crypto';
import { MockFeedWriter, MutationMetaWithTimeframe, Timeframe } from '@dxos/echo-protocol';

import { Model } from './model';
import { StateManager } from './state-manager';
import { TestListModel } from './testing';

// feedA < feedB
const feedA = PublicKey.fromHex('0x0000000000000000000000000000000000000000000000000000000000000001');
const feedB = PublicKey.fromHex('0x0000000000000000000000000000000000000000000000000000000000000002');
const randomFeedKey = PublicKey.random();

describe('StateManager', () => {
  test('construct readonly and apply mutations', () => {
    const stateManager = new StateManager(TestListModel.meta.type, TestListModel, createId(), {}, null);

    expect(stateManager.model).toBeInstanceOf(TestListModel);
    expect(stateManager.model).toBeInstanceOf(Model);
    expect(stateManager.modelMeta).toEqual(TestListModel.meta);
    expect(stateManager.model.messages).toEqual([]);

    stateManager.processMessage(createMeta(0), TestListModel.meta.mutation.encode({ data: 'message1' }));
    expect(stateManager.model.messages).toEqual([{ data: 'message1' }]);

    stateManager.processMessage(createMeta(1), TestListModel.meta.mutation.encode({ data: 'message2' }));
    expect(stateManager.model.messages).toEqual([{ data: 'message1' }, { data: 'message2' }]);
  });

  describe('snapshot and restore', () => {
    test('with model snapshots - TestListModel', () => {
      const stateManager = new StateManager(TestListModel.meta.type, TestListModel, createId(), {}, null);

      stateManager.processMessage(createMeta(0), TestListModel.meta.mutation.encode({ data: 'message1' }));
      const snapshot = stateManager.createSnapshot();

      stateManager.processMessage(createMeta(1), TestListModel.meta.mutation.encode({ data: 'message2' }));
      expect(stateManager.model.messages).toEqual([{ data: 'message1' }, { data: 'message2' }]);

      stateManager.resetToSnapshot(snapshot);
      expect(stateManager.model.messages).toEqual([{ data: 'message1' }]);
    });

    test('with framework snapshots - TestListModel', () => {
      const stateManager = new StateManager(TestListModel.meta.type, TestListModel, createId(), {}, null);

      stateManager.processMessage(createMeta(0), TestListModel.meta.mutation.encode({ data: 'message1' }));
      const snapshot = stateManager.createSnapshot();

      stateManager.processMessage(createMeta(1), TestListModel.meta.mutation.encode({ data: 'message2' }));
      expect(stateManager.model.messages).toEqual([{ data: 'message1' }, { data: 'message2' }]);

      stateManager.resetToSnapshot(snapshot);
      expect(stateManager.model.messages).toEqual([{ data: 'message1' }]);
    });
  });

  test('write loop', async () => {
    const feedWriter = new MockFeedWriter<Uint8Array>();
    const stateManager = new StateManager(TestListModel.meta.type, TestListModel, createId(), {}, feedWriter);
    feedWriter.written.on(([message, meta]) => stateManager.processMessage({
      feedKey: meta.feedKey.asUint8Array(),
      memberKey: PublicKey.random().asUint8Array(),
      seq: meta.seq,
      timeframe: new Timeframe()
    }, message));

    await stateManager.model.sendMessage('message1');

    expect(stateManager.model.messages).toEqual([{ data: 'message1' }]);
  });

  test('late initalization', () => {
    const stateManager = new StateManager<TestListModel>(TestListModel.meta.type, undefined, createId(), {}, null);
    expect(stateManager.initialized).toBe(false);
    expect(stateManager.modelType).toEqual(TestListModel.meta.type);

    stateManager.processMessage(createMeta(0), TestListModel.meta.mutation.encode({ data: 'message1' }));
    stateManager.initialize(TestListModel);
    expect(stateManager.initialized).toBe(true);
    expect(stateManager.model).toBeInstanceOf(TestListModel);
    expect(stateManager.model.messages).toEqual([{ data: 'message1' }]);

    stateManager.processMessage(createMeta(1), TestListModel.meta.mutation.encode({ data: 'message2' }));
    expect(stateManager.model.messages).toEqual([{ data: 'message1' }, { data: 'message2' }]);
  });

  test('upate event gets triggered', async () => {
    const stateManager = new StateManager(TestListModel.meta.type, TestListModel, createId(), {}, null);

    const gotUpdate = stateManager.model.update.waitForCount(1);
    stateManager.processMessage(createMeta(0), TestListModel.meta.mutation.encode({ data: 'message1' }));

    await promiseTimeout(gotUpdate, 100, new Error('timeout'));
  });

  describe('optimistic mutations', () => {
    test('single mutation gets applied synchronously', async () => {
      const feedWriter = new MockFeedWriter<Uint8Array>();
      const stateManager = new StateManager(TestListModel.meta.type, TestListModel, createId(), {}, feedWriter);
      feedWriter.written.on(([message, meta]) => stateManager.processMessage({
        feedKey: meta.feedKey.asUint8Array(),
        memberKey: PublicKey.random().asUint8Array(),
        seq: meta.seq,
        timeframe: new Timeframe()
      }, message));

      const promise = stateManager.model.sendMessage('message1');
      expect(stateManager.model.messages).toEqual([{ data: 'message1' }]);

      await promise;
      expect(stateManager.model.messages).toEqual([{ data: 'message1' }]);
    });

    test('2 optimistic mutations queued together', async () => {
      const feedWriter = new MockFeedWriter<Uint8Array>();
      const stateManager = new StateManager(TestListModel.meta.type, TestListModel, createId(), {}, feedWriter);
      feedWriter.written.on(([message, meta]) => stateManager.processMessage({
        feedKey: meta.feedKey.asUint8Array(),
        memberKey: PublicKey.random().asUint8Array(),
        seq: meta.seq,
        timeframe: new Timeframe()
      }, message));

      const promise1 = stateManager.model.sendMessage('message1');
      const promise2 = stateManager.model.sendMessage('message2');
      expect(stateManager.model.messages).toEqual([{ data: 'message1' }, { data: 'message2' }]);

      await promise1;
      expect(stateManager.model.messages).toEqual([{ data: 'message1' }, { data: 'message2' }]);

      await promise2;
      expect(stateManager.model.messages).toEqual([{ data: 'message1' }, { data: 'message2' }]);
    });

    test('with reordering', async () => {
      const feedWriter = new MockFeedWriter<Uint8Array>(feedB);
      const stateManager = new StateManager(TestListModel.meta.type, TestListModel, createId(), {}, feedWriter);
      feedWriter.written.on(([message, meta]) => stateManager.processMessage({
        feedKey: meta.feedKey.asUint8Array(),
        memberKey: PublicKey.random().asUint8Array(),
        seq: meta.seq,
        timeframe: new Timeframe()
      }, message));

      const promise = stateManager.model.sendMessage('message1');
      expect(stateManager.model.messages).toEqual([{ data: 'message1' }]);

      // Send a message that will be ordered first.
      stateManager.processMessage(createMeta(0, feedA), TestListModel.meta.mutation.encode({ data: 'message2' }));
      expect(stateManager.model.messages).toEqual([{ data: 'message2' }, { data: 'message1' }]);

      await promise;
      expect(stateManager.model.messages).toEqual([{ data: 'message2' }, { data: 'message1' }]);
    });
  });
});

const createMeta = (seq: number, feedKey: PublicKey = randomFeedKey): MutationMetaWithTimeframe => ({
  feedKey: feedKey.asUint8Array(),
  memberKey: feedKey.asUint8Array(),
  seq,
  timeframe: new Timeframe()
});

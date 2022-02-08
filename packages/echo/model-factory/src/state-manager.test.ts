import { ModelConstructor } from "./types"
import { Model } from "./model"
import { StateManager } from "."
import { TestListModel, TestModel } from './testing'
import { createId, PublicKey } from "@dxos/crypto"
import { it as test } from 'mocha';
import expect from 'expect';
import { MockFeedWriter } from "@dxos/echo-protocol"

describe('StateManager', () => {
  test('construct readonly and apply mutations', () => {
    const stateManager = new StateManager(TestModel.meta.type, TestModel, createId(), {}, null);
    
    expect(stateManager.model).toBeInstanceOf(TestModel);
    expect(stateManager.model).toBeInstanceOf(Model);
    expect(stateManager.modelMeta).toEqual(TestModel.meta);
    expect(stateManager.model.properties).toEqual({});

    stateManager.processMessage(createMeta(0), TestModel.meta.mutation.encode({ key: 'testKey', value: 'testValue' }));
    expect(stateManager.model.properties).toEqual({ testKey: 'testValue' });

    stateManager.processMessage(createMeta(1), TestModel.meta.mutation.encode({ key: 'key2', value: 'testValue2' }));
    expect(stateManager.model.properties).toEqual({ testKey: 'testValue', key2: 'testValue2' });
  });

  describe('snapshot and restore', () => {
    test('with model snapshots - TestModel', () => {
      const stateManager = new StateManager(TestModel.meta.type, TestModel, createId(), {}, null);

      stateManager.processMessage(createMeta(0), TestModel.meta.mutation.encode({ key: 'testKey', value: 'testValue' }));
      const snapshot = stateManager.createSnapshot();
  
      stateManager.processMessage(createMeta(1), TestModel.meta.mutation.encode({ key: 'testKey', value: 'testValue2' }));
      expect(stateManager.model.properties).toEqual({ testKey: 'testValue2' });
  
      stateManager.resetToSnapshot(snapshot);
      expect(stateManager.model.properties).toEqual({ testKey: 'testValue' });
    });
    
    test('with framework snapshots - TestListModel', () => {
      const stateManager = new StateManager(TestListModel.meta.type, TestListModel, createId(), {}, null);

      stateManager.processMessage(createMeta(0), TestListModel.meta.mutation.encode({ data: 'message1' }));
      const snapshot = stateManager.createSnapshot();
  
      stateManager.processMessage(createMeta(1), TestListModel.meta.mutation.encode({ data: 'message2' }));
      expect(stateManager.model.messages).toEqual([{ data: 'message1' }, { data: 'message2' }]);
  
      stateManager.resetToSnapshot(snapshot);
      expect(stateManager.model.messages).toEqual([{ data: 'message1' }]);
    })
  });

  test('write loop', async () => {
    const feedWriter = new MockFeedWriter<Uint8Array>();
    const stateManager = new StateManager(TestModel.meta.type, TestModel, createId(), {}, feedWriter);
    feedWriter.written.on(([message, meta]) => stateManager.processMessage({
      feedKey: meta.feedKey.asUint8Array(),
      memberKey: PublicKey.random().asUint8Array(),
      seq: meta.seq,
    }, message));

    await stateManager.model.setProperty('testKey', 'testValue');

    expect(stateManager.model.properties).toEqual({ testKey: 'testValue' });
  });

  test('late initalization', () => {
    const stateManager = new StateManager<TestModel>(TestModel.meta.type, undefined, createId(), {}, null);
    expect(stateManager.initialized).toBe(false);
    expect(stateManager.modelType).toEqual(TestModel.meta.type);

    stateManager.processMessage(createMeta(0), TestModel.meta.mutation.encode({ key: 'testKey', value: 'testValue' }));
    stateManager.initialize(TestModel);
    expect(stateManager.initialized).toBe(true);
    expect(stateManager.model).toBeInstanceOf(TestModel);
    expect(stateManager.model.properties).toEqual({ testKey: 'testValue' });

    stateManager.processMessage(createMeta(1), TestModel.meta.mutation.encode({ key: 'key2', value: 'testValue2' }));
    expect(stateManager.model.properties).toEqual({ testKey: 'testValue', key2: 'testValue2' });
  })
})

const createMeta = (seq: number) => ({
  feedKey: PublicKey.random().asUint8Array(),
  memberKey: PublicKey.random().asUint8Array(),
  seq
})

import { ModelConstructor } from "./types"
import { Model } from "./model"
import { StateManager } from "."
import { TestModel } from './testing'
import { createId, PublicKey } from "@dxos/crypto"
import { it as test } from 'mocha';
import expect from 'expect';

describe('StateManager', () => {
  test('construct readonly and apply mutations', () => {
    const stateManager = new StateManager(TestModel.meta.type, TestModel, createId(), null);
    
    expect(stateManager.model).toBeInstanceOf(TestModel);
    expect(stateManager.model).toBeInstanceOf(Model);
    expect(stateManager.modelMeta).toEqual(TestModel.meta);
    expect(stateManager.model.properties).toEqual({});

    stateManager.processMessage(createMeta(0), TestModel.meta.mutation.encode({ key: 'testKey', value: 'testValue' }));
    expect(stateManager.model.properties).toEqual({ testKey: 'testValue' });

    stateManager.processMessage(createMeta(1), TestModel.meta.mutation.encode({ key: 'key2', value: 'testValue2' }));
    expect(stateManager.model.properties).toEqual({ testKey: 'testValue', key2: 'testValue2' });
  })

  test('snapshot and restore', () => {
    const stateManager = new StateManager(TestModel.meta.type, TestModel, createId(), null);

    stateManager.processMessage(createMeta(0), TestModel.meta.mutation.encode({ key: 'testKey', value: 'testValue' }));
    const snapshot = stateManager.createSnapshot();

    stateManager.processMessage(createMeta(1), TestModel.meta.mutation.encode({ key: 'testKey', value: 'testValue2' }));
    expect(stateManager.model.properties).toEqual({ testKey: 'testValue2' });

    stateManager.resetToSnapshot(snapshot);
    expect(stateManager.model.properties).toEqual({ testKey: 'testValue' });
  })
})

const createMeta = (seq: number) => ({
  feedKey: PublicKey.random().asUint8Array(),
  memberKey: PublicKey.random().asUint8Array(),
  seq
})

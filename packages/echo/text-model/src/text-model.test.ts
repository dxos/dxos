//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { PublicKey } from '@dxos/crypto';
import { MockFeedWriter } from '@dxos/echo-protocol';
import { ModelFactory, TestRig } from '@dxos/model-factory';

import { TextModel } from './text-model';

describe('TextModel', () => {
  test('insert', async () => {
    const rig = new TestRig(new ModelFactory().registerModel(TextModel), TextModel);
    const peer1 = rig.createPeer();
    const peer2 = rig.createPeer();

    peer1.model.insert(0, 'Hello World!');

    await peer2.model.update.waitForCount(1);
    expect(peer2.model.textContent).toBe('Hello World!');

    // TODO(burdon): Test delete.
    const words = peer1.model.textContent.split(' ');
    peer2.model.insert(words[0].length, ' DXOS');
    await peer1.model.update.waitForCount(1);
    expect(peer1.model.textContent).toBe('Hello DXOS World!');
  });

  test('insert a new text node', async () => {
    const rig = new TestRig(new ModelFactory().registerModel(TextModel), TextModel);
    const peer1 = rig.createPeer();

    peer1.model.insertTextNode(0, 'Hello World!');
    expect(peer1.model.textContent).toBe('Hello World!');
    expect(peer1.model.content._length).toBe(1);

    peer1.model.insertTextNode(0, 'Hello World!');
    expect(peer1.model.textContent).toBe('Hello World!\nHello World!');
    expect(peer1.model.content._length).toBe(2);
  });

  test('snapshot', async () => {
    const modelFactory = new ModelFactory().registerModel(TextModel);
    const model1 = modelFactory.createModel<TextModel>(TextModel.meta.type, 'test', {}, PublicKey.random(), new MockFeedWriter());

    model1.model.insert(0, 'Hello World!');

    const snapshot = model1.createSnapshot();

    const model2 = modelFactory.createModel<TextModel>(TextModel.meta.type, 'test', snapshot, PublicKey.random(), new MockFeedWriter());

    expect(model2.model.textContent).toBe('Hello World!');
  });

  test('conflict', async () => {
    const rig = new TestRig(new ModelFactory().registerModel(TextModel), TextModel);
    const peer1 = rig.createPeer();
    const peer2 = rig.createPeer();

    peer1.model.insert(0, 'Hello');
    await rig.waitForReplication();

    rig.configureReplication(false);
    peer1.model.insert(5, '!');
    peer2.model.insert(5, '?');
    rig.configureReplication(true);
    await rig.waitForReplication();

    expect(peer1.model.textContent).toBe(peer2.model.textContent);
  });
});

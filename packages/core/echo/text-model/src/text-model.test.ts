//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import faker from 'faker';

import { MockFeedWriter } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { ModelFactory, TestRig } from '@dxos/model-factory';

import { TextModel } from './text-model.js';

describe('TextModel', function () {
  it('insert', async function () {
    const rig = new TestRig(new ModelFactory().registerModel(TextModel), TextModel);
    const peer1 = rig.createPeer();
    const peer2 = rig.createPeer();

    peer1.model.insert('Hello World!', 0);

    await peer2.model.update.waitForCount(1);
    expect(peer2.model.textContent).toBe('Hello World!');

    // TODO(burdon): Test delete.
    const words = peer1.model.textContent.split(' ');
    peer2.model.insert(' DXOS', words[0].length);
    await peer1.model.update.waitForCount(1);
    expect(peer1.model.textContent).toBe('Hello DXOS World!');
  });

  it('insert a new text node', async function () {
    const rig = new TestRig(new ModelFactory().registerModel(TextModel), TextModel);
    const peer1 = rig.createPeer();

    const text1 = faker.lorem.lines(1);
    const text2 = faker.lorem.lines(1);

    peer1.model.insertTextNode(text1, 0);
    expect(peer1.model.content._length).toBe(1);
    const strigified1 = JSON.stringify(peer1.model.content);
    expect(strigified1).toBe(`"<paragraph>${text1}</paragraph>"`);

    const lastCharPos = peer1.model.content.length;
    peer1.model.insertTextNode(text2, lastCharPos);
    expect(peer1.model.content._length).toBe(2);
    const strigified2 = JSON.stringify(peer1.model.content);
    expect(strigified2).toBe(`"<paragraph>${text1}</paragraph><paragraph>${text2}</paragraph>"`);
  });

  it('snapshot', async function () {
    const modelFactory = new ModelFactory().registerModel(TextModel);
    const model1 = modelFactory.createModel<TextModel>(
      TextModel.meta.type, 'test', {}, PublicKey.random(), new MockFeedWriter());

    const text = faker.lorem.lines(1);
    model1.model.insert(text, 0);

    const snapshot = model1.createSnapshot();
    const model2 = modelFactory.createModel<TextModel>(
      TextModel.meta.type, 'test', snapshot, PublicKey.random(), new MockFeedWriter());
    expect(model2.model.textContent).toBe(text);
  });

  it('conflict', async function () {
    const rig = new TestRig(new ModelFactory().registerModel(TextModel), TextModel);
    const peer1 = rig.createPeer();
    const peer2 = rig.createPeer();

    peer1.model.insert('Hello', 0);
    await rig.waitForReplication();

    rig.configureReplication(false);
    peer1.model.insert('!', 5);
    peer2.model.insert('?', 5);
    rig.configureReplication(true);
    await rig.waitForReplication();

    expect(peer1.model.textContent).toBe(peer2.model.textContent);
  });
});

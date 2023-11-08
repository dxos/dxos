//
// Copyright 2020 DXOS.org
//

import { faker } from '@faker-js/faker';
import expect from 'expect';
import { Doc, applyUpdate } from 'yjs';

import { MockFeedWriter } from '@dxos/feed-store/testing';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { TestBuilder } from '@dxos/model-factory/testing';
import { describe, test } from '@dxos/test';

import { TextModel } from './text-model';

describe('TextModel', () => {
  test('mutations merging', async () => {
    const updates: Uint8Array[] = [];
    const field = 'content';

    // Atomic updates.
    {
      const doc = new Doc();
      doc.on('update', (update) => {
        updates.push(update);
      });

      const content = doc.getText(field);
      doc.transact(() => {
        content.insert(0, 'Hello ');
      });

      doc.transact(() => {
        content.insert(6, 'World!');
      });

      expect(updates.length).toBe(2);
      expect(content.toString()).toBe('Hello World!');
    }

    // Merged updates.
    {
      const doc = new Doc();
      const mergedMutation = TextModel.meta.mergeMutations!(updates.map((update) => ({ update })));
      applyUpdate(doc, mergedMutation.update);
      const content = doc.getText(field);
      expect(content.toString()).toBe('Hello World!');
    }
  });

  // TODO(mykola): transfer to @dxos/echo-pipeline database unit test
  test.skip('insert a new text node', async () => {
    const rig = new TestBuilder(new ModelFactory().registerModel(TextModel), TextModel);
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

  test.skip('snapshot', async () => {
    const modelFactory = new ModelFactory().registerModel(TextModel);
    const model1 = modelFactory.createModel(
      TextModel.meta.type,
      'test',
      { objectId: 'test' },
      PublicKey.random(),
      new MockFeedWriter(),
    );

    const _text = faker.lorem.lines(1);
    // model1.model.insert(text, 0);

    const snapshot = model1.createSnapshot();
    const _model2 = modelFactory.createModel(
      TextModel.meta.type,
      'test',
      snapshot,
      PublicKey.random(),
      new MockFeedWriter(),
    );
    // expect(model2.model.textContent).toBe(text);
  });

  test.skip('conflict', async () => {
    const rig = new TestBuilder(new ModelFactory().registerModel(TextModel), TextModel);
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

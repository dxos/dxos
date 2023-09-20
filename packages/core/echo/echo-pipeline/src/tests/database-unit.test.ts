//
// Copyright 2023 DXOS.org
//

import expect from 'expect';

import { sleep } from '@dxos/async';
import { DocumentModel, MutationBuilder, OrderedArray } from '@dxos/document-model';
import {
  COMMIT_BATCH_INACTIVITY_DEFAULT,
  Item,
  createModelMutation,
  encodeModelMutation,
  genesisMutation,
} from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { describe, test } from '@dxos/test';
import { Doc, TextModel } from '@dxos/text-model';
import { Timeframe } from '@dxos/timeframe';

import { DatabaseTestBuilder } from '../testing/database-test-rig';

describe('database (unit)', () => {
  test('create object and reload', async () => {
    const builder = new DatabaseTestBuilder();
    const peer = await builder.createPeer();

    const id = PublicKey.random().toHex();
    peer.proxy.mutate(genesisMutation(id, DocumentModel.meta.type));
    peer.proxy.commitBatch();
    peer.proxy.mutate(
      createModelMutation(id, encodeModelMutation(DocumentModel.meta, new MutationBuilder().set('test', 42).build())),
    );
    peer.proxy.commitBatch();
    await peer.confirm();

    expect(peer.confirmed).toEqual(1);
    expect(peer.timeframe).toEqual(new Timeframe([[peer.key, 1]]));

    const state = peer.items.getItem(id)!.state;

    {
      await peer.reload();
      const stateAfterReload = peer.items.getItem(id)!.state;

      expect(stateAfterReload).toEqual(state);
    }
  });

  test('create object and reload from snapshot', async () => {
    const builder = new DatabaseTestBuilder();
    const peer = await builder.createPeer();

    const id = PublicKey.random().toHex();
    peer.proxy.mutate(genesisMutation(id, DocumentModel.meta.type));
    peer.proxy.commitBatch();

    peer.proxy.mutate(
      createModelMutation(id, encodeModelMutation(DocumentModel.meta, new MutationBuilder().set('test', 42).build())),
    );

    peer.proxy.commitBatch();
    await peer.confirm();
    expect(peer.confirmed).toEqual(1);
    expect(peer.timeframe).toEqual(new Timeframe([[peer.key, 1]]));
    peer.makeSnapshot();

    const state = peer.items.getItem(id)!.state;

    {
      await peer.reload();
      const stateAfterReload = peer.items.getItem(id)!.state;

      expect(stateAfterReload).toEqual(state);
    }
  });

  test('two peers replicate', async () => {
    const builder = new DatabaseTestBuilder();
    const peer1 = await builder.createPeer();
    const peer2 = await builder.createPeer();

    const id = PublicKey.random().toHex();
    peer1.proxy.mutate(genesisMutation(id, DocumentModel.meta.type));
    peer1.proxy.mutate(
      createModelMutation(id, encodeModelMutation(DocumentModel.meta, new MutationBuilder().set('test', 42).build())),
    );
    peer1.proxy.commitBatch();
    await peer1.confirm();

    peer2.replicate(peer1.timeframe);

    // TODO(dmaretskyi): Helper functions to compare state.
    expect(peer1.items.getItem(id)!.state).toEqual(peer1.items.getItem(id)!.state);
  });

  test('batches', async () => {
    const builder = new DatabaseTestBuilder();
    const peer1 = await builder.createPeer();
    const peer2 = await builder.createPeer();

    const id = PublicKey.random().toHex();
    peer1.proxy.beginBatch();
    peer1.proxy.mutate(genesisMutation(id, DocumentModel.meta.type));
    peer1.proxy.mutate(
      createModelMutation(id, encodeModelMutation(DocumentModel.meta, new MutationBuilder().set('test', 42).build())),
    );

    await peer1.confirm();
    peer2.replicate(peer1.timeframe);

    expect(peer2.items.getItem(id)).toBeUndefined();

    peer1.proxy.commitBatch();
    await peer1.confirm();
    peer2.replicate(peer1.timeframe);

    // TODO(dmaretskyi): Helper functions to compare state.
    expect(peer1.items.getItem(id)!.state).toEqual(peer1.items.getItem(id)!.state);
  });

  test('flush', async () => {
    const builder = new DatabaseTestBuilder();
    const peer = await builder.createPeer();

    const id = PublicKey.random().toHex();
    peer.proxy.mutate(genesisMutation(id, DocumentModel.meta.type));
    await peer.confirm();
    await peer.proxy.flush();
  }).timeout(100);

  describe('DocumentModel', () => {
    test('array assign and push', async () => {
      const builder = new DatabaseTestBuilder();
      const peer1 = await builder.createPeer();
      const id = PublicKey.random().toHex();
      const { objectsUpdated } = peer1.proxy.mutate(genesisMutation(id, DocumentModel.meta.type));
      const item = objectsUpdated[0] as Item<DocumentModel>;
      const model = new DocumentModel(DocumentModel.meta, item.id, () => item.state);

      peer1.proxy.mutate(
        createModelMutation(
          id,
          encodeModelMutation(
            DocumentModel.meta,
            model
              .builder()
              .set('tags', OrderedArray.fromValues(['red']))
              .build(),
          ),
        ),
      );
      await peer1.confirm();
      expect(model.get('tags').toArray()).toHaveLength(1);

      peer1.proxy.mutate(
        createModelMutation(
          id,
          encodeModelMutation(DocumentModel.meta, model.builder().set('tags', OrderedArray.fromValues([])).build()),
        ),
      );
      await peer1.confirm();
      expect(model.get('tags').toArray()).toHaveLength(0);

      peer1.proxy.mutate(
        createModelMutation(
          id,
          encodeModelMutation(DocumentModel.meta, model.builder().arrayPush('tags', ['green']).build()),
        ),
      );
      await peer1.confirm();
      expect(model.get('tags').toArray()).toHaveLength(1);
    });
  });

  describe('TextModel', () => {
    test('insert', async () => {
      const rig = new DatabaseTestBuilder();
      const peer1 = await rig.createPeer();
      const peer2 = await rig.createPeer();

      const mutations = [];
      const doc = new Doc();
      doc.on('update', (update) => {
        mutations.push(update);
      });

      const id = PublicKey.random().toHex();
      peer1.proxy.mutate(genesisMutation(id, TextModel.meta.type));
      const model = peer1.getModel(id);
      invariant(model instanceof TextModel);
      model.insert('Hello World!', 0);

      peer1.proxy.commitBatch();
      await peer1.confirm();
      await peer1.proxy.flush();

      peer2.replicate(peer1.timeframe);
      const replicatedItem = peer2.items.entities.get(id);
      expect(replicatedItem).toBeDefined();
      const replicatedModel = peer2.getModel(id)! as TextModel;
      expect(replicatedModel.textContent).toBe('Hello World!');

      replicatedModel.insert(' DXOS', 5);

      peer2.proxy.commitBatch();
      await peer2.confirm();
      await peer2.proxy.flush();

      peer1.replicate(peer2.timeframe);
      expect(model.textContent).toBe('Hello DXOS World!');
    });
  });

  describe('Mutations merging', () => {
    test('merge EchoObject-s for one item', async () => {
      const rig = new DatabaseTestBuilder();
      const peer1 = await rig.createPeer();
      const peer2 = await rig.createPeer();

      const mutations = [];
      const doc = new Doc();
      doc.on('update', (update) => {
        mutations.push(update);
      });

      const id = PublicKey.random().toHex();
      const begin = peer1.proxy.beginBatch();
      expect(begin).toBeTruthy();
      peer1.proxy.mutate(genesisMutation(id, TextModel.meta.type));
      const model = peer1.getModel(id);
      invariant(model instanceof TextModel);
      model.insert('Hello', 0);
      model.insert(' World!', 5);

      peer1.proxy.commitBatch();
      await peer1.confirm();

      // Mutations got merged.
      expect(peer1.feedMessages.length).toEqual(1);

      peer2.replicate(peer1.timeframe);

      const replicatedItem = peer2.items.entities.get(id);
      expect(replicatedItem).toBeDefined();
      const replicatedModel = peer2.getModel(id)! as TextModel;
      expect(replicatedModel.textContent).toBe('Hello World!');

      replicatedModel.insert(' DXOS', 5);
      peer2.proxy.commitBatch();
      await peer2.confirm();

      peer1.replicate(peer2.timeframe);
      expect(model.textContent).toBe('Hello DXOS World!');
    });

    test('consecutive mutations are batched', async () => {
      const rig = new DatabaseTestBuilder();
      const peer = await rig.createPeer();

      const id = PublicKey.random().toHex();
      peer.proxy.mutate(genesisMutation(id, TextModel.meta.type));
      const model = peer.getModel(id);
      invariant(model instanceof TextModel);
      model.insert('Hello', 0);
      model.insert(' World!', 5);
      // Wait for batch commit.
      await sleep(COMMIT_BATCH_INACTIVITY_DEFAULT + 10);

      // Mutations got merged.
      expect(peer.feedMessages.length).toEqual(1);

      model.insert(' DXOS', 5);
      // New batch is still not committed.
      expect(peer.feedMessages.length).toEqual(1);
      await sleep(COMMIT_BATCH_INACTIVITY_DEFAULT + 10);
      // New batch is committed.
      expect(peer.feedMessages.length).toEqual(2);
    });
  });

  it('epoch correctly resets items', async () => {
    const builder = new DatabaseTestBuilder();
    const peer = await builder.createPeer();

    const id = PublicKey.random().toHex();
    peer.proxy.mutate(genesisMutation(id, DocumentModel.meta.type));
    peer.proxy.commitBatch();
    peer.proxy.mutate(
      createModelMutation(id, encodeModelMutation(DocumentModel.meta, new MutationBuilder().set('test', 42).build())),
    );
    peer.proxy.commitBatch();

    await peer.confirm();
    expect(peer.confirmed).toEqual(1);
    expect(peer.timeframe).toEqual(new Timeframe([[peer.key, 1]]));

    const state = peer.items.getItem(id)!.state;
    const snapshotWithItem = peer.makeSnapshot().database;

    {
      // Reset on empty epoch.
      const updated = peer.proxy.itemUpdate.waitForCount(1);

      expect(peer.proxy._itemManager.items.length).toEqual(1);

      peer.createEpoch({});

      await updated;
      expect(peer.proxy._itemManager.items.length).toEqual(0);
    }

    {
      // Reset to epoch with one item.
      const updated = peer.proxy.itemUpdate.waitForCount(1);
      peer.createEpoch(snapshotWithItem);
      await updated;
      expect(peer.proxy._itemManager.items.length).toEqual(1);
      expect(peer.items.getItem(id)!.state).toEqual(state);
    }
  });
});

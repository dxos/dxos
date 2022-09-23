//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import expect from 'expect';
import { it as test } from 'mocha';

import { waitForCondition } from '@dxos/async';
import { ItemID, MockFeedWriter, PartyKey } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel, ValueUtil } from '@dxos/object-model';
import { schema, PublicKey } from '@dxos/protocols';

import { ItemDemuxer, ItemManager } from '../packlets/database';
import { createTestInstance } from '../testing';

const log = debug('dxos:snapshot:test');
// debug.enable('dxos:echo-db:*');

describe('snapshot', () => {
  test.skip('loading large party', async () => {
    const echo = await createTestInstance({ initialize: true });

    let partyKey: PartyKey;
    let itemId: ItemID;
    {
      const party = await echo.createParty();
      partyKey = party.key;

      const item = await party.database.createItem({ model: ObjectModel });
      itemId = item.id;
      for (let i = 0; i < 1_000; i++) {
        await item.model.set('foo', i);
      }
      await item.model.set('foo', 'done');

      await echo.close();
    }

    const startTime = Date.now();
    {
      await echo.open();
      const party = echo.getParty(partyKey);
      await party!.open();

      await waitForCondition(() => {
        const item = party!.database.getItem(itemId);
        return item!.model.get('foo') === 'done';
      });

      await echo.close();
    }

    log(`Load took ${Date.now() - startTime}ms`);
    expect(echo.isOpen).toBe(false);
  });

  test('produce & serialize a snapshot', async () => {
    const echo = await createTestInstance({ initialize: true });
    const party = await echo.createParty();
    const item1 = await party.database.createItem({ model: ObjectModel, props: { title: 'Item1 - Creation' } });
    await item1.model.set('title', 'Item1 - Modified');
    const item2 = await party.database.createItem({ model: ObjectModel, props: { title: 'Item2 - Creation' } });
    await item2.model.set('title', 'Item2 - Modified');

    const link = await party.database.createLink({ source: item1, target: item2 });

    const snapshot = party.createSnapshot();
    expect(snapshot.database?.items).toHaveLength(3); // 1 party + 2 items
    expect(snapshot.database?.links).toHaveLength(1); // 1 link
    expect(snapshot.database?.items?.find(i => i.itemId === item1.id)?.model?.snapshot).toBeDefined();
    expect(snapshot.database?.items?.find(i => i.itemId === item2.id)?.model?.snapshot).toBeDefined();
    expect(snapshot.database?.links?.find(l => l.linkId === link.id)?.linkId).toBeDefined();

    // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
    const modelSnapshot1 = ObjectModel.meta.snapshotCodec?.decode(snapshot.database?.items?.find(i => i.itemId === item1.id)?.model?.snapshot!);
    expect(modelSnapshot1).toEqual({ root: ValueUtil.createMessage({ title: 'Item1 - Modified' }) });

    // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
    const modelSnapshot2 = ObjectModel.meta.snapshotCodec?.decode(snapshot.database?.items?.find(i => i.itemId === item2.id)?.model?.snapshot!);
    expect(modelSnapshot2).toEqual({ root: ValueUtil.createMessage({ title: 'Item2 - Modified' }) });

    expect(snapshot.halo?.messages && snapshot.halo?.messages?.length > 0).toBeTruthy();
    expect(snapshot.timeframe?.size()).toBe(1);

    const serialized = schema.getCodecForType('dxos.echo.snapshot.PartySnapshot').encode(snapshot);
    expect(serialized instanceof Uint8Array).toBeTruthy();

    await echo.close();
    expect(echo.isOpen).toBe(false);
  });

  test('restore from snapshot', async () => {
    const modelFactory = new ModelFactory().registerModel(ObjectModel);

    let data;
    {
      const itemManager = new ItemManager(modelFactory, PublicKey.random(), new MockFeedWriter());
      const itemDemuxer = new ItemDemuxer(itemManager, modelFactory, { snapshots: true });

      await itemManager.constructItem({
        itemId: 'item-1',
        itemType: 'test-item-type',
        modelType: ObjectModel.meta.type,
        snapshot: {}
      });

      await itemManager.constructItem({
        itemId: 'item-2',
        itemType: 'test-item-type',
        modelType: ObjectModel.meta.type,
        snapshot: {}
      });

      await itemManager.constructLink({
        itemId: 'link-1',
        itemType: 'test-link-type',
        modelType: ObjectModel.meta.type,
        source: 'item-1',
        target: 'item-2',
        snapshot: {}
      });

      // Create snapshot.
      console.log('encoding...');
      const snapshot = itemDemuxer.createSnapshot();
      data = schema.getCodecForType('dxos.echo.snapshot.DatabaseSnapshot').encode(snapshot);
    }

    {
      const itemManager = new ItemManager(modelFactory, PublicKey.random());
      const itemDemuxer = new ItemDemuxer(itemManager, modelFactory, { snapshots: true });

      // Decode snapshot.
      console.log('decoding...');
      const snapshot = schema.getCodecForType('dxos.echo.snapshot.DatabaseSnapshot').decode(data);
      await itemDemuxer.restoreFromSnapshot(snapshot);

      expect(itemManager.items).toHaveLength(2);
      expect(itemManager.links).toHaveLength(1);

      const [item1, item2] = itemManager.items;
      const [link] = itemManager.links;
      expect(link.source.id).toBe(item1.id);
      expect(link.target.id).toBe(item2.id);
    }
  });

  test('restore from empty snapshot', async () => {
    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const itemManager = new ItemManager(modelFactory, PublicKey.random());
    const itemDemuxer = new ItemDemuxer(itemManager, modelFactory);

    // TODO(burdon): Do actual test.
    await itemDemuxer.restoreFromSnapshot({});
    expect(true).toBeTruthy();
  });
});

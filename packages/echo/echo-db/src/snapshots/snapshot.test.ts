//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import expect from 'expect';
import { it as test } from 'mocha';

import { waitForCondition } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { schema, ItemID, PartyKey } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel, ValueUtil } from '@dxos/object-model';

import { ItemDemuxer, ItemManager } from '../database';
import { createTestInstance } from '../util';

const log = debug('dxos:snapshot:test');

// TODO(burdon): Remove "foo", etc from tests.
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
        await item.model.setProperty('foo', i);
      }
      await item.model.setProperty('foo', 'done');

      await echo.close();
    }

    const startTime = Date.now();
    {
      await echo.open();
      const party = echo.getParty(partyKey);
      await party!.open();

      await waitForCondition(() => {
        const item = party!.database.getItem(itemId);
        return item!.model.getProperty('foo') === 'done';
      });

      await echo.close();
    }

    log(`Load took ${Date.now() - startTime}ms`);
    expect(echo.isOpen).toBe(false);
  });

  test('produce & serialize a snapshot', async () => {
    const echo = await createTestInstance({ initialize: true });
    const party = await echo.createParty();
    const item = await party.database.createItem({ model: ObjectModel, props: { foo: 'foo' } });
    await item.model.setProperty('foo', 'bar');

    const snapshot = party.createSnapshot();
    expect(snapshot.database?.items).toHaveLength(2);
    expect(snapshot.database?.items?.find(i => i.itemId === item.id)?.model?.snapshot).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
    const modelSnapshot = ObjectModel.meta.snapshotCodec?.decode(snapshot.database?.items?.find(i => i.itemId === item.id)?.model?.snapshot!);
    expect(modelSnapshot).toEqual({ root: ValueUtil.createMessage({ foo: 'bar' }) });
    expect(snapshot.halo?.messages && snapshot.halo?.messages?.length > 0).toBeTruthy();
    expect(snapshot.timeframe?.size()).toBe(1);

    const serialized = schema.getCodecForType('dxos.echo.snapshot.PartySnapshot').encode(snapshot);
    expect(serialized instanceof Uint8Array).toBeTruthy();

    await echo.close();
    expect(echo.isOpen).toBe(false);
  });

  test('restore from empty snapshot', async () => {
    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const itemManager = new ItemManager(modelFactory, PublicKey.random());
    const itemDemuxer = new ItemDemuxer(itemManager, modelFactory);

    // TODO(burdon): Test.
    await itemDemuxer.restoreFromSnapshot({});
    expect(true).toBeTruthy();
  });
});

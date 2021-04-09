//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { waitForCondition } from '@dxos/async';
import { schema } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel, ValueUtil } from '@dxos/object-model';

import { ItemDemuxer, ItemManager, TimeframeClock } from '../items';
import { PartyInternal } from '../parties';
import { createTestInstance } from '../testing/test-utils';

const log = debug('dxos:snapshot:test');

jest.setTimeout(10000);

test('loading large party', async () => {
  const echo = await createTestInstance({ initialize: true });
  const party1 = await echo.createParty();
  const item1 = await party1.database.createItem({ model: ObjectModel });
  for (let i = 0; i < 1_000; i++) {
    item1.model.setProperty('foo', i);
  }
  await item1.model.setProperty('foo', 'done');

  await echo.close();

  const startTime = Date.now();

  await echo.open();
  const party2 = echo.getParty(party1.key);
  assert(party2);
  await party2.open();

  await waitForCondition(() => {
    const item = party2!.database.getItem(item1.id);
    return item?.model.getProperty('foo') === 'done';
  });
  log(`Load took ${Date.now() - startTime}ms`);
});

test('can produce & serialize a snapshot', async () => {
  const echo = await createTestInstance({ initialize: true });
  const party = await echo.createParty();
  const item = await party.database.createItem({ model: ObjectModel, props: { foo: 'foo' } });
  await item.model.setProperty('foo', 'bar');

  const snapshot = ((party as any)._internal as PartyInternal).createSnapshot();

  expect(snapshot.database?.items).toHaveLength(2);
  expect(snapshot.database?.items?.find(i => i.itemId === item.id)?.model?.custom).toBeDefined();
  const modelSnapshot = ObjectModel.meta.snapshotCodec?.decode(snapshot.database?.items?.find(i => i.itemId === item.id)?.model?.custom!);
  expect(modelSnapshot).toEqual({ root: ValueUtil.createMessage({ foo: 'bar' }) });
  expect(snapshot.halo?.messages && snapshot.halo?.messages?.length > 0).toBeTruthy();
  expect(snapshot.timeframe?.size()).toBe(1);

  const serialized = schema.getCodecForType('dxos.echo.snapshot.PartySnapshot').encode(snapshot);

  expect(serialized instanceof Uint8Array).toBeTruthy();
});

describe('Database', () => {
  test('restore from empty snapshot', async () => {
    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const itemManager = new ItemManager(modelFactory, new TimeframeClock());
    const itemDemuxer = new ItemDemuxer(itemManager, modelFactory);

    await itemDemuxer.restoreFromSnapshot({});
  });
});

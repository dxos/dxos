//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { PublicKey } from '@dxos/crypto';
import { EchoEnvelope, MockFeedWriter } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';

import { DataMirror } from './data-mirror';
import { DataServiceHost } from './data-service-host';
import { DataServiceRouter } from './data-service-router';
import { Item } from './item';
import { ItemDemuxer } from './item-demuxer';
import { ItemManager } from './item-manager';
import { promiseTimeout } from '@dxos/async';

describe('DataMirror', () => {
  test.only('basic', async () => {
    // Setup
    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const feed = new MockFeedWriter<EchoEnvelope>();
    const itemManager = new ItemManager(modelFactory, feed);
    const itemDemuxer = new ItemDemuxer(itemManager, modelFactory, { snapshots: true });

    const stream = itemDemuxer.open();
    feed.written.on(([msg, meta]) => stream.write({
      data: msg,
      meta: { ...meta, memberKey: PublicKey.random() }
    } as any));

    const dataServiceHost = new DataServiceHost(itemManager, itemDemuxer);
    const dataServiceRouter = new DataServiceRouter();
    const partyKey = PublicKey.random();
    dataServiceRouter.trackParty(partyKey, dataServiceHost);

    const mirrorItemManager = new ItemManager(modelFactory);
    const dataMirror = new DataMirror(mirrorItemManager, dataServiceRouter, partyKey);

    dataMirror.open();

    // Create item
    const promise = promiseTimeout(mirrorItemManager.debouncedItemUpdate.waitForCount(1), 1000, new Error('timeout'));

    const item = await itemManager.createItem(
      ObjectModel.meta.type
    ) as Item<ObjectModel>;

    await promise;

    const mirroredItem = await mirrorItemManager.getItem(item.id) as Item<ObjectModel> | undefined;

    expect(mirroredItem).not.toBeUndefined();
    expect(mirroredItem!.id).toEqual(item.id);
    expect(mirroredItem!.model).toBeInstanceOf(ObjectModel);

    // Mutate model
    await Promise.all([
      promiseTimeout(mirroredItem!.model.update.waitForCount(1), 1000, new Error('timeout')),
      item.model.setProperty('foo', 'bar')
    ]);

    expect(item.model.getProperty('foo')).toEqual('bar');
  });
});

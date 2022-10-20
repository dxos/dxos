//
// Copyright 2021 DXOS.org
//

import expect from 'expect';

import { promiseTimeout } from '@dxos/async';
import { MockFeedWriter } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { Timeframe } from '@dxos/protocols';
import { EchoEnvelope } from '@dxos/protocols/proto/dxos/echo/feed';

import { DataMirror } from './data-mirror';
import { DataService } from './data-service';
import { DataServiceHost } from './data-service-host';
import { Item } from './item';
import { ItemDemuxer } from './item-demuxer';
import { ItemManager } from './item-manager';

describe('DataMirror', function () {
  it('basic', async function () {
    // Setup
    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const feed = new MockFeedWriter<EchoEnvelope>();
    const itemManager = new ItemManager(modelFactory, PublicKey.random(), feed);
    const itemDemuxer = new ItemDemuxer(itemManager, modelFactory, { snapshots: true });

    const process = itemDemuxer.open();
    feed.written.on(([msg, meta]) => process({
      data: msg,
      meta: { ...meta, memberKey: PublicKey.random(), timeframe: new Timeframe() }
    } as any));

    const dataServiceHost = new DataServiceHost(itemManager, itemDemuxer);
    const dataServiceRouter = new DataService();
    const partyKey = PublicKey.random();
    dataServiceRouter.trackParty(partyKey, dataServiceHost);

    const mirrorItemManager = new ItemManager(modelFactory, PublicKey.random());
    const dataMirror = new DataMirror(mirrorItemManager, dataServiceRouter, partyKey);

    dataMirror.open();

    // Create item
    const promise = promiseTimeout(mirrorItemManager.debouncedUpdate.waitForCount(1), 1000, new Error('timeout'));

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
      item.model.set('foo', 'bar')
    ]);

    expect(item.model.get('foo')).toEqual('bar');
  });
});
